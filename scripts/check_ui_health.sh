#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://izakaya-verse-promo.onrender.com}"
UI_BASE_URL="${UI_BASE_URL:-https://motookoyama.github.io/IZAKAYA-verse-promo/}"

echo "Checking API health @ ${API_BASE_URL}/api/health"
curl -fsS "${API_BASE_URL%/}/api/health" || echo "❌ API health failed"

echo "Checking API points @ ${API_BASE_URL}/api/points"
curl -fsS "${API_BASE_URL%/}/api/points" || echo "❌ API points failed"

echo "Checking UI @ ${UI_BASE_URL}"
curl -I -fsS "$UI_BASE_URL" || echo "❌ UI unreachable"
