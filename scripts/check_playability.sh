#!/usr/bin/env bash
set -euo pipefail

TIMEOUT="${TIMEOUT:-15}"
FE_URL="${FE_URL:-https://izakaya-lite-ui-95139013565.asia-northeast1.run.app}"
BFF_URL="${BFF_URL:-https://izakaya-verse-promo-95139013565.asia-northeast1.run.app}"

command -v curl >/dev/null 2>&1 || { echo "curl is required"; exit 2; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 2; }

AUTH_ARGS=()
if [[ -n "${BFF_BEARER:-}" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${BFF_BEARER}")
fi

echo "=== IZAKAYA Playability Check ==="
echo "Frontend: ${FE_URL}"
echo "BFF     : ${BFF_URL}"

fail() {
  echo "❌ $1"
  exit 1
}

pass() {
  echo "✅ $1"
}

http_code() {
  curl -sS -m "${TIMEOUT}" -o /dev/null -w '%{http_code}' "$@"
}

curl_json() {
  curl -sS -m "${TIMEOUT}" "${AUTH_ARGS[@]}" "$@"
}

FE_STATUS=$(http_code -I "${FE_URL}") || true
[[ "${FE_STATUS}" == "200" ]] || fail "Frontend unreachable (status=${FE_STATUS})"
pass "Frontend reachable (status ${FE_STATUS})"

FE_VERSION_JSON=$(curl -sS -m "${TIMEOUT}" "${FE_URL}/version.json" || true)
if ! FE_BUILD_ID=$(printf '%s' "${FE_VERSION_JSON}" | jq -r '.build_id // .buildId // empty' 2>/dev/null); then
  FE_BUILD_ID=""
fi
if [[ -z "${FE_BUILD_ID}" ]]; then
  echo "⚠️  Frontend version.json missing build_id"
fi

BFF_HEALTH_STATUS=$(curl -sS -m "${TIMEOUT}" "${AUTH_ARGS[@]}" -o /dev/null -w '%{http_code}' "${BFF_URL}/health/ping") || true
[[ "${BFF_HEALTH_STATUS}" == "200" ]] || fail "/health/ping failed (status=${BFF_HEALTH_STATUS})"
pass "/health/ping OK"

DEEP_JSON=$(curl_json "${BFF_URL}/health/deep" || true)
if ! DEEP_OK=$(printf '%s' "${DEEP_JSON}" | jq -r '.ok // false' 2>/dev/null); then
  fail "/health/deep returned invalid JSON: ${DEEP_JSON}"
fi
[[ "${DEEP_OK}" == "true" ]] || fail "/health/deep failed: ${DEEP_JSON}"
pass "/health/deep OK"

STATUS_JSON=$(curl_json "${BFF_URL}/status/probe" || true)
if ! STATUS_OK=$(printf '%s' "${STATUS_JSON}" | jq -r '.playable // false' 2>/dev/null); then
  fail "/status/probe returned invalid JSON: ${STATUS_JSON}"
fi
BE_BUILD_ID=$(printf '%s' "${STATUS_JSON}" | jq -r '.version.backend.build_id // empty' 2>/dev/null || echo "")

if [[ -n "${FE_BUILD_ID}" && -n "${BE_BUILD_ID}" && "${FE_BUILD_ID}" != "${BE_BUILD_ID}" ]]; then
  echo "⚠️  build_id mismatch FE=${FE_BUILD_ID} BE=${BE_BUILD_ID}"
fi

[[ "${STATUS_OK}" == "true" ]] || fail "/status/probe indicates not playable: ${STATUS_JSON}"
pass "/status/probe playable"

CORS_CODE=$(curl -sS -m "${TIMEOUT}" -o /dev/null -w '%{http_code}' -X OPTIONS \
  -H "Origin: ${FE_URL}" \
  -H "Access-Control-Request-Method: POST" \
  "${BFF_URL}/chat/v1" || true)

if [[ "${CORS_CODE}" != "204" && "${CORS_CODE}" != "200" ]]; then
  fail "CORS preflight failed (status=${CORS_CODE})"
fi
pass "CORS preflight OK (status ${CORS_CODE})"

CHAT_JSON=$(curl -sS -m "${TIMEOUT}" "${AUTH_ARGS[@]}" -H "Content-Type: application/json" \
  -H "X-IZK-HEALTHCHECK: 1" \
  -d '{"text":"health-check"}' \
  "${BFF_URL}/chat/v1" || true)
if ! CHAT_REPLY=$(printf '%s' "${CHAT_JSON}" | jq -r '.reply // empty' 2>/dev/null); then
  fail "chat/v1 healthcheck returned invalid JSON: ${CHAT_JSON}"
fi
[[ -n "${CHAT_REPLY}" ]] || fail "chat/v1 healthcheck response invalid: ${CHAT_JSON}"
pass "chat/v1 healthcheck OK"

echo "=== All checks passed ==="
