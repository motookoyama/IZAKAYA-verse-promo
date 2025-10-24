# IZAKAYA verse Phase 1.4 — DoD/Runbook

Definition of Done
1) GET /api/health → 200 {ok:true}
2) GET /api/models → モデル配列（Ollama未起動でもフォールバックOK）
3) 画像DnD→/api/v2/cards→V2Drawerにカード表示
4) 選択カード文脈で /api/v2/chat → ChatPaneに返答表示
5) フロントのタブとボタンが所定位置で表示
6) ルートで `npm run dev` → bff(8787) + front(5173) 同時起動

Runbook
- cp .env.example .env
- npm install
- npm run dev

Manual Checks
- A. curl -s http://localhost:8787/api/health
- B. curl -s http://localhost:8787/api/models
- C. フロント右上 V2 Cards → 画像DnD → リスト表示
- D. カード選択→ Chat で送信 → 応答表示、Previewにも反映
- E. 上部タブ/ボタンの表示確認

