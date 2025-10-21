#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/start.sh [--kill-legacy]
# - Reads .env; computes CORS_ORIGIN from FRONTEND_PORT
# - Optionally kills processes on ports to avoid衝突（--kill-legacy or KILL_LEGACY=1）

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi
set -a; source .env; set +a

FRONT_PORT="${FRONTEND_PORT:-5173}"
BFF_PORT="${PORT:-8787}"
CORS_ORIGIN="http://localhost:${FRONT_PORT}"
export CORS_ORIGIN

kill_on_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti tcp:"$port" || true)
    if [[ -n "$pids" ]]; then
      echo "Killing processes on port $port: $pids"
      kill -9 $pids || true
    fi
  else
    echo "lsof not found; skip killing port $port"
  fi
}

if [[ "${1:-}" == "--kill-legacy" || "${KILL_LEGACY:-}" == "1" ]]; then
  kill_on_port "$BFF_PORT"
  kill_on_port "$FRONT_PORT"
  EXTRA=()
  if [[ -n "${LEGACY_PORTS:-}" ]]; then
    IFS=',' read -ra EXTRA <<< "${LEGACY_PORTS}"
  fi
  if [[ ${#EXTRA[@]} -gt 0 ]]; then
    for p in "${EXTRA[@]}"; do
      [[ -n "$p" ]] && kill_on_port "$p"
    done
  fi
fi

# Optional: auto-install dependencies if missing
need_install=0
[[ ! -x node_modules/.bin/vite ]] && need_install=1
[[ ! -x bff/node_modules/.bin/ts-node ]] && need_install=1
if [[ $need_install -eq 1 ]]; then
  if [[ "${AUTO_INSTALL:-0}" == "1" ]]; then
    echo "Dependencies missing. Running npm install (AUTO_INSTALL=1)."
    npm install
  else
    echo "Dependencies missing (vite/ts-node). Run 'npm install' at repo root, or set AUTO_INSTALL=1 to auto-install from this script."
  fi
fi

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
BFF_LOG="$LOG_DIR/bff.$(date +%F).log"
FRONT_LOG="$LOG_DIR/frontend.$(date +%F).log"
STACK_LOG="$LOG_DIR/stack.$(date +%F).log"

echo "[${TS}] Starting BFF:${BFF_PORT} + Frontend:${FRONT_PORT} (CORS_ORIGIN=${CORS_ORIGIN})" | tee -a "$STACK_LOG"

# Start both; tee outputs to per-service and combined logs
( npm -w bff run dev 2>&1 | tee -a "$BFF_LOG" "$STACK_LOG" ) &
BFF_PID=$!
( npm -w frontend run dev 2>&1 | tee -a "$FRONT_LOG" "$STACK_LOG" ) &
FRONT_PID=$!

trap 'echo Stopping...; kill $BFF_PID $FRONT_PID 2>/dev/null || true; wait || true' INT TERM
wait
