# IZAKAYA verse – FRONT ↔ BFF 仕様 (source of truth)

## ✅ 目的
フロントエンドと BFF の仕様の唯一の真実ファイル。
以降の開発では、本ファイルと一致しない実装を行ってはならない。
修正・追加時は必ずこのファイルを更新し、合意を明確にする。

---

## ✅ 接続とポート
- BFF ローカルポート: `4117`
- フロント開発モードポート: `5174`（Vite `strictPort: true` / 逃げ禁止）
- フロント表示用 URL:
  - `http://localhost:5174/preview/`

---

## ✅ Health Check
必ず `/health/ping` を使用すること。

**禁止**:
- `/health`
- `/api/health`
- バックエンドの仕様変更に追従しないハードコード

フロントは `BFF_ENDPOINT + "/health/ping"` で取得する。
BFF は `/admin/info` を提供し `health_url` を宣言する。
UI の生存確認は静的ファイル `public/ui-alive.json` を参照する。

---

## ✅ /chat エンドポイント
- URL: `/chat/v1`
- method: POST
- request:
```json
{
  "prompt": "ユーザー入力（必須）",
  "query": "旧互換",
  "text": "旧互換",
  "cardId": "アクティブカードID",
  "temperature": 0.0〜1.0,
  "persona": { ...V2カードJSON... } // 任意 (提供推奨)
}
```
- response:
  - reply (string)
  - meta.provider / meta.model / meta.endpoint
  - meta.soul_core_paths (array)
  - meta.persona_path (string|null)
  - meta.persona_source (string|null)
  - meta.persona_payload (object|null)


## ✅ V2カード + 人格反映
- フロントはアクティブな V2カードの JSON を `persona` フィールドに載せて `/chat/v1` へ送ること
- BFF は `persona` を受け取り、存在する場合はソウルコアと合わせてシステムプロンプトに組み込む
- `persona` が無い場合のみ `loadPersona(cardId)` で既存の persona.json を利用する
- レスポンスの `meta.persona_payload` に実際に使用した JSON を返し、デバッグとトレーサビリティを担保する
- キャラクターは V2カードの `persona` / `system_behavior` を最優先で反映し、AI口調を禁止とする

---

## ✅ Wallet API
- ストアファイル: `apps/bff/mini/data/wallet.json` （存在しない場合は自動生成）
- `GET /wallet/balance`
  - Header: `X-IZK-UID`
  - Response: `{ "userId", "balance", "resetAt", "dailyAllowance" }`
- `POST /wallet/consume`
  - Body: `{ amount: number, sku?, idempotency_key? }`
  - 200で新しい残高を返す。残高不足は 402。
- `POST /wallet/grant`
  - Header: `X-IZK-UID: admin`
  - Body: `{ userId, amount, transactionId? }`
  - 200で残高を返す。`transactionId` 重複は 409。
- `POST /wallet/redeem` は互換用。`amount` を加算し、内部で `grant` と同等に処理する。
- すべてのレスポンスは `unit: "pt"` を含み、失敗時はエラーログを BFF が出力する。

---
## ✅ ソウルコア
- BFF 起動時に自動ロード
- 対象ディレクトリ: `apps/persona-engine/soul-core/*.md`
- UI が直接指定・操作しない
- BFF はローカルとクラウドの両方で同一動作

---

## ✅ UI の実装ルール
✅ フロントは `/health/ping` と `/chat/v1` を唯一の正解として扱う  
✅ BFF 停止時は、アラートではなく画面上のバナーで自動再接続  
✅ UI 側で `/health` をハードコードしてはならない  
✅ BFF_ENDPOINT は UI 内の `const BFF_ENDPOINT` に一本化し、分散させない  

---

## ✅ 自己チェック手順（開発者・AI共通）
修正時は必ず以下を実行すること：

1. `curl http://localhost:4117/health/ping` → OK が返ること
2. `curl http://localhost:4117/chat/v1` → 200 が返ること
3. `npm run dev`（preview-ui） → `/preview/`が表示されること
4. UI 上で `Chat送信` → 実プロバイダ応答が返ること

これらを満たさない状態で push してはならない。

---

## ✅ 違反した場合の扱い
- 修正作業は必ずこのファイルと照合
- フロント・BFF側がどちらかに偏って変更されていたら即修正
- 仕様変更が必要な場合は、まずこのファイルを書き換える

---

更新日: 2025-10-30
作成者: Codex
---
