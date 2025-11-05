#!/usr/bin/env bash
# CASE-PORT-20251101: ensure mini BFF port is free before dev server starts
PORT=4117
if PIDS=$(lsof -ti tcp:$PORT 2>/dev/null); then
  echo "[kill-bff-port] stopping processes on $PORT: $PIDS"
  kill $PIDS 2>/dev/null
  sleep 1
fi
