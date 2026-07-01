"""SQLite trade/signal log — backs the dashboard's P&L rollups."""
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime

from config import Config

_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at TEXT NOT NULL,
    signal_type TEXT NOT NULL,       -- CALL / PUT
    spot_price REAL,
    raw_payload TEXT,
    acted_on INTEGER NOT NULL DEFAULT 0,
    skip_reason TEXT
);

CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_id INTEGER,
    date TEXT NOT NULL,
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    signal_type TEXT NOT NULL,       -- CALL / PUT
    tradingsymbol TEXT,
    symboltoken TEXT,
    strike REAL,
    option_type TEXT,                -- CE / PE
    quantity INTEGER,
    entry_price REAL,
    stop_loss REAL,
    target REAL,
    exit_price REAL,
    exit_reason TEXT,                -- SL / TARGET / EOD / KILL_SWITCH / MANUAL
    net_pnl REAL,
    is_paper INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'OPEN',   -- OPEN / CLOSED
    order_id TEXT,
    FOREIGN KEY (signal_id) REFERENCES signals(id)
);
"""


@contextmanager
def get_conn():
    with _lock:
        conn = sqlite3.connect(Config.DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def log_signal(signal_type, spot_price, raw_payload, acted_on=False, skip_reason=None):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO signals (received_at, signal_type, spot_price, raw_payload, acted_on, skip_reason) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (datetime.now().isoformat(), signal_type, spot_price, raw_payload, int(acted_on), skip_reason),
        )
        return cur.lastrowid


def open_trade(signal_id, signal_type, tradingsymbol, symboltoken, strike, option_type,
               quantity, entry_price, stop_loss, target, is_paper, order_id=None):
    now = datetime.now()
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO trades
            (signal_id, date, entry_time, signal_type, tradingsymbol, symboltoken, strike, option_type,
             quantity, entry_price, stop_loss, target, is_paper, status, order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)""",
            (signal_id, now.date().isoformat(), now.isoformat(), signal_type, tradingsymbol, symboltoken,
             strike, option_type, quantity, entry_price, stop_loss, target, int(is_paper), order_id),
        )
        return cur.lastrowid


def close_trade(trade_id, exit_price, exit_reason):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM trades WHERE id=?", (trade_id,)).fetchone()
        if not row:
            return None
        pnl = (exit_price - row["entry_price"]) * row["quantity"]
        conn.execute(
            "UPDATE trades SET exit_time=?, exit_price=?, exit_reason=?, net_pnl=?, status='CLOSED' WHERE id=?",
            (datetime.now().isoformat(), exit_price, exit_reason, pnl, trade_id),
        )
        return pnl


def get_open_trades():
    with get_conn() as conn:
        return conn.execute("SELECT * FROM trades WHERE status='OPEN'").fetchall()


def get_trades(date_from=None, date_to=None):
    q = "SELECT * FROM trades WHERE 1=1"
    params = []
    if date_from:
        q += " AND date >= ?"
        params.append(date_from)
    if date_to:
        q += " AND date <= ?"
        params.append(date_to)
    q += " ORDER BY entry_time DESC"
    with get_conn() as conn:
        return conn.execute(q, params).fetchall()
