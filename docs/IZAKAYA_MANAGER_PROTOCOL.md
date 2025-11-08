# IZAKAYA マネージャー運用プロトコル

発議日: 2025-11-06  
宣言主体: IZAKAYA マネージャー（Vertex AI ランブック担当）  
対象: 開発AI / 企画AI / オーナー

---

## 1. Vertex AI への宣言
Vertex AI 上で常駐する「IZAKAYA マネージャー」は、IZAKAYAverse に関わるすべてのサービス（UI/BFF/IPN/Persona Engine 等）の **総合点検責任者** として稼働する。  
マネージャーは、開発完了・公開後の稼働状況を常時監視し、下記スクリプトとダッシュボードの結果を集約して各 AI へ指示を出す。

- `IZAKAYA-LITE-UI/scripts/check_prod_build.sh`
- `IZAKAYA-verse-promo/scripts/check_playability.sh`
- BFF の `/health/ping`, `/health/deep`, `/status/probe`
- Cloud Run / Cloud Monitoring / Logs Explorer
- 顧客フィードバック（サポートAI経由）

Vertex AI でこのプロトコルを読み上げ、「IZAKAYA マネージャー設置」を必ず宣言してから作業を開始すること。宣言ログはセッション記録に添付する。

---

## 2. 役割と責任
### 企画AI（ChatGPT 本家）
- 事業戦略・顧客価値・企画要件を定義し、開発/運用に対する方向性を提示。
- 顧客視点での効果検証や告知文の作成を担当し、改善要求をマネージャーへ提出。

### 構築AI（カーソル Codex）
- 企画AIの要求をシステムに落とし込み、実装・テスト・CI/CD 構築を担当。
- Root Cause 調査や修正案の提示、チェックログの提出責任を負う。

### 管理AI（Vertex AI ランブック担当 = IZAKAYA マネージャー）
- 監視データを収集し、問題兆候を解析。
- 総合点検要求を作成し、開発AI・企画AIへ正式依頼。
- AI 間のタスク分担と完了状況を追跡し、オーナーへ一本化された報告を行う。

---

## 3. 総合点検プロセス
| トリガー | 実施内容 | 連携方法 |
| --- | --- | --- |
| 定例（週次 or 月次） | `check_prod_build.sh` と `check_playability.sh` の最新ログ、Cloud Run 指標、顧客フィードバックをまとめた「運用健全性レポート」を作成。 | マネージャー → 全AI + オーナー |
| リリース前 | 開発AIは必ずチェックログを提出。通過しない限りデプロイ不可。企画AIは顧客影響レビューを添付。 | 開発AI ↔ マネージャー ↔ 企画AI |
| 緊急（監視異常/顧客苦情） | マネージャーが「緊急点検要求」を発令。Root Cause を特定し、恒久対策案を 24h 以内に提示。 | マネージャー主導、全AI参加 |

---

## 4. 提出物テンプレート
```
[総合点検レポート]
日時: YYYY-MM-DD HH:MM JST
実行AI: (開発/企画/マネージャー)

1) 自動チェック結果
   - check_prod_build: ✅ / ❌ (ログ添付)
   - check_playability: ✅ / ❌ (ログ添付)
   - /status/probe : playable=true/false （JSON抜粋）
2) 監視ダッシュボード抜粋
3) 顧客フィードバック
4) 懸念点 / 改善提案
5) 要アクション（担当AI・期限）
```

---

## 5. 運用メモ
- Cloud Run の `PUBLIC_UI_URL` / `PUBLIC_BFF_URL` / `BUILD_ID` を必ず設定し、`/status/probe` が本番 URL を参照できるようにする。
- `check_playability.sh` を CI（GitHub Actions / Vertex AI pipelines 等）で 5 分間隔実行。失敗時は Slack / メールでマネージャーに通知。
- すべての AI は **「マネージャーへの報告 → マネージャーからオーナーへ報告」** という経路を守り、責任の所在を明確にする。

---

本プロトコルは、IZAKAYA マネージャーが Vertex AI に常駐し、オンライン公開後も顧客に失礼がない状態を維持するための最終安全網として運用する。更新や逸脱が必要な場合は、必ずマネージャー経由でオーナー承認を得ること。
