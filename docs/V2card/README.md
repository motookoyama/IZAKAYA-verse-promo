# V2 Card Editor (Standalone)

目的: BFF の V2 カード（name / icon / prompt）を「一覧→選択→編集→保存」できる最小の編集ツール。

- 実行方法: ブラウザで `docs/V2card/index.html` を開く（ローカルファイルのままでOK）
- 接続先: 画面右上の `Base URL` に BFF のアドレスを入力（例: `http://localhost:8787`）
- 一覧取得: `Find & Load` を押すと候補URLから自動検出（`/api/v2/cards`, `/v2/cards`, `/api/cards`, `/cards`）
- 詳細取得: 一覧の id を選ぶと候補URL（`.../cards/{id}`）から詳細を取得
- 保存: `Save` は `PUT .../cards/{id}` を試行 → 失敗時は `POST .../cards` を試行（CORS有効が必要）
- インポート/エクスポート: JSONを読み込み/保存（ローカルファイル）

注意
- CORS: BFF で `http://localhost` からのアクセスを許可してください（`CORS_ORIGIN` など）
- 仕様: 正式な一覧/詳細URLやキー名が確定したら `docs/v2/V2_SPEC.md` を更新してください

