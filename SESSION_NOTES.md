# 作業メモ（セッション記録）

テンプレ（毎回この下に追記）：

## YYYY-MM-DD
- やったこと:
- 気づき/問題:
- ログ/スクショの場所:
- 次やること:

## 2025-10-29 ENV初期化恒久ルール
- やったこと: Mini BFF (`apps/bff/mini/server.js`) 起動時ログを追加し、`.env` が全く読み込まれていない事実を確認。原因は `dotenv.config()` が存在しない設計抜けであり、人的操作ミスではないと確定。
- 気づき/問題: `process.env.PROVIDER` などを参照するコードが dotenv 初期化より前に書かれていたため、BFF が常に `PROVIDER is not set` 状態になっていた。リポジトリ全体を検索したところ `dotenv` を初期化している箇所はゼロ。
- ログ/スクショ: `npm run dev` 実行時の `[DEBUG-ENV] { PROVIDER: undefined, ... }`。IDE検索結果 (`rg "dotenv"`) でヒットなし。
- 次やること: すべての BFF エントリーファイルに `import dotenv from "dotenv"; dotenv.config();` を最上部で必ず挿入すること。Codex には「dotenv 初期化を確認し、欠落していれば自動挿入する」という命令書を配布済み。今後 `.env` 依存コードを生成する前にこのルールを必ず検証する。

## 2025-10-29 Root Cause Policy
- やったこと: 「同じ障害が複数回発生したときは対処療法を禁止し、設計ミスや初期化欠落など根本原因を最優先で疑う」ポリシーを策定。
- 気づき/問題: 同一問題に対して毎回 config やパッチで応急処置をする方針では、今回の dotenv 重複障害のように根本的な設計抜けが残り続ける。
- ログ/スクショ: N/A（運用ルールの明文化）
- 次やること: Codex ほか開発 AI 全員に対し、以下のコマンドを常設指示として配布すること。

  ```
  【再発防止ルール】
  同一問題が繰り返し発生した際は、
  対処療法（config修正やパッチ）を提案してはならない。
  root cause を疑い、以下を優先して調査する：
  1. 設計の欠落
  2. 初期化の欠落
  3. 「前提となるコードが存在しない」ケース
  4. ロジックが到達不能なまま書かれているケース
  明確に原因を突き止めるまで、安易な修正案を出さないこと。
  ```

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

---

## 2025-11-05 再生計画メモ（IZAKAYA Lite & Verse1.4）

- **現行プレビュー環境**
    - `IZAKAYA-LITE-UI`：ウォレット消費ロジックを実装済み。チャット送信成功時に `/wallet/consume` を呼び、ユーザーは1回10pt（カード別設定）を減算。`admin` は課金対象外。
    - GitHub Pages は `docs/` を公開し、Vite `base: '/'` で Cloud Run/Nginx も同一構成に。
    - Dockerfile は `/app/docs` を nginx にコピー。Cloud Run にデプロイ済みの BFF（Mini-BFF）と接続。

- **日次リセット仕様**
    - 一般ユーザー：毎日 100pt（デフォルト10レス相当）に自動リセット。
    - 管理者 `admin`：毎日 10,000pt。

- **資産バックアップ**
    - `izakaya-verse/IZAKAYA verse1.4/web` にフロントエンドのレイアウト一式（Home, Play, Library など）とビルド成果物が残存。
    - 今後 1.4 UI を復活させる際は、このフォルダを Vite プロジェクトとして `npm install` → `npm run dev` で再利用可能。Mini-BFF と API パスが合えば即接続できる。

- **復帰時の着手順**
    1. `IZAKAYA-LITE-UI` の `npm run build` → GitHub Pages / Cloud Run を確認（白画面対策済み）。
    2. 利用状況ログ（ポイント消費・課金導線）を監視し、反応に応じて価格や無料枠を調整。
    3. 1.4 UI を再構築する場合は `web/` ディレクトリからモジュール・コンポーネントを移植し、Mini-BFF の API エンドポイントを合わせる。

- **TODO（次フェーズ）**
    - 画像生成など他 SKU の消費トリガー追加。
    - 残ポイントが不足した際の UI フロー（課金導線）整備。
    - 必要なら `docs` を Cloud Run と GitHub Pages で共通利用する GitHub Actions を導入（`/.github/workflows/pages.yml` にひな形を保存済み）。
