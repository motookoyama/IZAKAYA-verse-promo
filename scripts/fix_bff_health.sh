#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/apps/bff/mini"

pkg_tmp=$(mktemp)
cat <<'JSON' > "$pkg_tmp"
{
  "name": "izakaya-bff-mini",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
JSON
mv "$pkg_tmp" package.json

cat <<'JS' > server.js
import express from "express";

const app = express();

app.get("/", (_req, res) => {
  res.send("IZAKAYA Mini BFF is running");
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "IZAKAYA_BFF" });
});

app.get("/api/points", (_req, res) => {
  res.json({ status: "ok", points: 100 });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Mini BFF running on port ${PORT}`);
});
JS

npm install
npm start &
PID=$!
sleep 3
set +e
curl -f http://localhost:10000/api/health || true
set -e
kill $PID || true
