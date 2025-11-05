#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/integrity"
mkdir -p "$LOG_DIR"
STAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/check_$STAMP.log"

echo "=== IZAKAYA BFF INTEGRITY CHECK ===" | tee -a "$LOG_FILE"

HAS_JQ=0
if command -v jq >/dev/null 2>&1; then
  HAS_JQ=1
else
  echo "[WARN] jq が見つかりません。JSONの妥当性検証はスキップされます。" | tee -a "$LOG_FILE"
fi

# load BFF environment values
ENV_FILE="$ROOT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

BFF_PORT="${PORT:-4117}"
UI_URL_VALUE="${UI_URL:-http://localhost:5174}"

parse_port_from_url() {
  python3 - <<'PY'
import sys
from urllib.parse import urlparse
url = sys.argv[1]
parsed = urlparse(url if '://' in url else f"http://{url}")
port = parsed.port or (443 if parsed.scheme == 'https' else 80)
print(port)
PY
}

UI_PORT=$(parse_port_from_url "$UI_URL_VALUE" 2>/dev/null || echo "5174")

echo "[INFO] BFF_PORT=$BFF_PORT" | tee -a "$LOG_FILE"
echo "[INFO] UI_URL=$UI_URL_VALUE" | tee -a "$LOG_FILE"
echo "[INFO] UI_PORT=$UI_PORT" | tee -a "$LOG_FILE"

# CASE-PORT-20251101: terminate stray preview-ui listeners before diagnostics
cleanup_preview_ports() {
  local PORT="$1"
  if PIDS=$(lsof -ti tcp:$PORT 2>/dev/null); then
    echo "[integrity-check] stopping stale preview-ui on port $PORT: $PIDS" | tee -a "$LOG_FILE"
    kill $PIDS 2>/dev/null
    sleep 1
  fi
}

# remove stray preview-ui fallback ports and keep primary 5174 clean
cleanup_preview_ports 5173

check() {
  NAME="$1"
  CMD="$2"
  echo -n "[CHECK] $NAME ... " | tee -a "$LOG_FILE"

  RESULT=$(eval "$CMD" 2>&1)
  STATUS=$?
  if [[ $STATUS -ne 0 ]]; then
    echo "FAIL" | tee -a "$LOG_FILE"
    echo "----- RESPONSE -----" >> "$LOG_FILE"
    echo "$RESULT" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    return
  fi

  echo "OK" | tee -a "$LOG_FILE"
}

check "health/ping"     "curl -fsS http://localhost:4117/health/ping >/dev/null"
check "admin/info"      "curl -fsS http://localhost:4117/admin/info >/dev/null"
if [[ $HAS_JQ -eq 1 ]]; then
  check "points/list"   "curl -fsS http://localhost:4117/points/list | jq -e 'type==\"array\"' >/dev/null"
  check "points/config" "curl -fsS http://localhost:4117/points/config | jq -e 'type==\"object\"' >/dev/null"
  check "soul-core/debug" "curl -fsS http://localhost:4117/soul-core/debug | jq -e 'has(\"files\")' >/dev/null"
else
  check "points/list"   "curl -fsS http://localhost:4117/points/list >/dev/null"
  check "points/config" "curl -fsS http://localhost:4117/points/config >/dev/null"
  check "soul-core/debug" "curl -fsS http://localhost:4117/soul-core/debug >/dev/null"
fi
check "bff->ui"         "curl -fsS http://localhost:4117/admin/ui-alive >/dev/null"

echo "" | tee -a "$LOG_FILE"
echo "ログ保存先: $LOG_FILE" | tee -a "$LOG_FILE"
