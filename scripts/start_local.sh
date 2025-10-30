#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d "apps/bff/mini/node_modules" ]; then
  echo "[start_local] Installing dependencies for BFF..."
  (cd apps/bff/mini && npm install)
fi

if [ ! -d "apps/frontend/preview-ui/node_modules" ]; then
  echo "[start_local] Installing dependencies for preview-ui..."
  (cd apps/frontend/preview-ui && npm install)
fi

echo "[start_local] running sanity check"
node tools/circuit-inspector/inspector.js --service bff-mini

echo "[start_local] starting Mini BFF (wallet/soul-core integrated)"
(cd apps/bff/mini && npm run dev) &
BFF_PID=$!

echo "[start_local] starting preview-ui"
(cd apps/frontend/preview-ui && npm run dev) &
UI_PID=$!

trap 'echo "[start_local] stopping..."; kill $BFF_PID $UI_PID 2>/dev/null || true; wait || true' INT TERM
wait
