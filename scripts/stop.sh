#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

FRONT_PORT="${FRONTEND_PORT:-5173}"
BFF_PORT="${PORT:-8787}"

kill_on_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti tcp:"$port" || true)
    if [[ -n "$pids" ]]; then
      echo "Killing processes on port $port: $pids"
      kill -9 $pids || true
    else
      echo "No process on port $port"
    fi
  else
    echo "lsof not found; cannot stop by port"
  fi
}

kill_on_port "$BFF_PORT"
kill_on_port "$FRONT_PORT"

# Handle optional legacy ports robustly even with set -u
EXTRA=()
if [[ -n "${LEGACY_PORTS:-}" ]]; then
  IFS=',' read -ra EXTRA <<< "${LEGACY_PORTS}"
fi
if [[ ${#EXTRA[@]} -gt 0 ]]; then
  for p in "${EXTRA[@]}"; do
    [[ -n "$p" ]] && kill_on_port "$p"
  done
fi

echo "Stopped (best effort)."
