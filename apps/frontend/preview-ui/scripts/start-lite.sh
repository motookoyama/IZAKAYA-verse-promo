#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Optionally stop first
if [ "${STOP_FIRST:-0}" = "1" ]; then
  echo "[start-lite] Stopping first..."
  "$ROOT/scripts/stop.sh" || true
fi

is_free() { ! lsof -ti :"$1" >/dev/null 2>&1; }

# Decide frontend port
FE_PORT="${FRONTEND_PORT:-}"
if [ -z "$FE_PORT" ]; then
  if is_free 5173; then FE_PORT=5173
  elif is_free 5174; then FE_PORT=5174
  else FE_PORT=5175
  fi
fi

# Decide BFF port
BFF_PORT="${BFF_PORT:-8787}"
if ! is_free "$BFF_PORT"; then
  if [ "${AUTO_KILL:-0}" = "1" ]; then
    echo "[start-lite] Port $BFF_PORT busy. Killing..."
    lsof -ti :"$BFF_PORT" | xargs -r kill -9 || true
  else
    echo "[start-lite] Note: port $BFF_PORT is busy. Consider STOP_FIRST=1 or AUTO_KILL=1."
  fi
fi

# Set CORS_ORIGIN to match frontend
export FRONTEND_PORT="$FE_PORT"
export BFF_PORT
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:$FE_PORT}"

echo "[start-lite] Starting with FRONTEND_PORT=$FRONTEND_PORT, BFF_PORT=$BFF_PORT, CORS_ORIGIN=$CORS_ORIGIN"
"$ROOT/scripts/start.sh"

