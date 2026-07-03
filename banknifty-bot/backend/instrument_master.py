"""
Resolves BANKNIFTY option contracts (tradingsymbol + symboltoken) for live
trading, from Angel One's published instrument master
(OpenAPIScripMaster.json — every tradable instrument across every exchange
segment, refreshed by Angel once daily around 08:30 IST).

Only the BANKNIFTY OPTIDX/NFO subset is kept once fetched, so the on-disk
cache stays small instead of mirroring the ~30MB source file. Falls back to
the cache on any fetch failure, same defensive shape as holiday_calendar.py,
so a transient outage doesn't crash the bot mid-session.
"""
import json
import os
from datetime import date, datetime

import requests

from config import Config

_cache = None  # in-memory: {"options": [...], "fetched_at": "<iso>"}


def _fetch_from_angel():
    resp = requests.get(Config.INSTRUMENT_MASTER_URL, timeout=60)
    resp.raise_for_status()
    instruments = resp.json()

    options = []
    for row in instruments:
        if row.get("name") != "BANKNIFTY" or row.get("instrumenttype") != "OPTIDX":
            continue
        if row.get("exch_seg") != "NFO":
            continue
        symbol = row.get("symbol", "")
        option_type = symbol[-2:] if symbol[-2:] in ("CE", "PE") else None
        try:
            strike = float(row["strike"]) / 100.0
        except (KeyError, TypeError, ValueError):
            continue
        if option_type is None or not row.get("expiry") or not row.get("token"):
            continue
        options.append({
            "token": row["token"],
            "symbol": symbol,
            "expiry": row["expiry"],
            "strike": strike,
            "lotsize": int(row.get("lotsize", 0)),
            "option_type": option_type,
        })
    return options


def _load_cache():
    if os.path.exists(Config.INSTRUMENT_MASTER_CACHE_PATH):
        with open(Config.INSTRUMENT_MASTER_CACHE_PATH) as f:
            return json.load(f)
    return None


def _save_cache(options):
    with open(Config.INSTRUMENT_MASTER_CACHE_PATH, "w") as f:
        json.dump({"options": options, "fetched_at": datetime.now().isoformat()}, f)


def refresh_instrument_master():
    """Call once daily (e.g. from the scheduler) to keep the cache fresh."""
    global _cache
    try:
        options = _fetch_from_angel()
        if options:
            _save_cache(options)
            _cache = {"options": options, "fetched_at": datetime.now().isoformat()}
        return _cache
    except Exception as exc:  # network/format failure -> keep old cache, don't crash
        print(f"[instrument_master] refresh failed, using cached list: {exc}")
        _cache = _load_cache()
        return _cache


def _get_options():
    global _cache
    if _cache is None:
        _cache = _load_cache()
    fetched_date = (_cache or {}).get("fetched_at", "")[:10]
    if not _cache or fetched_date != date.today().isoformat():
        refresh_instrument_master()
    return (_cache or {}).get("options", [])


def find_nearest_option(spot_price, option_type, expiry=None):
    """
    Returns dict: {tradingsymbol, symboltoken, strike, lotsize}
    option_type: "CE" or "PE"
    expiry: optional exact expiry string (e.g. "28MAR2024") to pin to a
    specific contract month/week; defaults to the nearest upcoming expiry
    found in the instrument master, whatever NSE currently lists for
    BANKNIFTY (weekly, monthly, or otherwise).
    """
    matches = [o for o in _get_options() if o["option_type"] == option_type]

    if expiry is not None:
        candidates = [o for o in matches if o["expiry"] == expiry]
    else:
        today = date.today()
        by_expiry = {}
        for o in matches:
            try:
                exp_date = datetime.strptime(o["expiry"], "%d%b%Y").date()
            except ValueError:
                continue
            if exp_date >= today:
                by_expiry.setdefault(exp_date, []).append(o)
        if not by_expiry:
            raise RuntimeError(
                "No upcoming BANKNIFTY option expiry found in the instrument master."
            )
        candidates = by_expiry[min(by_expiry)]

    if not candidates:
        raise RuntimeError(
            f"No BANKNIFTY {option_type} contracts found for the resolved expiry."
        )

    best = min(candidates, key=lambda o: abs(o["strike"] - spot_price))
    return {
        "tradingsymbol": best["symbol"],
        "symboltoken": best["token"],
        "strike": best["strike"],
        "lotsize": best["lotsize"],
    }
