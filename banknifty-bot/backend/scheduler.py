"""
Optional companion process. The webhook_server itself already checks the
trading window and holiday calendar on every incoming signal, so nothing
"bad" happens if this process isn't running — but this scheduler keeps the
holiday cache warm and gives you a daily EOD sanity sweep (flatten anything
that's somehow still open past market close, e.g. after a crash/restart).

Run alongside webhook_server.py, e.g. via a process manager (systemd, pm2,
supervisor) or a second cron-triggered invocation:
    python scheduler.py
"""
import time
from datetime import date, datetime

import requests

import holiday_calendar
import instrument_master
from config import Config


def daily_holiday_refresh():
    holiday_calendar.refresh_holidays()
    print(f"[{datetime.now()}] Holiday calendar refreshed.")


def daily_instrument_master_refresh():
    instrument_master.refresh_instrument_master()
    print(f"[{datetime.now()}] Instrument master refreshed.")


def eod_safety_sweep():
    """Belt-and-braces flatten call in case the in-process monitor thread
    died (e.g. process crash) and a position is still open at close."""
    try:
        requests.post(f"http://localhost:{Config.PORT}/api/kill-switch", timeout=5)
        print(f"[{datetime.now()}] EOD safety sweep executed.")
    except requests.RequestException as exc:
        print(f"[{datetime.now()}] EOD safety sweep failed to reach webhook server: {exc}")


def main():
    from apscheduler.schedulers.blocking import BlockingScheduler

    sched = BlockingScheduler(timezone=Config.TIMEZONE)
    # Refresh holiday list once daily well before market open.
    sched.add_job(daily_holiday_refresh, "cron", hour=7, minute=0)
    # Refresh the instrument master shortly after Angel's ~08:30 IST daily publish.
    sched.add_job(daily_instrument_master_refresh, "cron", hour=8, minute=35)
    # Safety sweep a couple minutes after the configured close time.
    close_h, close_m = (int(x) for x in Config.MARKET_CLOSE.split(":"))
    sched.add_job(eod_safety_sweep, "cron", hour=close_h, minute=close_m + 2)

    print("Scheduler started. Holiday refresh at 07:00 IST, instrument master refresh at "
          "08:35 IST, EOD sweep shortly after market close.")
    sched.start()


if __name__ == "__main__":
    main()
