# 引き継ぎテンプレート（IZAKAYA Builder）

## 1. プロジェクト概要
- 目的:
- 主な構成（例）:
  - フロント（画面）: Vite/React
  - 裏（BFF）: Node（ts-node）
  - 仕様/資料: `IZAKAYA verse/` 以下

## 2. 起動・停止
- 起動: `scripts/start.sh`
- 停止: `scripts/stop.sh`
- 再起動: `scripts/restart.sh`
- 自動調整で起動: `scripts/start-lite.sh`

## 3. よく使うURL
- 画面: `http://localhost:5173/`（混雑時は `5174`）
- 裏: `http://localhost:8787/`

## 4. 環境変数
- `BFF_PORT` / `FRONTEND_PORT` / `CORS_ORIGIN`
- `.env` にあるキー一覧（値は伏せてOK）

## 5. ログと診断
- ログ: `logs/bff.*.log`, `logs/frontend.*.log`, `logs/stack.*.log`
- 診断: `scripts/diag.sh`

## 6. よくある問題と対処
- ポート衝突 → `scripts/stop.sh` → ダメなら `scripts/start-lite.sh`
- 依存の警告 → 実行に問題なければ無視可。必要なら `AUTO_INSTALL=1`

## 7. 進行状況
- 完了:
- 未完/要確認:
- 次の一手:

## 8. 参考リンク/資料
- 仕様: `IZAKAYA verse/...`
- メモ: `SESSION_NOTES.md`
- ランブック: `RUNBOOK.md`

