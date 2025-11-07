# IZAKAYA Builder Runbook

目的: このプロジェクトを「迷わず起動・停止・再開」できるようにするための短い手順書。

## ディレクトリ概況（2025-10 整理）
- フロントエンド: `apps/frontend/preview-ui`（現行 UI）／`apps/frontend/lite-ui-sample`（サンプルのみ）
- Mini BFF: `apps/bff/mini`（唯一の正規 BFF / PORT=4117 固定）
- IPN サーバー: `apps/ipn`（必要時に追加）

> ⚠️ 2025-10-29 アップデート: BFF は `apps/bff/mini` のみを使用し、ポートは常に `http://localhost:4117`。Docker 版 BFF や旧 scripts によるポート切替は廃止しました。以下のレガシースクリプトを利用する場合は、BFF を別途 `npm run dev` で起動していることを前提に読み替えてください。

## よく使うコマンド
- 起動: `scripts/start.sh`
- 停止: `scripts/stop.sh`
- 再起動: `scripts/restart.sh`
- 起動補助（自動で空いている番号に合わせる）: `scripts/start-lite.sh`
- 状態確認（ポート/ログ/環境）: `scripts/diag.sh`

## V2仕様（唯一の正）
- 仕様ファイル: `docs/V2_foundation_master_unified.sAtd.json`（version 0.09）
- 入力: PNG(tEXt/iTXt/zTXt) / JSON / .sAtd を受け入れ、仕様の正規化順に従って表示・保存します。

## クラウド（Codespaces / Dev Container）
- 使い方: GitHubへプッシュ → 「Code > Create codespace on main」
- 起動: コンテナ作成後、自動で `npm ci` → `scripts/start.sh` を実行
- 参照URL: Codespacesのポートタブに `5173`（画面）と `8787`（裏）が出ます
- 変数: `.env.example` を参考に Codespaces の「Secrets」にも同じ鍵名で登録可

## 起動の基本
1) 停止してクリーンにする: `scripts/stop.sh`
2) 起動する: `scripts/start.sh`
3) 画面を開く: `http://localhost:5173/`（必要なら `5174`）
4) 裏の確認（任意）: `http://localhost:8787/`

## ポートがふさがっている時
- まず停止: `scripts/stop.sh`
- それでも空かない時（最小限）:
  - 画面側: `kill -9 $(lsof -ti :5173) 2>/dev/null || true`
  - 裏側: `kill -9 $(lsof -ti :8787) 2>/dev/null || true`
- 迷ったら自動調整で起動: `scripts/start-lite.sh`

## 番号を変えて起動したい時（手動）
- 例: 画面を5174、裏を8788で起動し、つなぎ先も合わせる
- コマンド: `BFF_PORT=8788 FRONTEND_PORT=5174 CORS_ORIGIN=http://localhost:5174 scripts/start.sh`

## 困ったときの確認
- 状態まとめを見る: `scripts/diag.sh`
- ログを見る（終わり200行）:
  - 画面: `tail -n 200 logs/frontend.*.log`
  - 裏: `tail -n 200 logs/bff.*.log`

## よくあるつまずき
- 起動時に「ポート使用中」→ `scripts/stop.sh` → ダメなら `scripts/start-lite.sh`
- 依存が足りないと表示される → 実行に問題なければ無視してOK。気になる場合は `AUTO_INSTALL=1 scripts/start.sh`

## Dockerリセット（必須手順）
Docker の旧コンテナが残っていると最新コードで動かなくなるため、**作業を再開するとき・バージョンを切り替えるときは必ずリセットを実施**してください。

```bash
chmod +x scripts/docker_reset.sh   # 初回のみ
./scripts/docker_reset.sh
```

このラッパーは以下を自動で行います:
- `docker compose down --remove-orphans`
- `docker compose build --no-cache`
- `docker compose up -d`
- `docker compose ps` で状態確認

> 旧コンテナの“幽霊”が残っていると、BFF や UI が古いまま応答し続ける原因になります。必ずこの手順を踏んでから作業してください。

## 環境変数（値は例）
- `BFF_PORT`: 裏の番号（既定: `8787`）
- `FRONTEND_PORT`: 画面の番号（既定: `5173`）
- `CORS_ORIGIN`: 画面のURL（例: `http://localhost:5173`）
- `AUTO_INSTALL`: 起動前に依存導入（`1`で有効）
- `AUTO_KILL`: 番号がふさがっていたら自動で止めてから起動（`1`で有効）
- `STOP_FIRST`: 起動前に停止を必ず実行（`1`で有効）

## 再開の手順（セッションが途切れた後）
1) この `RUNBOOK.md` を開く
2) `scripts/diag.sh` で状況を見る
3) `scripts/stop.sh` を実行
4) `scripts/start.sh` か `scripts/start-lite.sh` で起動
5) 画面/裏を開いて確認

## 変更メモの場所
- 日々の記録: `SESSION_NOTES.md`
- 引き継ぎ用テンプレ: `docs/HANDOVER_TEMPLATE.md`

## 本番配信チェック（2025-11 緊急事案を踏まえた必須工程）
2025-11 に、`docs/`（Vite 本番ビルド成果物）が再生成されないまま Cloud Run / GitHub Pages へ反映され、公開 UI が **完全な白画面** になる重大障害が発生した。  
ローカル開発 (`npm run dev`) では正常でも、オンライン配信物が更新されなければユーザーにコンテンツが提供されない。この事象を二度と起こさないため、以下をリリース工程に必ず組み込む。

1. `.env.production` を最新値に揃える（BFF URL 等を必ず確認）。
2. `npm run build` を実行し、`docs/` に生成物が書き出されたことを確認（タイムスタンプ／git diff でチェック）。
3. `git status` で `docs/` と `.env.production` の差分を確認し、忘れずにコミット＆プッシュ。
4. Cloud Run / GitHub Pages へ反映後、**公開 URL で実際に画面が表示されるか**をブラウザで確認。
5. `scripts/check_prod_build.sh` などの自動チェックが警告を出した場合は、ビルドからやり直して解消するまでデプロイ禁止。

> ⚠️ 「ローカルでは見えた」だけでは不十分。`docs/` が最新であることを証明しない限りリリース完了とみなさない。
