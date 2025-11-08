# IZAKAYAverse Online Playability Checklist

最終公開（Cloud Run / GitHub Pages）前に、必ず以下を実施して「ユーザーが開いて遊べる状態」を保証する。

## 1. ビルド整合
1. `npm run build`（`IZAKAYA-LITE-UI`）を実行して `docs/` を再生成。
2. `bash scripts/check_prod_build.sh` を通過させ、`.env.production` と `docs/` が最新であるログを保存。

## 2. バージョン配布
- フロントエンドは `scripts/generate_version.mjs` により `public/version.json` を生成し、ビルド後は `docs/version.json` として公開される。
- BFF は `BUILD_ID` / `BUILD_TIMESTAMP` / `PUBLIC_*_URL` を `/health/ping`, `/health/deep`, `/status/probe`, `/admin/info` で返却する。

## 3. プレイアビリティ自動検査
1. `cd IZAKAYA-verse-promo`
2. `bash scripts/check_playability.sh`（必要に応じて `FE_URL` / `BFF_URL` / `BFF_BEARER` を export）
3. 成功ログをリリース記録に貼り付ける。失敗したら `/health/deep` と `/status/probe` のレスポンスを添付して原因を共有するまでリリース禁止。

## 4. 合成監視API
- `/health/deep` : wallet / chat を内部ループバックで検証（`X-IZK-HEALTHCHECK` ヘッダは LLM へ課金しないショートカット）。
- `/status/probe` : Frontend 到達性・wallet・chat・build_id をまとめて JSON 返却し、`playable=true` であれば公開可能。

## 5. 運用ルール
- Cloud Run では `PUBLIC_UI_URL` と `PUBLIC_BFF_URL` を必ず設定。
- min-instances=1 と 5 分間隔のウォーマーを維持し、`/status/probe` 監視の結果を Slack などへ通知。
- リリース報告時は以下をセットで提出すること：
  - `scripts/check_prod_build.sh` 成功ログ
  - `scripts/check_playability.sh` 成功ログ
  - `docs/version.json` と `/admin/info` に表示される `build_id`
