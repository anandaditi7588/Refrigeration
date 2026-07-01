"""
Central configuration. Everything sensitive comes from environment variables —
never hardcode API keys / TOTP secrets / client codes in source.

Copy .env.example to .env and fill in real values before going live.
"""
import os

def _bool(name, default="true"):
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


class Config:
    # --- Angel One SmartAPI credentials ---
    ANGEL_API_KEY = os.getenv("ANGEL_API_KEY", "")
    ANGEL_CLIENT_CODE = os.getenv("ANGEL_CLIENT_CODE", "")
    ANGEL_PASSWORD = os.getenv("ANGEL_PASSWORD", "")          # MPIN/password
    ANGEL_TOTP_SECRET = os.getenv("ANGEL_TOTP_SECRET", "")    # base32 TOTP seed

    # --- Safety switches ---
    # PAPER_TRADE=true (default): simulates fills locally, never calls the
    # real order-placement endpoint. Flip to false only after you've validated
    # behavior extensively, per the spec's own risk/compliance section.
    PAPER_TRADE = _bool("PAPER_TRADE", "true")

    # Master kill switch. When true, the webhook handler rejects all new
    # entries and the monitor loop force-closes any open position at once.
    KILL_SWITCH = _bool("KILL_SWITCH", "false")

    # --- Webhook auth ---
    # TradingView webhooks aren't natively authenticated; use a shared secret
    # embedded in the alert JSON payload ("secret": "...") and verify it here.
    WEBHOOK_SHARED_SECRET = os.getenv("WEBHOOK_SHARED_SECRET", "change-me")

    # --- Trading window & risk rules (spec section 5/6) ---
    MARKET_OPEN = os.getenv("MARKET_OPEN", "09:15")
    MARKET_CLOSE = os.getenv("MARKET_CLOSE", "14:45")
    TIMEZONE = "Asia/Kolkata"

    QUANTITY_LOTS = int(os.getenv("QUANTITY_LOTS", "1"))
    LOT_SIZE = int(os.getenv("LOT_SIZE", "35"))  # confirm current NSE Bank Nifty lot size before going live
    SL_POINTS = float(os.getenv("SL_POINTS", "100"))
    TARGET_POINTS = float(os.getenv("TARGET_POINTS", "100"))

    # Resolved open point #2: while a position is open, new signals are
    # IGNORED (not flipped). Set to "flip" to instead close-and-reverse.
    ON_SIGNAL_WHILE_OPEN = os.getenv("ON_SIGNAL_WHILE_OPEN", "ignore")  # "ignore" | "flip"

    # Resolved open point #3: any open position still live at MARKET_CLOSE is
    # squared off automatically rather than left to run.
    EOD_SQUARE_OFF = _bool("EOD_SQUARE_OFF", "true")

    # --- Storage ---
    DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "trades.db"))

    # --- NSE holiday feed ---
    NSE_HOLIDAY_URL = os.getenv(
        "NSE_HOLIDAY_URL",
        "https://www.nseindia.com/api/holiday-master?type=trading",
    )
    HOLIDAY_CACHE_PATH = os.getenv(
        "HOLIDAY_CACHE_PATH", os.path.join(os.path.dirname(__file__), "holidays_cache.json")
    )

    # --- Server ---
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8080"))
