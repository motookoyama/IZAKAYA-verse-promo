# IZAKAYA BFF Integrity Checker

このディレクトリにある `integrity-check.sh` は、Mini BFF を再起動するたびに実行することを推奨する CLI ドリブン検査ツールです。人間が手動で curl を繰り返す代わりに、主要エンドポイントの整合性を自動検証し、結果をログとして残します。

## 実行手順

```bash
cd /Users/nohonx/Documents/GitHub/IZAKAYA-verse-promo/apps/bff/mini/scripts
./integrity-check.sh
```

実行すると `apps/bff/mini/logs/integrity/` 配下に `check_YYYY-MM-DD_HH-MM-SS.log` が作成され、各エンドポイントの PASS/FAIL が記録されます。失敗時はレスポンス本文もログに書き出すため、原因切り分けに利用できます。

## チェック対象

- `GET /health/ping`
- `GET /admin/info`
- `GET /admin/ui-alive`
- `GET /points/list`
- `GET /points/config`
- `GET /soul-core/debug`

これらのエンドポイントが 200 を返すことを確認できれば、UI からのヘルス判定／ポイント管理／ソウルコア読み込みが整合していると判断できます。新しい機能を追加した際は、同様のチェックをこのスクリプトに追加していってください。
