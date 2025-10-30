# Mini BFF（正規バックエンド）

このリポジトリで使用する BFF は **`apps/bff/mini` ただ一つ** です。外部リポジトリからのコピーや複数バージョンの共存は禁止とします。

## 起動コマンド

```bash
cd apps/bff/mini
npm install
npm run dev   # 固定ポート: http://localhost:4117
```

## 必須事項

- `.env`（同ディレクトリ）で `PROVIDER` / 各 API キー / モデル名を設定します。
- Docker 版 BFF は廃止済みです。compose 経由で mini-bff を起動しないでください。
- すべてのフロントエンドは `http://localhost:4117` を経由します。
- ここで定義されていない BFF コード・テンプレートを新規に作成しないでください。

ウォレットやチャット API の仕様は `docs/` 配下の設計書を参照してください。
