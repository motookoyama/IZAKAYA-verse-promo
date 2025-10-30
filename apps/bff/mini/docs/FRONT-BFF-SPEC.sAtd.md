# IZAKAYA verse – FRONT ↔ BFF 仕様 (source of truth)

## ✅ 目的
フロントエンドと BFF の仕様の唯一の真実ファイル。
以降の開発では、本ファイルと一致しない実装を行ってはならない。
修正・追加時は必ずこのファイルを更新し、合意を明確にする。

---

## ✅ 接続とポート
- BFF ローカルポート: `4117`
- フロント開発モードポート: `4173` または `5173`
- フロント表示用 URL:
  - `http://localhost:4173/preview/`（npm run dev）
  - `http://localhost:5173/preview/`（vite auto assign）

---

## ✅ Health Check
必ず `/health/ping` を使用すること。

**禁止**:
- `/health`
- `/api/health`
- バックエンドの仕様変更に追従しないハードコード

フロントは `BFF_ENDPOINT + "/health/ping"` で取得する。

---

## ✅ /chat エンドポイント
- URL: `/chat/v1`
- method: POST
- request:
```

{
"query": "ユーザ入力",
"card_id": "任意",
"temperature": 数値
}

```
- response:
  - reply(string)
  - meta.provider
  - meta.model
  - meta.soul_core_paths
  - meta.persona_path

---

## ✅ ソウルコア
- BFF 起動時に自動ロード
- 対象ディレクトリ: `apps/persona-engine/soul-core/*.md`
- UI が直接指定・操作しない
- BFF はローカルとクラウドの両方で同一動作

---

## ✅ UI の実装ルール
✅ フロントは `/health/ping` と `/chat/v1` を唯一の正解として扱う  
✅ BFF 停止時は、アラートではなく画面上のバナーで自動再接続  
✅ UI 側で `/health` をハードコードしてはならない  
✅ BFF_ENDPOINT は UI 内の `const BFF_ENDPOINT` に一本化し、分散させない  

---

## ✅ 自己チェック手順（開発者・AI共通）
修正時は必ず以下を実行すること：

1. `curl http://localhost:4117/health/ping` → OK が返ること
2. `curl http://localhost:4117/chat/v1` → 200 が返ること
3. `npm run dev`（preview-ui） → `/preview/`が表示されること
4. UI 上で `Chat送信` → 実プロバイダ応答が返ること

これらを満たさない状態で push してはならない。

---

## ✅ 違反した場合の扱い
- 修正作業は必ずこのファイルと照合
- フロント・BFF側がどちらかに偏って変更されていたら即修正
- 仕様変更が必要な場合は、まずこのファイルを書き換える

---

更新日: 2025-10-30
作成者: Codex
---
