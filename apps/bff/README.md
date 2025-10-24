# Mini BFF (Express/CommonJS)

- ここには IZAKAYA Lite 向けの Mini BFF (Express) を配置します。
- 元レポジトリ: `IZAKAYA verse/izakaya_lite/mini-bff-express`。
- `apps/bff/mini` 配下に `package.json`, `src/`, `tsconfig.json` などをコピーしてください。
- 起動コマンド例:
  ```bash
  npm install
  npm run dev    # ts-node-dev / nodemon 推奨
  npm run build  # tsc -p tsconfig.json
  npm start      # node dist/index.js
  ```
- Render や Docker で利用する際は `.env.example` に以下を含めてください。
  ```
  PROVIDER=mock|openai|gemini
  PORT=4117
  DATA_DIR=./data
  PAYPAL_TX_ENDPOINT=https://ipnpb.sandbox.paypal.com/cgi-bin/webscr
  ```
- ウォレットやチャットの API 契約は `docs/` 直下の仕様書を参照。
