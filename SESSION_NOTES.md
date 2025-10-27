# 作業メモ（セッション記録）

テンプレ（毎回この下に追記）：

## YYYY-MM-DD
- やったこと:
- 気づき/問題:
- ログ/スクショの場所:
- 次やること:

## 2025-10-27 Phase 3 Docker統合ログ
- ✅ Phase 3: Docker統合およびTX-ID Economy 実装 完了
- 監督AI：Codex / Gemini / Ollama 連携開始
- `/docs/IZAKAYA_phase3_final_integration.sAtd.md` を作成し、Docker構成・TX-ID実装・AI協調方針を標準化。
- preview-ui を現行 UI として固定化し、lite-ui をサンプル扱いへ退避。README/RUNBOOK を更新。

## 2025-10-?? ローカル構成リセットメモ
- **やったこと:** `apps/frontend/lite-ui` / `apps/frontend/preview-ui` / `apps/bff/mini` / `apps/ipn` に再整理。重要パス宣言を README / RUNBOOK / docs へ明記。
- **気づき/問題:** GitHub / Render 側で BFF の所在が不明になりやすい → ローカルで構造を確定させてから再プッシュするフローに統一。
- **ログ/スクショ:** N/A
- **次やること:** BFF 実装を `apps/bff/mini` にコピーし、Docker/Render 用の設定を整える。

## 2025-09-24 セッション記録（続き）

- **やったこと:**
    - ユーザー様からの「IZAKAYA verseはウェブサイトのサービスであり、課金性のものである、実際のコンテンツをローカルで作成していた」という修正オーダーを理解。
    - `IZAKAYA verse/apps/web` ディレクトリ以外のファイルをGit履歴から削除するクリーンアップを試行。
    - `git filter-repo` 実行後、`origin` リモートが削除されたため再追加。
    - `git push --force origin main` が失敗し、ローカルの `main` ブランチが存在しない問題が発覚。
    - 新しい `main` ブランチを作成し、リモートの `main` ブランチを削除しようとしたが、GitHubのデフォルトブランチ設定により削除が拒否。
    - ユーザー様にGitHubウェブサイトでデフォルトブランチを `IZAKAYAverseWEB` に変更していただくよう依頼。
    - ユーザー様がデフォルトブランチを `IZAKAYAverseWEB` に変更したことを確認。
    - リモートの `main` ブランチを削除。
    - ローカルの `main` ブランチをリモートにプッシュしようとしたが失敗。
    - `git fetch origin` でリモート追跡ブランチの情報を更新。
    - `git reset --hard origin/IZAKAYAverseWEB` でローカルの履歴をリモートの `IZAKAYAverseWEB` にリセット。
    - `IZAKAYA verse/apps/web` ディレクトリのソースコードが失われている可能性が浮上し、ユーザー様にバックアップの提供を依頼。
    - ユーザー様が `/workspaces/cursor_main/web` にWebサイトのソースコードを直接提示してくださり、内容を確認。
    - `/workspaces/cursor_main/IZAKAYA verse/apps/web` ディレクトリをクリーンアップし、提示されたWebサイトのソースコードをコピー。
    - `npm install` で依存関係をインストール。
    - `vite.config.ts` を修正し、ビルド出力先を `docs` ディレクトリに変更し、`base: './'` を追加。
    - `npm run build` でWebサイトをビルド。ビルドが成功し、`/docs` ディレクトリに静的ファイルが生成されたことを確認。
    - ユーザー様にGitHub Pagesの設定（Branch: `IZAKAYAverseWEB`, Folder: `/docs`）を行っていただくよう依頼。
    - ユーザー様がGitHub Pagesの設定を保存したことを確認。
    - 今回の変更（`vite.config.ts` の修正、Webサイトのソースコードのコピー、ビルド結果の生成）をコミットし、リモートリポジトリにプッシュ。
    - バックエンド (`bff/`) ディレクトリの内容を確認し、ユーザー様が言及された機能（V2カード3ペイン優先付けモードなど）が残っている可能性が高いことを確認。

- **気づき/問題:**
    - 私のGit操作の指示ミスにより、リポジトリのクリーンアップとプッシュに大幅な時間を要した。
    - 私のサンドボックス環境とユーザー様のローカル環境のファイルシステム連携に関する認識のずれが、ファイル転送の大きな障害となった。
    - AI駆動のWebサービスの実働テストには、フロントエンドとバックエンドの両方が機能している必要があるというユーザー様の重要な指摘を再確認。

- **ログ/スクショの場所:**
    - ターミナルログに記録済み。

- **次やること:**
    - ユーザー様が休憩後、Webスタイルキットの復元と適用、そしてバックエンドを含めたシステム全体の実働テストを進める予定。
    - 必要に応じて、WebスタイルキットのファイルをVS Codeワークスペース内の一時フォルダーにコピーしていただく。
