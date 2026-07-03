#!/usr/bin/env bash
# End-to-end smoke test for the banknifty-bot backend.
#
# Starts webhook_server.py (paper mode), sends a fake TradingView signal,
# checks that a trade landed in /api/trades, hits the kill-switch, confirms
# the dashboard serves, then stops the server.
#
# Run from banknifty-bot/backend/:
#   ./smoke_test.sh
#
# Requires: python3 with requirements.txt installed, curl.

set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
LOG_FILE="$(mktemp)"
SERVER_PID=""

cleanup() {
  local status=$?
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ $status -ne 0 ]]; then
    echo
    echo "==> Server log (for diagnosis):"
    cat "$LOG_FILE"
  fi
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

if [[ ! -f .env ]]; then
  echo "No .env found — copying .env.example (paper mode defaults)."
  cp .env.example .env
fi

echo "==> Starting webhook_server.py ..."
# Force a wide trading window for this run so the test doesn't depend on
# wall-clock time (order_manager compares the server's raw system clock
# against MARKET_OPEN/MARKET_CLOSE without timezone conversion — a known
# issue, not something this test is meant to catch).
MARKET_OPEN="00:00" MARKET_CLOSE="23:59" python3 webhook_server.py > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "==> Waiting for server on ${BASE_URL} ..."
for _ in $(seq 1 30); do
  if curl -s -o /dev/null "$BASE_URL/"; then
    break
  fi
  sleep 0.5
done
if ! curl -s -o /dev/null "$BASE_URL/"; then
  echo "FAIL: server never came up. Log:"
  cat "$LOG_FILE"
  exit 1
fi
echo "    server is up (pid $SERVER_PID)."

# Read the *effective* shared secret straight from Config, rather than the
# .env file, since Config values only reflect real process environment
# variables — .env is not currently auto-loaded (see known issue below).
SECRET=$(python3 -c "from config import Config; print(Config.WEBHOOK_SHARED_SECRET)")
echo "==> Effective WEBHOOK_SHARED_SECRET: ${SECRET}"

echo "==> Sending a fake TradingView CALL signal ..."
RESP=$(curl -s -X POST "$BASE_URL/webhook" \
  -H "Content-Type: application/json" \
  -d "{\"signal\":\"CALL\",\"price\":52340.5,\"symbol\":\"BANKNIFTY\",\"timeframe\":\"15\",\"timestamp\":\"smoke-test\",\"secret\":\"${SECRET}\"}")
echo "    response: $RESP"

STATUS=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))")
if [[ "$STATUS" != "order_placed" ]]; then
  echo "FAIL: expected status 'order_placed', got '$STATUS'."
  echo "This can happen legitimately if outside MARKET_OPEN/MARKET_CLOSE or on a"
  echo "non-trading day per the server's clock — check the response reason above."
  exit 1
fi
echo "    OK: paper order placed."

echo "==> Checking /api/trades ..."
TRADES=$(curl -s "$BASE_URL/api/trades")
echo "    $TRADES"
TRADE_COUNT=$(echo "$TRADES" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
if [[ "$TRADE_COUNT" -lt 1 ]]; then
  echo "FAIL: expected at least 1 trade logged, found $TRADE_COUNT."
  exit 1
fi
echo "    OK: $TRADE_COUNT trade(s) logged."

echo "==> Hitting kill-switch ..."
KILL_RESP=$(curl -s -X POST "$BASE_URL/api/kill-switch")
echo "    response: $KILL_RESP"

echo "==> Checking dashboard root ..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [[ "$CODE" != "200" ]]; then
  echo "FAIL: dashboard returned HTTP $CODE."
  exit 1
fi
echo "    OK: dashboard returned HTTP 200."

echo
echo "==> ALL CHECKS PASSED."
