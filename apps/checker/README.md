## IZAKAYA UI Health Checker

React/Vite ベースの簡易 GUI で、GitHub Pages (UI) と Render (Mini BFF) の疎通状態を確認できます。

### 環境変数
```
API_BASE_URL=https://izakaya-verse-promo.onrender.com
UI_BASE_URL=https://motookoyama.github.io/IZAKAYA-verse-promo/
```

### 開発
```bash
npm install
npm run dev
```

### ビルド
```bash
npm run build
```

生成物は `dist/` に出力されます。GitHub Pages へ配備する場合は `dist` をコピーしてください。
