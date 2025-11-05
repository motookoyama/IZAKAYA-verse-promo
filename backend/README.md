# Mini BFF (apps/bff/mini)

IZAKAYA verse で使用する**唯一の正規 BFF**。Express 製で、Persona Engine 連携・ポイント台帳・LLM ルーティングを担います。

## ローカル起動
```bash
cd apps/bff/mini
npm install
npm run dev   # ポートは固定で 4117
```

環境変数:
- `PORT` (default: `4117`)
- `PERSONA_ENGINE_URL` … Persona Engine のエンドポイント
- `TX_STORE_DIR` … ポイント残高ファイルを格納するディレクトリ（既定: `<repo>/data`）
- `TX_STORE` … 残高ファイルのパス（既定: `<TX_STORE_DIR>/tx_store.json`）
- `TX_HISTORY_LIMIT` … 保存する履歴上限（既定: 200）
- `TX_HISTORY_RESPONSE_LIMIT` … レスポンスに含める履歴件数（既定: 20）
- `PROVIDER` … `openai` / `gemini` / `ollama`
- 各種 API キー / エンドポイント … `.env` を参照

## API
- `GET /api/health`
- `GET /api/personas`
- `GET /api/personas/:id`
- `GET /api/emotion`
- `GET /wallet/balance` … `X-IZK-UID` ヘッダー必須。残高と直近取引を返す。
- `POST /wallet/redeem` … `amount_pt`, `tx_id` でポイント加算（冪等チェック付）。
- `POST /wallet/consume` … `amount_pt`, `sku`, `idempotency_key` でポイント消費（残高不足は 402）。
- `GET /admin/provider` … 現在の LLM プロバイダ設定を取得。
- `POST /admin/login` … 管理パスワードを検証。
- `POST /admin/provider` … プロバイダ／モデル／API キーを保存。
- `POST /admin/password` … 管理パスワードを変更。
- `GET /health/ping` … HeartBeat 用エンドポイント（provider/model/endpoint を返す）。
- `POST /chat/v1` … `.env` の設定に基づいて LLM を呼び出し、provider / model / endpoint を meta に含めて返す。

> `tx_id` は `TX-YYYYMMDD-XXXXXX` 形式、`idempotency_key` は 6〜128 文字の英数 `_` `-` を想定。

`apps/bff/mini/.env` を正とし、ここで provider / model / endpoint / API キーを管理します。Docker 版 BFF は廃止済みのため、他ディレクトリの BFF コードや別ポートでの起動は禁止です。
