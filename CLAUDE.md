# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo currently contains a single project, `banknifty-bot/`: a Bank Nifty
options auto-trading bot. The pipeline is: a TradingView Pine Script signal
engine → webhook → a Python (Flask) execution engine that trades via Angel
One's SmartAPI → a live P&L dashboard. There is no top-level build system —
work happens inside `banknifty-bot/backend/`.

## Running it

```
cd banknifty-bot/backend
cp .env.example .env      # fill in Angel One credentials; keep PAPER_TRADE=true
pip install -r requirements.txt
python webhook_server.py  # entry point; dashboard served at http://localhost:8080/
python scheduler.py       # optional companion process (holiday refresh + EOD safety sweep)
```

There is no test suite, linter, or build step configured in this repo — don't
invent commands for them.

`webhook_server.py` expects TradingView alert JSON on `POST /webhook`:
```json
{"signal": "CALL" | "PUT", "price": 51234.5, "symbol": "BANKNIFTY", "timeframe": "15", "timestamp": "...", "secret": "..."}
```
`secret` must match `WEBHOOK_SHARED_SECRET`. Other routes: `POST
/api/kill-switch` (flattens all open positions), `GET /api/trades` (dashboard
data), `GET /` (dashboard UI).

## Architecture

- **`pinescript/banknifty_ema_halftrend.pine`** — the signal engine (runs on
  TradingView, not in this repo's Python process). It computes a 25-EMA plus
  an original ATR-channel trend-flip (a from-scratch stand-in for the
  community "HalfTrend" indicator, which is separately licensed and
  intentionally not reproduced). It resolves four conditions from the spec
  (immediate call/put, delayed call/put with a 75%-retracement confirmation
  state machine) into a single `CALL`/`PUT`/`WAIT` signal, and fires a
  webhook alert with a JSON payload a few seconds before candle close on
  realtime bars only.
- **`backend/webhook_server.py`** — the Flask entry point. Validates the
  shared secret, checks `holiday_calendar.is_trading_day()`, and hands
  actionable signals to `OrderManager.handle_signal()`. Trusts the Pine
  Script's CALL/PUT decision entirely; does no signal logic of its own.
- **`backend/order_manager.py`** — the execution state machine: strike
  selection via `SmartAPIClient`, entry, a background monitor thread per
  open trade (polls LTP every 2s against SL/target/trading-window/kill-switch),
  and EOD square-off. Only one open position is tracked at a time
  (`_current_trade_id`); `Config.ON_SIGNAL_WHILE_OPEN` controls whether a new
  signal while a trade is open is ignored (default) or flips (closes old,
  opens new).
- **`backend/smartapi_client.py`** — wraps Angel One's `smartapi-python` SDK.
  Every method branches on `Config.PAPER_TRADE`: paper mode returns
  realistic fake data (random LTPs, `PAPER-<timestamp>` order ids) so the
  full pipeline is exercisable with no real capital; live mode calls the
  real SDK. **`find_nearest_option`'s live branch deliberately raises
  `NotImplementedError`** — the Angel One instrument-master lookup for
  resolving option strike → symboltoken is intentionally left as a TODO
  rather than guessed at, since a wrong symbol token would place a
  wrong-instrument order. Wire this up before ever setting
  `PAPER_TRADE=false`.
- **`backend/db.py`** — SQLite (`trades.db`) logging every signal (acted-on
  or skipped, with a reason) and every trade (entry/exit/P&L). Backs the
  dashboard's `/api/trades` endpoint. Uses a module-level `threading.Lock`
  around each connection since the monitor threads and Flask requests share
  the DB.
- **`backend/holiday_calendar.py`** — fetches the NSE trading holiday
  calendar live and caches it to `holidays_cache.json`; falls back to the
  cache on any fetch failure so a transient NSE outage never accidentally
  lets the bot trade on a holiday (or blocks it on a real trading day).
- **`backend/config.py`** — single source of truth for all settings, read
  from environment variables (via `.env`). Never hardcode credentials or
  trading parameters elsewhere; add new settings here.
- **`backend/scheduler.py`** — optional `apscheduler`-based companion
  process: daily holiday-cache refresh at 07:00 IST and an EOD safety sweep
  (calls `/api/kill-switch`) shortly after `MARKET_CLOSE`, as a belt-and-
  braces flatten in case the in-process monitor thread died. The webhook
  server works correctly without this process running.
- **`backend/dashboard/index.html`** — static single-page dashboard, polls
  `/api/trades` and has a "FLATTEN ALL" button wired to `/api/kill-switch`.

## Key conventions and safety invariants

- **Safety-critical defaults are deliberate, not oversights** — read
  `banknifty-bot/README.md`'s "four open points" and "safety notes" sections
  before changing any of: `PAPER_TRADE`, `KILL_SWITCH`, `ON_SIGNAL_WHILE_OPEN`,
  `EOD_SQUARE_OFF`, or the Pine Script's `delayedCallLevel`/`delayedPutLevel`
  formulas. These encode explicit decisions about ambiguous points in the
  original spec.
- All secrets/credentials (`ANGEL_API_KEY`, `ANGEL_TOTP_SECRET`,
  `WEBHOOK_SHARED_SECRET`, etc.) come from environment variables via
  `Config`, loaded from `.env` (gitignored) — never hardcode them in source.
- `Config.PAPER_TRADE` (default `true`) gates every real network call in
  `smartapi_client.py`; when adding new SmartAPI methods, follow the same
  pattern of a paper-mode branch that returns realistic fake data before the
  live branch.
- Confirm `LOT_SIZE` and Angel One's algo-trading registration requirements
  are current before flipping `PAPER_TRADE=false` — both are periodically
  revised by the exchange/regulator and shouldn't be assumed static.
