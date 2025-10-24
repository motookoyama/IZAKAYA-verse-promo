#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
mkdir -p logs

echo "Tailing logs (last 200 lines, follows):\n  - logs/bff.YYYY-MM-DD.log\n  - logs/frontend.YYYY-MM-DD.log\n  - logs/stack.YYYY-MM-DD.log"

tail -n 200 -F logs/bff.$(date +%F).log logs/frontend.$(date +%F).log logs/stack.$(date +%F).log

