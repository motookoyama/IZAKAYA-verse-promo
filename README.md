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
│   └── preview-ui/             # IZAKAYA Lite の現行UI（Vite/React）
└── bff/
    └── mini/                   # 正規 Mini BFF (Express) ※唯一のバックエンド

docs/                           # 仕様・SATD・ワークフローなど公開可能な資料
scripts/                        # ローカル開発支援スクリプト群
RUNBOOK.md / SESSION_NOTES.md   # 手順と履歴
```

- `apps/frontend/lite-ui-sample` …… 旧 Lite UI のサンプルコード（現在は参考用途のみ）。
- `apps/frontend/preview-ui` …… 現行の IZAKAYA Lite UI。本番/検証はすべてこちらを使用。
- `apps/bff/mini` …… **正規かつ唯一の BFF**。このフォルダ以外に BFF は存在しません。

---

## 🔄 重要パス宣言

| 区分                  | ルート                                       | 出力先 / 備考                                  |
|-----------------------|----------------------------------------------|-----------------------------------------------|
| Lite UI (Sample)      | `apps/frontend/lite-ui-sample`               | サンプル。スタックから除外。                 |
| Preview UI (本体)     | `apps/frontend/preview-ui`                   | `apps/frontend/preview-ui/dist`               |
| Mini BFF (REST API)   | `apps/bff/mini`                              | **唯一の正規 BFF。常に PORT=4117 で起動。**   |
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

# Mini BFF（正規バックエンド）
cd apps/bff/mini
npm install
npm run dev   # 固定ポート: http://localhost:4117
```

> Mini BFF はこのリポジトリ内の `apps/bff/mini` のみを使用します。  
> これ以外の BFF を生成・参照・起動しないでください。

### PayPal IPN とウォレット

Mini BFF には `/paypal/ipn/notify` が統合されており、PayPal からの IPN 通知を受け取ると自動的に `/wallet/redeem` を実行してポイントを加算します。

ローカルでのテスト手順:

```bash
# 1. 依存サービスを起動
scripts/start_local.sh

# 2. ダミー IPN を送信
curl -X POST http://localhost:4117/paypal/ipn/notify \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data 'payment_status=Completed&custom={"uid":"preview-ui","points":50}&txn_id=PAYPAL12345'

# 3. 残高を確認
curl -H "X-IZK-UID: preview-ui" http://localhost:4117/wallet/balance
```

本番環境では PayPal の IPN URL を `https://izakaya-bff-c-preview-gq6f2n6yxa-an.a.run.app/paypal/ipn/notify` に設定してください。必要に応じて `PAYPAL_VERIFY_URL` を環境変数で差し替えることで、sandbox ドメインにも対応できます。

---

## 🧹 Dockerリセット手順

過去のコンテナが残っていると最新のコードを読み込めないため、**バージョン更新前や環境の不調を感じた時は必ずリセットを実行**してください。なお、Compose スタックには BFF を含めません。BFF は常に `apps/bff/mini` から手動で起動します。

```bash
chmod +x scripts/docker_reset.sh   # 初回のみ
./scripts/docker_reset.sh
```

このスクリプトは以下を一括で実行します:

1. `docker compose down --remove-orphans`
2. `docker compose build --no-cache`
3. `docker compose up -d`
4. `docker compose ps` で状態確認

Docker Desktop に停止済みコンテナが表示されたままでも、この手順を踏めば最新スタックだけが動作します。

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
   - Actions で `FRONTEND_DIR=apps/frontend/preview-ui`、`OUTPUT_DIR=docs` を宣言。  
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
