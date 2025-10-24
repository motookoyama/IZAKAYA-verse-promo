# PayPal IPN サーバー

Render や Docker で IPN をテストする場合は、ここに `server.js` / `package.json` を配置します。

参考実装は GitHub の `apps/ipn` を参照してください。
- `npm start` で `server.js` を実行
- `PAYPAL_TX_ENDPOINT` や `LEDGER_PATH` などの環境変数を `.env-example` にまとめてください
