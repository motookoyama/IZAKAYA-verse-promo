#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[scripts/dev.sh] starting bff + frontend..."
(
  npm -w bff run dev &
  npm -w frontend run dev
)

