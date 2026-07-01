"""
Thin wrapper around Angel One's SmartAPI (smartapi-python SDK).

Real calls only happen when Config.PAPER_TRADE is False. In paper mode every
method returns realistic-shaped fake data so the rest of the system (state
machine, SL/target monitor, DB logging, dashboard) can be fully exercised
without risking real capital — this satisfies the spec's requirement to
"test extensively on paper-trade mode before scaling."

Install: pip install smartapi-python pyotp logzero
"""
import random
import time as _time

import pyotp

from config import Config

try:
    from SmartApi import SmartConnect
except ImportError:  # allows the module to import cleanly in paper-trade-only dev environments
    SmartConnect = None


class SmartAPIClient:
    def __init__(self):
        self.paper = Config.PAPER_TRADE
        self._session = None
        self._feed_token = None
        if not self.paper:
            if SmartConnect is None:
                raise RuntimeError("smartapi-python not installed. `pip install smartapi-python`")
            self._connect_real()

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------
    def _connect_real(self):
        self.api = SmartConnect(Config.ANGEL_API_KEY)
        totp = pyotp.TOTP(Config.ANGEL_TOTP_SECRET).now()
        data = self.api.generateSession(Config.ANGEL_CLIENT_CODE, Config.ANGEL_PASSWORD, totp)
        if not data.get("status"):
            raise RuntimeError(f"Angel One login failed: {data}")
        self._feed_token = self.api.getfeedToken()

    # ------------------------------------------------------------------
    # Market data
    # ------------------------------------------------------------------
    def get_spot_ltp(self):
        """Bank Nifty index LTP. In paper mode, caller should pass the price
        received from the TradingView webhook instead of calling this."""
        if self.paper:
            raise NotImplementedError("Use the spot price supplied in the webhook payload in paper mode.")
        # Symbol token for NIFTY BANK on NSE index segment — verify current
        # token via api.searchScrip or the published instrument master before
        # going live; tokens can change.
        quote = self.api.ltpData("NSE", "NIFTY BANK", "99926009")
        return float(quote["data"]["ltp"])

    def find_nearest_option(self, spot_price, option_type, expiry=None):
        """
        Returns dict: {tradingsymbol, symboltoken, strike, ltp}
        option_type: "CE" or "PE"

        Real implementation should use the Angel One instrument master CSV
        (https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json)
        to resolve the correct weekly/monthly Bank Nifty option contract and
        its symboltoken for the nearest strike to `spot_price`, then call
        api.ltpData(...) for the premium. That lookup is environment-specific
        (depends on which expiry you trade), so it's left as a clearly marked
        TODO rather than guessed at here.
        """
        if self.paper:
            strike = round(spot_price / 100) * 100
            fake_ltp = round(random.uniform(150, 400), 2)
            symbol = f"BANKNIFTY{strike}{option_type}-PAPER"
            return {"tradingsymbol": symbol, "symboltoken": "PAPER", "strike": strike, "ltp": fake_ltp}

        # TODO: real instrument-master lookup + api.ltpData call
        raise NotImplementedError(
            "Wire up the Angel One instrument master lookup for live option resolution."
        )

    def get_ltp(self, tradingsymbol, symboltoken, exchange="NFO"):
        if self.paper:
            # Simulate a small random walk so the monitor loop has something to react to.
            return round(random.uniform(100, 450), 2)
        quote = self.api.ltpData(exchange, tradingsymbol, symboltoken)
        return float(quote["data"]["ltp"])

    # ------------------------------------------------------------------
    # Orders
    # ------------------------------------------------------------------
    def check_margin_available(self, required_amount):
        if self.paper:
            return True
        rms = self.api.rmsLimit()
        available = float(rms["data"].get("availablecash", 0))
        return available >= required_amount

    def place_order(self, tradingsymbol, symboltoken, transaction_type, quantity, exchange="NFO"):
        """transaction_type: 'BUY' or 'SELL'. Returns order id (str)."""
        if self.paper:
            return f"PAPER-{int(_time.time()*1000)}"

        order_params = {
            "variety": "NORMAL",
            "tradingsymbol": tradingsymbol,
            "symboltoken": symboltoken,
            "transactiontype": transaction_type,
            "exchange": exchange,
            "ordertype": "MARKET",
            "producttype": "INTRADAY",
            "duration": "DAY",
            "price": "0",
            "squareoff": "0",
            "stoploss": "0",
            "quantity": str(quantity),
        }
        response = self.api.placeOrder(order_params)
        # smartapi-python's placeOrder returns the order id string directly on success.
        return response

    def exit_position(self, tradingsymbol, symboltoken, quantity, exchange="NFO"):
        """Options are bought (BUY) to enter, so exiting is a SELL of the same qty."""
        return self.place_order(tradingsymbol, symboltoken, "SELL", quantity, exchange)
