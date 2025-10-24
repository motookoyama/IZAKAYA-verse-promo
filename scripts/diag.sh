#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[diag] Project root: $ROOT"
echo "[diag] Node: $(node -v 2>/dev/null || echo 'not found') | npm: $(npm -v 2>/dev/null || echo 'not found')"

echo "[diag] Key files:"
for f in scripts/start.sh scripts/stop.sh scripts/restart.sh .env package.json README.md; do
  if [ -f "$f" ]; then
    echo "  [OK] $f"
  else
    echo "  [..] $f (missing)"
  fi
done

echo "[diag] Ports:"
for p in "${BFF_PORT:-8787}" "${FRONTEND_PORT:-5173}" 5174; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  :$p -> LISTEN ($(lsof -ti :$p | tr '\n' ' '))"
  else
    echo "  :$p -> free"
  fi
done

echo "[diag] Latest logs:"
latest() { ls -t "$1" 2>/dev/null | head -n1; }
for pat in "logs/bff.*.log" "logs/frontend.*.log" "logs/stack.*.log"; do
  f=$(latest "$pat" || true)
  if [ -n "${f:-}" ] && [ -f "$f" ]; then
    echo "--- tail -n 50 $f"
    tail -n 50 "$f" || true
  else
    echo "(no log for $pat)"
  fi
done

if [ -f .env ]; then
  echo "[diag] .env keys:"
  sed -E 's/#.*$//' .env | sed -E '/^\s*$/d' | cut -d= -f1 | sort -u | awk '{print "  - "$0}'
fi

echo "[diag] Tips: use scripts/start-lite.sh to auto-pick free ports and set CORS."

