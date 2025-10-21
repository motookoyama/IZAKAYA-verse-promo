#!/usr/bin/env bash
set -euo pipefail

# Sanity checks for IZAKAYA Verse BFF + providers
# - Health
# - Models for current provider
# - Minimal chat request

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

BFF_PORT="${PORT:-8787}"
BFF_URL="http://localhost:${BFF_PORT}"
PROVIDER="${PROVIDER:-ollama}"
TIMEOUT_HEALTH="${SANITY_TIMEOUT_HEALTH:-5}"
TIMEOUT_MODELS="${SANITY_TIMEOUT_MODELS:-10}"
TIMEOUT_CHAT="${SANITY_TIMEOUT_CHAT:-90}"
TEMP="${SANITY_TEMPERATURE:-0.2}"
MAXTOK="${SANITY_MAX_TOKENS:-256}"

color() { local c="$1"; shift; printf "\033[${c}m%s\033[0m\n" "$*"; }
ok()    { color 32 "$*"; }
warn()  { color 33 "$*"; }
err()   { color 31 "$*"; }
info()  { color 36 "$*"; }

dash()  { printf "\n%s\n" "----------------------------------------"; }

pick_model() {
  case "$PROVIDER" in
    ollama)    echo "${OLLAMA_MODEL:-qwen3:4b}" ;;
    lmstudio)  echo "${LMSTUDIO_MODEL:-qwen2.5:3b}" ;;
    openai)    echo "${OPENAI_MODEL:-gpt-4o-mini}" ;;
    openrouter)echo "${OPENROUTER_MODEL:-openrouter/auto}" ;;
    gemini)    echo "${GEMINI_MODEL:-gemini-1.5-flash}" ;;
    *)         echo "qwen3:4b" ;;
  esac
}

HTTP() {
  # Usage: HTTP GET|POST url body timeout
  local method="$1" url="$2" body="${3:-}" to="${4:-10}"
  if [[ "$method" == "GET" ]]; then
    curl -sS -m "$to" -D - "$url" \
      -H 'accept: application/json' \
      -o /tmp/sanity_body.$$ || true
  else
    curl -sS -m "$to" -D - "$url" \
      -H 'content-type: application/json' \
      -H 'accept: application/json' \
      --data "$body" \
      -o /tmp/sanity_body.$$ || true
  fi
}

show_status() {
  local status line
  status=$(awk 'NR==1{print $2}' /tmp/sanity_headers.$$ 2>/dev/null || echo "")
  if [[ -z "$status" ]]; then
    err "HTTP status: (none)"
  else
    if [[ "$status" =~ ^2 ]]; then ok "HTTP $status"; else err "HTTP $status"; fi
  fi
}

request() {
  local method="$1" url="$2" body="${3:-}" to="${4:-10}"
  HTTP "$method" "$url" "$body" "$to" | tee /tmp/sanity_headers.$$ >/dev/null
  show_status
  echo "--- body ---"
  sed -n '1,200p' /tmp/sanity_body.$$ | sed 's/^/  /'
}

dash; info "BFF: $BFF_URL  PROVIDER: $PROVIDER"

dash; info "[1/3] Health"
request GET "$BFF_URL/api/health" "" "$TIMEOUT_HEALTH"

dash; info "[2/3] Models ($PROVIDER)"
request GET "$BFF_URL/api/models?provider=$PROVIDER" "" "$TIMEOUT_MODELS"

MODEL="$(pick_model)"
dash; info "[3/3] Chat ($PROVIDER / $MODEL)"
BODY=$(cat <<JSON
{
  "provider":"$PROVIDER",
  "model":"$MODEL",
  "temperature": $TEMP,
  "max_tokens": $MAXTOK,
  "messages":[{"role":"user","content":"テストです。1文で自己紹介してください。"}]
}
JSON
)
request POST "$BFF_URL/v1/chat/completions" "$BODY" "$TIMEOUT_CHAT"

dash; ok "Sanity checks completed."
