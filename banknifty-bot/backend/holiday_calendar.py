"""
Fetches the NSE equity/derivatives trading holiday calendar so the bot never
hardcodes holiday dates. Falls back to a local cache file if the NSE endpoint
is unreachable (rate-limited, network blip, etc.) so a transient failure
doesn't accidentally let the bot trade on a holiday or block it on a real
trading day.
"""
import json
import os
from datetime import date, datetime

import requests

from config import Config

_HEADERS = {
    # NSE's endpoints reject requests without browser-like headers.
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json",
}


def _fetch_from_nse():
    session = requests.Session()
    # NSE requires an initial GET to the homepage to set cookies before the API call works.
    session.get("https://www.nseindia.com", headers=_HEADERS, timeout=10)
    resp = session.get(Config.NSE_HOLIDAY_URL, headers=_HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    # Response shape has historically been {"CM": [{"tradingDate": "DD-MMM-YYYY", ...}, ...]}
    dates = set()
    for entry in data.get("CM", []):
        raw = entry.get("tradingDate")
        if raw:
            try:
                dates.add(datetime.strptime(raw, "%d-%b-%Y").date().isoformat())
            except ValueError:
                continue
    return dates


def _load_cache():
    if os.path.exists(Config.HOLIDAY_CACHE_PATH):
        with open(Config.HOLIDAY_CACHE_PATH) as f:
            return set(json.load(f).get("dates", []))
    return set()


def _save_cache(dates):
    with open(Config.HOLIDAY_CACHE_PATH, "w") as f:
        json.dump({"dates": sorted(dates), "fetched_at": datetime.now().isoformat()}, f)


def refresh_holidays():
    """Call once daily (e.g. from the scheduler) to keep the cache fresh."""
    try:
        dates = _fetch_from_nse()
        if dates:
            _save_cache(dates)
        return dates
    except Exception as exc:  # network/format failure -> keep old cache, don't crash
        print(f"[holiday_calendar] refresh failed, using cached list: {exc}")
        return _load_cache()


def is_trading_holiday(check_date: date = None) -> bool:
    check_date = check_date or date.today()
    dates = _load_cache() or refresh_holidays()
    return check_date.isoformat() in dates


def is_weekend(check_date: date = None) -> bool:
    check_date = check_date or date.today()
    return check_date.weekday() >= 5  # 5=Sat, 6=Sun


def is_trading_day(check_date: date = None) -> bool:
    check_date = check_date or date.today()
    return not is_weekend(check_date) and not is_trading_holiday(check_date)
