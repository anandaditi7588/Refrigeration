# Bank Nifty Options Auto-Trading Bot

Implementation of the spec: TradingView signal engine → Python execution engine
(Angel One SmartAPI) → live dashboard.

## What's in here

```
pinescript/banknifty_ema_halftrend.pine   Signal engine (TradingView)
backend/config.py                          All settings, from environment vars
backend/db.py                              SQLite trade/signal log
backend/holiday_calendar.py                Live NSE holiday fetch + cache
backend/instrument_master.py               Live Angel One instrument master fetch + cache (option resolution)
backend/smartapi_client.py                 Angel One SmartAPI wrapper (paper-mode aware)
backend/order_manager.py                   Entry, SL/target monitor, EOD square-off, kill switch
backend/webhook_server.py                  Flask app — run this
backend/scheduler.py                       Optional: daily holiday refresh + EOD safety sweep
backend/dashboard/index.html               Live P&L dashboard
```

## The four open points — resolved

The draft spec flagged these as undecided. I picked the safer default for
each and wired it into the code; all are one-line config changes if you want
different behavior.

1. **Condition 4's order type.** Implemented as **PUT** — matches the
   bearish setup described (close above EMA, Green→Red flip) even though the
   draft text said "call order" in one place. Confirm this is what you meant.
2. **Signal while a trade is already open.** Defaults to **ignore** the new
   signal (logged, not acted on). Set `ON_SIGNAL_WHILE_OPEN=flip` in `.env`
   to instead close the existing trade and open the new one.
3. **Open position at 14:45.** Defaults to **auto square-off** — the
   position is market-closed at the window boundary rather than left running
   into option-expiry/overnight risk. Set `EOD_SQUARE_OFF=false` to disable.
4. **75% retracement reference.** Implemented in the Pine Script as 75% of
   the *setup candle's* full high-low range, measured from the high downward
   (delayed Call) or from the low upward (delayed Put). The formulas are
   isolated in two lines (`delayedCallLevel` / `delayedPutLevel`) if your
   intended reference point differs — e.g. "75% retracement of the move"
   could instead mean something measured from the close, not the extreme.

## Setup

1. **TradingView**: paste `banknifty_ema_halftrend.pine` into Pine Editor,
   add to a Bank Nifty 15-min chart, create an alert on it with condition
   "Any alert() function call," and put your webhook URL
   (`https://your-server/webhook`) in the alert's webhook field. In the
   alert message box, wrap the script's payload so it includes your secret:
   the script already emits valid JSON — add `"secret":"..."` matching
   `WEBHOOK_SHARED_SECRET` before enabling live alerts (TradingView doesn't
   support per-alert JSON editing after the fact, so bake the secret into
   the Pine Script's `payload` string, or check your TradingView plan's
   webhook header options).
2. **Backend**:
   ```
   cd backend
   cp .env.example .env      # fill in Angel One credentials, keep PAPER_TRADE=true
   pip install -r requirements.txt
   python webhook_server.py
   ```
   Dashboard is served at `http://localhost:8080/`.
3. **Expose the webhook** publicly (a small VPS, or a tunnel like ngrok/
   Cloudflare Tunnel for testing) so TradingView's servers can reach
   `/webhook`.
4. **Scheduler** (optional but recommended): run `python scheduler.py`
   alongside the webhook server, under a process manager (systemd, pm2,
   supervisor) so it restarts on crash.

## Safety notes — read before going live

- **`PAPER_TRADE=true` is the default and was exercised end-to-end** (webhook
  → simulated fill → SL/target monitor → dashboard). Leave it on until
  you've watched a full live trading session of paper trades match your
  expectations.
- **The strike/instrument-token lookup** (`find_nearest_option`, live
  branch in `smartapi_client.py`) resolves real contracts via
  `instrument_master.py`, which downloads and caches Angel One's published
  instrument master (`OpenAPIScripMaster.json`, refreshed daily) and picks
  the nearest upcoming BANKNIFTY expiry and nearest strike to the signal's
  spot price. That module's field-name/date-format assumptions are based on
  Angel One's documented schema but were not verified against a live fetch
  of the file in the environment this was built in — spot-check them
  against the current file before flipping `PAPER_TRADE=false`. It also
  warns (but doesn't block) if the resolved contract's lot size disagrees
  with the configured `LOT_SIZE`.
- **Confirm Angel One's current algo-trading registration requirement**
  directly with them — this is governed by SEBI rules that have been
  actively changing and isn't something to rely on a static answer for.
- **Confirm the Bank Nifty lot size** in `.env` (`LOT_SIZE`) before going
  live — exchange lot sizes are revised periodically.
- **Kill switch**: `POST /api/kill-switch` flattens everything immediately,
  and the dashboard has a "FLATTEN ALL" button wired to it. Setting
  `KILL_SWITCH=true` in the environment additionally blocks all *new*
  entries.
- This is a leveraged, real-money options trading system. Nothing here
  constitutes financial advice, and automated strategies can lose money
  quickly, especially around SL/target logic that's untested against live
  market microstructure (gaps, slippage, illiquid strikes). Test small.
