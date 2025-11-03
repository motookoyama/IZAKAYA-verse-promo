#!/bin/bash

set -euo pipefail

echo "=== IZAKAYA LINK CONTRACT SELF TEST ==="

# 1. BFF Ping
echo "[1] Checking BFF /health/ping..."
if ! curl -s http://localhost:4117/health/ping | grep '"ok":true' >/dev/null; then
  echo "❌ ERROR: /health/ping failed"
  exit 1
fi
echo "✅ BFF OK"

# 2. Chat API
echo "[2] Checking /chat/v1..."
if ! curl -s -X POST http://localhost:4117/chat/v1 \
  -H "Content-Type: application/json" \
  -d '{"query":"test","temperature":0.2}' | grep '"reply"' >/dev/null; then
  echo "❌ ERROR: /chat/v1 failed"
  exit 1
fi
echo "✅ Chat OK"

# 3. Soul Core Paths
echo "[3] Checking soul core files..."
if ! curl -s -X POST http://localhost:4117/chat/v1 \
  -H "Content-Type: application/json" \
  -d '{"query":"test","temperature":0.2}' | grep 'soul_core_paths' >/dev/null; then
  echo "❌ ERROR: soul_core missing"
  exit 1
fi
echo "✅ Soul Core OK"

echo "✅ ALL GREEN: LINK CONTRACT VERIFIED"
exit 0
