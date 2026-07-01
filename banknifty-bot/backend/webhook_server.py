"""
Entry point. Run with: python webhook_server.py

Expects TradingView alert JSON of the form (matches the Pine Script's payload,
with an added "secret" field you must add in the TradingView alert message box):

{
  "signal": "CALL" | "PUT",
  "price": 51234.5,
  "symbol": "BANKNIFTY",
  "timeframe": "15",
  "timestamp": "...",
  "secret": "your-shared-secret"
}
"""
from datetime import date

from flask import Flask, jsonify, request, render_template

import db
import holiday_calendar
from config import Config
from order_manager import OrderManager

app = Flask(__name__, template_folder="dashboard", static_folder="dashboard/static")
db.init_db()
order_manager = OrderManager()


@app.route("/webhook", methods=["POST"])
def webhook():
    payload = request.get_json(force=True, silent=True) or {}

    if payload.get("secret") != Config.WEBHOOK_SHARED_SECRET:
        return jsonify({"status": "rejected", "reason": "bad_secret"}), 401

    signal_type = payload.get("signal")
    if signal_type not in ("CALL", "PUT"):
        return jsonify({"status": "ignored", "reason": "not_actionable_signal"}), 200

    if not holiday_calendar.is_trading_day(date.today()):
        db.log_signal(signal_type, payload.get("price"), str(payload), acted_on=False,
                       skip_reason="NON_TRADING_DAY")
        return jsonify({"status": "skipped", "reason": "non_trading_day"}), 200

    try:
        spot_price = float(payload.get("price"))
    except (TypeError, ValueError):
        return jsonify({"status": "rejected", "reason": "missing_or_invalid_price"}), 400

    result = order_manager.handle_signal(signal_type, spot_price, str(payload))
    return jsonify(result), 200


@app.route("/api/kill-switch", methods=["POST"])
def kill_switch():
    """Manual override: flattens all open positions immediately. Set
    KILL_SWITCH=true in the environment for a persistent halt, or call this
    endpoint for a one-off flatten while leaving KILL_SWITCH as-is."""
    order_manager.flatten_all()
    return jsonify({"status": "flattened"}), 200


@app.route("/api/trades")
def api_trades():
    date_from = request.args.get("from")
    date_to = request.args.get("to")
    rows = db.get_trades(date_from, date_to)
    return jsonify([dict(r) for r in rows])


@app.route("/")
def dashboard():
    return render_template("index.html")


if __name__ == "__main__":
    holiday_calendar.refresh_holidays()
    app.run(host=Config.HOST, port=Config.PORT)
