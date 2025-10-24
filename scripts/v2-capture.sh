#!/usr/bin/env bash
set -euo pipefail

# 設定（必要なら上書き）
BASE_URL="${V2_BASE:-http://localhost:8787}"
LIST_CANDIDATES=("/api/v2/cards" "/v2/cards" "/api/cards" "/cards")

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/docs/v2/samples"
mkdir -p "$OUT_DIR"

echo "[v2-capture] Base: $BASE_URL"

# 一覧URLの自動決定
LIST_PATH=""
for p in "${LIST_CANDIDATES[@]}"; do
  if curl -fsS "$BASE_URL$p" >/dev/null; then LIST_PATH="$p"; break; fi
done
if [ -z "$LIST_PATH" ]; then
  echo "[v2-capture] 一覧URLが見つかりませんでした（候補: ${LIST_CANDIDATES[*]}）" >&2
  exit 1
fi
echo "[v2-capture] List: $LIST_PATH"

# 一覧の保存
curl -fsS "$BASE_URL$LIST_PATH" | tee "$OUT_DIR/cards_list.json" >/dev/null
echo "[v2-capture] wrote: $OUT_DIR/cards_list.json"

# Node で id を抽出（jq が無くても動くように）
IDS=$(node -e '
const fs=require("fs");
try{
  const raw = fs.readFileSync(process.argv[1], "utf8");
  const data = JSON.parse(raw);
  const arr = Array.isArray(data) ? data : (data.items||[]);
  const ids = arr.map(x=>x && x.id).filter(Boolean);
  console.log(ids.join("\n"));
}catch(e){ process.exit(1); }
' "$OUT_DIR/cards_list.json")

if [ -z "${IDS:-}" ]; then
  echo "[v2-capture] id が一覧から見つかりません（items[].id を想定）" >&2
  exit 0
fi

# 詳細の候補URL
detail_urls() {
  local id="$1"
  echo "/api/v2/cards/$id" "/v2/cards/$id" "/api/cards/$id" "/cards/$id"
}

for id in $IDS; do
  echo "[v2-capture] detail: $id"
  OK=0
  for u in $(detail_urls "$id"); do
    if curl -fsS "$BASE_URL$u" -o "$OUT_DIR/card_${id}.json"; then
      echo "  -> wrote: $OUT_DIR/card_${id}.json"
      OK=1; break
    fi
  done
  if [ "$OK" -ne 1 ]; then
    echo "  !! 詳細取得に失敗（保存スキップ）"
  fi
done

echo "[v2-capture] done."

