# IZAKAYA verse – LINK CONTRACT
（フロント × BFF × ソウルコア × Wallet × Cloud）

## ✅ 目的
本ファイルは IZAKAYA システムの “連携仕様の唯一の真実（source of truth）” である。
以降の修正・開発は必ずこのファイルと照合し、破ってはならない。
人間・AI・Codex・他開発者が見ても理解できる形で固定する。

---

## ✅ PORT表（ローカル）
| システム | ポート | URL |
|----------|--------|-----|
| Mini BFF | 4117 | http://localhost:4117 |
| Preview UI (vite) | 5174 | http://localhost:5174/preview/ |

---

## ✅ Health Check（絶対ルール）
必ず `/health/ping` を使用すること。

✅ 正:
  GET http://localhost:4117/health/ping

❌ 禁止:
  `/health`
  `/api/health`
  任意ハードコード

理由:
  `/health` への誤アクセスが、過去に永続的な接続バグを発生させたため。

BFF は `/admin/info` を必須で提供し、`health_url` を宣言する。
UI は `/admin/info` → `health_url` 経由で接続を確定する（無い場合に限り `/health/ping` をフォールバック参照）。

---

## ✅ /chat API 仕様
POST /chat/v1
```

{
"query": "...",
"card_id": "...",
"temperature": 数値
}

```
レスポンス:
- reply: 文字列
- meta.provider
- meta.model
- meta.soul_core_paths
- meta.persona_path

---

## ✅ ソウルコア
- 読み込み先: apps/persona-engine/soul-core/*.md
- 1つでも欠落 → 500 を返し、UI側は「不完全起動警告」を出す

---

## ✅ ウォレット
- `/wallet/balance`   (GET)
- `/wallet/redeem`    (POST)
- `/wallet/consume`   (POST)
- IPN: `/paypal/ipn/notify`
すべて `X-IZK-UID` 必須。

---

## ✅ Cloud Run 対応
| 環境 | BFF BASE URL |
|------|---------------|
| ローカル | http://localhost:4117 |
| 本番 | https://izakaya-bff-c-preview-gq6f2n6yxa-an.a.run.app |

---

## ✅ 自己診断（自動テストが実行）
- `scripts/test/link-contract-test.sh` を実行すれば自動確認できる
- `apps/bff/mini/scripts/integrity-check.sh` を BFF 起動直後に実行し、主要 API が揃っているかを毎回ログ付きで確認する
- **テストが通らない場合、フロント／BFFどちらも修正してはならない**

---

更新日: 自動
作成者: Codex
---
