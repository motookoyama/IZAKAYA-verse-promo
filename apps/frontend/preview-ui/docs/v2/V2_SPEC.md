# V2 仕様（確定用テンプレ）

目的: ここを“唯一の正”にします。フロント実装はこの内容に合わせます。

## 概要
- 機能名: IZAKAYA Builder V2 カード
- 目的: カード一覧と各カード詳細（名前・アイコン・プロンプト）を提供

## エンドポイント
- 一覧（GET）: <LIST_PATH>
  - 例: /api/v2/cards（候補: /v2/cards, /api/cards, /cards）
  - 期待形: `{ "items": [{ "id": string, "name": string, ... }] }` または `[ { id, name, ... } ]`
- 詳細（GET）: <DETAIL_PATH>（id を埋め込む）
  - 例: /api/v2/cards/{id}
  - 期待形: 正規化で `id/name/icon/prompt` が取れること

## データ構造（一覧）
- ルート: items | 配列 | どちらか
- アイテム最低限: { id: string, name: string, ... }
- 正式キー
  - id: string
  - name: string | title
  - icon: string | meta.icon
  - prompt: string | system | description | meta.prompt

## データ構造（詳細）
- 各キーの最終形（例: chara_card_v3 → V2）
  - id: ファイル名や由来から生成（例: `v2_horus_twitterx`）
  - name: `name` または `data.name`
  - icon: `icon` または `meta.icon`（無ければ既定絵文字）
  - prompt: 優先順 `prompt` > `system` > `description` > `data.description`
  - 備考: 元JSONが `chara_card_v3` の場合は `meta.spec` に元仕様を保持

## 表示仕様（フロントが期待）
- 一覧: name と icon をカードごとに表示
- 詳細: prompt を展開して表示（存在する場合）
- アイコンが無い場合: 🃏 を表示

### 参考サンプル
- docs/v2/samples/card_v2_horus_twitterx.json
  - 元: `docs/V2card/st.json/Horus TwitterX bot.json`（chara_card_v3）
  - センシティブ情報を削除済み（パスワード/トークン等）

## エラー
- 一覧取得失敗: ネットワーク/JSON不正 → 画面に「取得失敗」を表示
- 詳細取得失敗: 一覧の情報のみで表示（prompt は空）

## バージョン管理
- 表示: ヘッダーに v0.08 を出す（将来は package.json の version を参照）

## メモ/備考
- 仕様変更や別URLが分かったら、ここを先に更新 → コード適用
