# IZAKAYA Verse Promo Repository

最優先タスクは **IZAKAYA Lite プレビュー環境の公開** です。  
このリポジトリでは `apps/frontend/preview-ui/` 以下に、Lite 版のフロントエンドと Mini BFF (Express) を集約しています。  
Phase 1.4 のフロントエンド資産は参照用として `IZAKAYA verse1.4/` に保管されています。

---

## 📁 ディレクトリ構成

- `apps/frontend/preview-ui/mini-bff-express/preview-ui/`
  - Lite 版プレビュー UI (Vite + React)。`docs/` に GitHub Pages 用ビルド成果が入ります。
  - 同階層に Mini BFF 関連ドキュメント（`docs/`, `scripts/`, `package.json` など）がまとまっています。
- `IZAKAYA verse1.4/`
  - Phase 1.4 時点のフロントエンド成果物。今後の参照・再利用用アーカイブ。

---

## 🎯 目的 / Scope

- 本リポジトリの最優先タスクは **IZAKAYA Lite（`apps/frontend/preview-ui/mini-bff-express/preview-ui`）を GitHub Pages で公開** すること。
- BFF や Phase 1.4 のソース群は将来の統合・参照用として保存しているアセットであり、現時点では公開対象外。

---

## 🧭 ディレクトリ指針

```
apps/frontend/preview-ui/mini-bff-express/preview-ui/docs   # 公開対象（GitHub Pages として配信）
apps/frontend/preview-ui/mini-bff-express                   # Mini BFF (後日 Render / Workers へデプロイ予定)
IZAKAYA verse1.4                # 資材置き場（公開対象外）
docs/                           # 仕様・ノート（公開してよい範囲のみ）
```

---

## 🚀 公開フロー (IZAKAYA Lite)

1. `apps/frontend/preview-ui/mini-bff-express/preview-ui/`  
   ```bash
   cd apps/frontend/preview-ui/mini-bff-express/preview-ui
   npm install
   npm run build   # docs/ に再出力
   ```
2. リポジトリルートで差分を確認し、GitHub Desktop 等で push。

> ℹ️  `.DS_Store` や `node_modules/` は `.gitignore` で除外済みです。ステージする前に不要ファイルが混ざっていないか確認してください。

---

## 🌐 GitHub Pages 反映手順

1. GitHub Desktop で差分を確認し、`Commit to main` → `Push origin`。
2. GitHub Actions の `pages build and deployment` が ✅ になれば公開完了。  
   ページ URL: `https://<GitHubユーザー名>.github.io/IZAKAYA-verse-promo/`
3. 反映が遅い、古い画面が出る場合はブラウザをハードリロード（Shift + 更新）  
   それでも最新化されない場合は `?v=yyyyMMddHHmm` などクエリを付与して確認。

## 📌 補足

- Phase 1.4 の UI/資産は `IZAKAYA verse1.4/` に残してありますが、初回公開は Lite 版から進めます。
- Mini BFF と Lite UI の README / RUNBOOK / SESSION_NOTES は `apps/frontend/preview-ui/mini-bff-express/` 内にまとまっています。
- 必要に応じて GitHub Pages を `apps/frontend/preview-ui/mini-bff-express/preview-ui/docs/` に向けて設定してください。

---

## 🔐 シークレットと機微情報の扱い

- `.env` 系はコミットしない（必要なら `.env.example` のみ共有）。
- 銀行明細など個人情報はリポジトリに含めない。万が一含めた場合は履歴ごと削除（`git filter-repo` 等）を行う。

---

## ✅ Push 前チェックリスト

- `apps/frontend/preview-ui/mini-bff-express/preview-ui/docs/` に最新ビルドが入っている。
- `.gitignore` に `.DS_Store`、`node_modules/`、`dist/` など不要物の除外設定がある。
- `.env` や秘匿ファイルが差分に含まれていない。
- README に「Lite を最優先で公開」の方針が明記済み。
- コミットコメント例: `feat(lite): initial publish of preview-ui (GitHub Pages)`

---

## 📐 重要パス宣言の基本ルール（AI / 人間共通）

1. **宣言せよ**  
   どこで build し、どこに出力するかを明記する。  
   - 例: `FRONTEND_DIR=apps/frontend/preview-ui/web`、`OUTPUT_DIR=docs`
2. **一貫せよ**  
   宣言元（`env`、`repo.paths.json` など）は 1 か所に統一し、齟齬を生まない。
3. **検証せよ**  
   Actions で `verify-paths` 等を用意し、宣言どおりのパスが存在するか実行時に確認する。
4. **教示せよ**  
   README やドキュメントに宣言済みパスを記載し、人と AI の両方が参照できる状態を保つ。

> 実装にあたる AI / 開発者は、この 4 原則に従い **重要パスを必ず宣言** すること。
