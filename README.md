# IZAKAYA verse — Local Workspace

このディレクトリは **ローカル開発専用** のサンドボックスです。  
GitHub/Render/Cloud 側で迷子にならないよう、フロントエンドとバックエンドの配置を明確にしています。

> 📌 本番公開用のリポジトリではありません。  
> ここで整理した構造を GitHub へ移す際はコミット内容を精査してください。

---

## 📁 ディレクトリマップ

```
apps/
├── frontend/
│   ├── lite-ui-sample/         # 旧Lite UIサンプル（現在は未使用、参考のみ）
│   └── preview-ui/             # IZAKAYA Liteの現行UI（Vite/React）
└── bff/
    └── README.md               # Mini BFF (Express) の配置ガイド / 連携手順

docs/                           # 仕様・SATD・ワークフローなど公開可能な資料
scripts/                        # ローカル開発支援スクリプト群
RUNBOOK.md / SESSION_NOTES.md   # 手順と履歴
```

- `apps/frontend/lite-ui-sample` …… 旧 Lite UI のサンプルコード（現在は参考用途のみ）。
- `apps/frontend/preview-ui` …… 現行の IZAKAYA Lite UI。本番/検証はすべてこちらを使用。
- `apps/bff` …… Mini BFF (Express/CommonJS) を配置する場所。現在は README で外部レポジトリを案内しています。

---

## 🔄 重要パス宣言

| 区分                  | ルート                                       | 出力先 / 備考                                  |
|-----------------------|----------------------------------------------|-----------------------------------------------|
| Lite UI (Sample)      | `apps/frontend/lite-ui-sample`               | サンプル。スタックから除外。                 |
| Preview UI (本体)     | `apps/frontend/preview-ui`                   | `apps/frontend/preview-ui/dist`               |
| Mini BFF (REST API)   | `apps/bff/mini` *(外部レポジトリを配置)*     | `dist/` を想定。Docker/Render で起動予定。    |
| IPN サーバー (任意)   | `apps/ipn` *(必要時に追加)*                  | `node server.js` で起動。                     |

この表と同じ内容を GitHub README / RUNBOOK / CI の env にも必ず反映して下さい。

---

## 🛠 ローカルでの基本コマンド

```bash
# Preview UI（現行UI）
cd apps/frontend/preview-ui
npm install
npm run dev
npm run build # dist/ 出力（Docker/Nginx 用）

# Mini BFF (コード配置後に実行)
cd apps/bff/mini
npm install
npm run dev   # または npm start
```

> Mini BFF の実装は別リポジトリからコピーして `apps/bff/mini` に配置してください。  
> テンプレートや依存関係は `apps/bff/README.md` を参照。

---

## 🤖 チャット & ポイント遷移ルール（要約）

- `POST /chat/v1` … `prompt`, `cardId`, `temperature` を受け取り LLM へルーティング。  
  レスポンスには `reply` と `meta`（provider/model/elapsed/card）を含める。
- `GET /wallet/balance` … `X-IZK-UID` ヘッダ必須。残高と直近トランザクション20件を返す。
- `POST /wallet/redeem` … `amount_pt` と `tx_id` でポイント加算。冪等性チェックあり。
- `POST /wallet/consume` … `amount_pt`, `sku`, `idempotency_key`。残高不足時は 402。
- `POST /paypal/ipn/notify` … PayPal IPN を検証し、成功/失敗に関わらず台帳へ追記。

詳細は `docs/` 配下の仕様書および `RUNBOOK.md` を参照してください。

---

## 🌐 クラウド／CI への反映ヒント

1. **GitHub Pages**  
   - Actions で `FRONTEND_DIR=apps/frontend/lite-ui`、`OUTPUT_DIR=docs` を宣言。  
   - ビルド後に `docs/.nojekyll` を生成し、`upload-pages-artifact`→`deploy-pages` を実行。

2. **Render (Mini BFF)**  
   - Root Directory: `apps/bff/mini`  
   - Build Command: `npm ci`  
   - Start Command: `npm start`  
   - 環境変数：`PORT`（Render が自動注入）、`PROVIDER`、`PAYPAL_TX_ENDPOINT` など。

3. **IPN (任意)**  
   - Root Directory: `apps/ipn`  
   - Build Command: `npm ci`  
   - Start Command: `npm start`

---

## 📎 メモ

- ここは **ローカル構成のカンファレンスルーム**。GitHub に同期する場合は diff を必ず確認してから push してください。
- AI ブラウザ／他エージェントに指示を出す際は、本 README の「重要パス宣言」を引用すると誤解が減ります。
- Docker 化や GCP/AWS 連携は `infra/` を作成した上で別フェーズとして扱う想定です。
