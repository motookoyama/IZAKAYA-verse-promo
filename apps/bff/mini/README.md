# apps/bff/mini

Mini BFF (Express/CommonJS) を配置するディレクトリです。

## 推奨構成
```
apps/bff/mini/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts (Express entry)
└── data/
```

### package.json (例)
```json
{
  "name": "mini-bff-express",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon --watch src --exec node --loader ts-node/esm src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  }
}
```

実コードは `IZAKAYA verse/izakaya_lite/mini-bff-express` からコピーしてください。`RUNBOOK.md` も合わせて更新すること。
