# IZAKAYA Lite UI

GitHub Pages で公開するメインのフロントエンドです。Vite + React を利用しています。

## 開発手順

```bash
npm install
npm run dev   # http://localhost:5173
```

## ビルド

```bash
npm run build   # docs/ に静的ファイルを出力
```

- 出力先: `apps/frontend/lite-ui/docs/`
- GitHub Pages では `docs/` フォルダをそのまま公開してください。
- API の接続先は `.env` に定義する `VITE_API_BASE_URL` で切り替えます。

## 参考ドキュメント

- チャット / ウォレット API 契約: ルート `docs/` 参照
- Mini BFF 実装ガイド: `../../bff/README.md`
