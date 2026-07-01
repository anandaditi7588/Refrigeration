"""
Order execution engine: strike selection, entry, SL/target monitoring, and
EOD square-off. The Pine Script side already resolves the Call/Put decision
(including the delayed-confirmation logic) — this module trusts the
"signal" field in the webhook payload and focuses on safe execution.
"""
import threading
import time
from datetime import datetime, time as dtime

import db
from config import Config
from smartapi_client import SmartAPIClient


class OrderManager:
    def __init__(self):
        self.client = SmartAPIClient()
        self._open_lock = threading.Lock()
        self._current_trade_id = None  # None => no open position
        self._monitor_thread = None
        self._stop_monitor = threading.Event()

    # ------------------------------------------------------------------
    def has_open_position(self):
        with self._open_lock:
            return self._current_trade_id is not None

    def handle_signal(self, signal_type, spot_price, raw_payload):
        """Entry point called by the webhook route."""
        if Config.KILL_SWITCH:
            db.log_signal(signal_type, spot_price, raw_payload, acted_on=False, skip_reason="KILL_SWITCH")
            return {"status": "skipped", "reason": "kill_switch_engaged"}

        if not self._within_trading_window():
            db.log_signal(signal_type, spot_price, raw_payload, acted_on=False, skip_reason="OUTSIDE_WINDOW")
            return {"status": "skipped", "reason": "outside_trading_window"}

        with self._open_lock:
            if self._current_trade_id is not None:
                if Config.ON_SIGNAL_WHILE_OPEN == "ignore":
                    db.log_signal(signal_type, spot_price, raw_payload, acted_on=False, skip_reason="POSITION_OPEN")
                    return {"status": "skipped", "reason": "position_already_open"}
                else:  # "flip": close existing, then open new
                    self._force_close(reason="FLIP")

        option_type = "CE" if signal_type == "CALL" else "PE"
        option = self.client.find_nearest_option(spot_price, option_type)
        quantity = Config.QUANTITY_LOTS * Config.LOT_SIZE
        required_margin_estimate = option["ltp"] * quantity  # rough; real margin calc is broker-side

        if not self.client.check_margin_available(required_margin_estimate):
            signal_id = db.log_signal(signal_type, spot_price, raw_payload, acted_on=False,
                                       skip_reason="INSUFFICIENT_MARGIN")
            return {"status": "skipped", "reason": "insufficient_margin", "signal_id": signal_id}

        signal_id = db.log_signal(signal_type, spot_price, raw_payload, acted_on=True)
        order_id = self.client.place_order(option["tradingsymbol"], option["symboltoken"], "BUY", quantity)
        entry_price = option["ltp"]
        stop_loss = entry_price - Config.SL_POINTS
        target = entry_price + Config.TARGET_POINTS

        trade_id = db.open_trade(
            signal_id=signal_id, signal_type=signal_type, tradingsymbol=option["tradingsymbol"],
            symboltoken=option["symboltoken"], strike=option["strike"], option_type=option_type,
            quantity=quantity, entry_price=entry_price, stop_loss=stop_loss, target=target,
            is_paper=Config.PAPER_TRADE, order_id=order_id,
        )
        with self._open_lock:
            self._current_trade_id = trade_id
        self._start_monitor(trade_id, option["tradingsymbol"], option["symboltoken"], quantity, stop_loss, target)
        return {"status": "order_placed", "trade_id": trade_id, "order_id": order_id}

    # ------------------------------------------------------------------
    def _start_monitor(self, trade_id, tradingsymbol, symboltoken, quantity, stop_loss, target):
        self._stop_monitor.clear()

        def loop():
            while not self._stop_monitor.is_set():
                if Config.KILL_SWITCH:
                    self._close_trade(trade_id, tradingsymbol, symboltoken, quantity, "KILL_SWITCH")
                    return
                if not self._within_trading_window():
                    if Config.EOD_SQUARE_OFF:
                        self._close_trade(trade_id, tradingsymbol, symboltoken, quantity, "EOD")
                    return
                ltp = self.client.get_ltp(tradingsymbol, symboltoken)
                if ltp <= stop_loss:
                    self._close_trade(trade_id, tradingsymbol, symboltoken, quantity, "SL")
                    return
                if ltp >= target:
                    self._close_trade(trade_id, tradingsymbol, symboltoken, quantity, "TARGET")
                    return
                time.sleep(2)

        self._monitor_thread = threading.Thread(target=loop, daemon=True)
        self._monitor_thread.start()

    def _close_trade(self, trade_id, tradingsymbol, symboltoken, quantity, reason):
        self.client.exit_position(tradingsymbol, symboltoken, quantity)
        exit_price = self.client.get_ltp(tradingsymbol, symboltoken)
        db.close_trade(trade_id, exit_price, reason)
        with self._open_lock:
            self._current_trade_id = None

    def _force_close(self, reason):
        for row in db.get_open_trades():
            self._close_trade(row["id"], row["tradingsymbol"], row["symboltoken"], row["quantity"], reason)

    # ------------------------------------------------------------------
    def _within_trading_window(self):
        now = datetime.now()
        open_h, open_m = (int(x) for x in Config.MARKET_OPEN.split(":"))
        close_h, close_m = (int(x) for x in Config.MARKET_CLOSE.split(":"))
        start, end = dtime(open_h, open_m), dtime(close_h, close_m)
        return start <= now.time() <= end

    def flatten_all(self):
        """Manual kill-switch action: close everything immediately."""
        self._force_close(reason="MANUAL_KILL")
