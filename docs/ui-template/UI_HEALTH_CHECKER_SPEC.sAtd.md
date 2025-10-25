spec: izakaya-verse-promo.ui-health-checker.v1.0
author: moto koyama
target: Codex CLI / Local Builder
phase: 3
goal: GitHub Pages と Render BFF の疎通状態を視覚化する GUI / CLI ツールを生成

---

### 🎯 目的
IZAKAYA-verse-promo プロジェクトにおける UI 層（Vite + GitHub Pages）と
バックエンド層（Mini BFF + Render）の接続状態を簡単に検証するアプリを構築する。
GUI 版（Vite + React）と CLI 版（bash/curl）の両対応とする。

---

### 🧩 技術仕様
- Node.js 20+
- Vite + React + Tailwind（GUI版）
- axios（HTTP リクエスト）
- lucide-react アイコン
- `.env` から `API_BASE_URL` / `UI_BASE_URL` を読み込む

---

### 🧠 機能要件
| 機能 | 詳細 | 出力例 |
|------|------|--------|
| APIヘルスチェック | `${API_BASE_URL}/api/health` | ✅ OK / ❌ FAIL |
| ポイントAPIチェック | `${API_BASE_URL}/api/points` | 200 / エラー詳細 |
| UIロードチェック | `${UI_BASE_URL}` を GET | 200 / Timeout |
| CORS検出 | axios エラー種別から CORS を表示 | ⚠️ `CORS blocked` |
| ステータス一覧表示 | 結果をテーブルまたはカードで表示 | ✔️ / ❌ 一覧 |
| ワンクリック再チェック | 「Check Again」ボタンで再実行 | 即時更新 |

---

### 📁 推奨構成
```
apps/
└── checker/
    ├── src/
    │   ├── App.tsx
    │   ├── components/StatusCard.tsx
    │   └── utils/checkEndpoints.ts
    ├── .env.sample
    ├── vite.config.ts
    ├── package.json
    └── README.md
scripts/
└── check_ui_health.sh  # CLI 版
```

---

### ⚙️ 出力指示
1. GUI 版は `/docs/ui-template/checker/` に配置し、GitHub Pages から起動可能にする。
2. CLI 版は `/scripts/check_ui_health.sh` として保存。
3. API / UI / CORS / DNS など各層の応答をログ表示すること。

---

### 🔒 変数
`.env`
```
API_BASE_URL=https://izakaya-verse-promo.onrender.com
UI_BASE_URL=https://motookoyama.github.io/IZAKAYA-verse-promo/
```

---

### ✅ 成功条件
- それぞれの URL が 200 OK を返すこと。
- axios エラーや CORS 拒否を GUI 上で可視化。
- 再チェック操作で結果が即更新される。
- CLI 版も同じ結果を出力。

---

### 💬 備考
過去の Codex GUI prototype を参照しても良いが、新規実装でも同等機能を満たすこと。
