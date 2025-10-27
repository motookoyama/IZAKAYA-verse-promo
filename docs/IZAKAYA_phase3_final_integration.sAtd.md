# IZAKAYA verse Docker統合フェーズ最終計画書

---

## 🧭 IZAKAYA verse Phase 3 Final Integration Plan

### ― Docker + TX-ID Economy + Soul Logic 連携最終指示書 ―

- **ファイル名:** `/docs/IZAKAYA_phase3_final_integration.sAtd.md`
- **目的:** Codex・Gemini・Ollama・Render 全てに同一仕様で渡せる「統一された構築指示書」

---

## I. 概要（Purpose）

本書は、**IZAKAYA verse のローカル構成を完全Docker化し、TX-ID Economy と Soul Logic を統合した最終構築フェーズの実行指示書**である。  
以後、**Codex（構築AI）・Gemini（調査／デバッグAI）・Ollama（ローカル実行AI）** の3系統が同じ仕様で作業を引き継げるよう標準化する。

---

## II. 監督・指揮体制（Supervisor / Coordination）

| 役割                 | 担当AI/環境                  | 主な任務                               |
| -------------------- | ---------------------------- | -------------------------------------- |
| **総監督（あなた）** | moto koyama                  | 全体指揮・リソース割当・承認           |
| **構築監督**         | Codex CLI                    | コード生成・Docker構成・環境依存調整   |
| **技術監査**         | Gemini Studio                | ビルドエラー調査・SWC/Node互換検証     |
| **ローカル運用監視** | Ollama Local / LM Studio     | ローカル起動試験・TX-IDストア動作確認   |
| **サブ監督**         | GPT-5 (Atlas) *optional*     | 指示書管理・履歴保存・AI間プロンプト調整 |

---

## III. フェーズ構成（Phase Tree）

```
Phase 1.5  ─── UI試行基盤（完了）
Phase 2.0  ─── BFF試験運用・TX-ID設計（完了）
Phase 3.0  ─── Docker統合＋ポイント処理実装（本書）
Phase 3.5  ─── Cloud Run / Renderデプロイ検証
Phase 4.0  ─── Soul Logic・Persona連携（次フェーズ）
```

---

## IV. 技術仕様（Tech Spec）

| 項目                  | 設定値 / 内容                               |
| --------------------- | ------------------------------------------- |
| Node.js バージョン     | **18.x（固定）**                             |
| Docker Base Image     | `node:18-bullseye`                           |
| BFF Framework         | Express.js (CommonJS)                        |
| Frontend              | Vite + React                                 |
| ビルド統合             | docker-compose 1.29+                         |
| 環境変数              | `.env / .env.local / .env.render` 同期       |
| ポイント経済          | TX-ID方式 + JSONストア冪等管理              |
| AI Persona            | `Dr.Orb`, `Miss Madi`, `Curator`（固定）     |
| 支払い連携            | PayPal IPN (Render 受信)                     |
| ソウルロジック        | V2Card経由でAIエージェント呼び出し予定       |

---

## V. ディレクトリ構成

```
apps/
 ├── frontend/
 │    ├── lite-ui/          # 公開UI (Vite)
 │    └── preview-ui/       # テストUI
 └── bff/
      ├── mini/             # Mini BFF (TX-ID実装)
      └── Dockerfile
scripts/
 ├── start_local.sh
 └── build_all.sh
docker-compose.yml
.env.example
```

---

## VI. Docker構成（共通compose）

```yaml
version: "3.8"
services:
  lite-ui:
    build: ./apps/frontend/lite-ui
    ports:
      - "5173:5173"
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:4000
    volumes:
      - ./apps/frontend/lite-ui:/usr/src/app
    command: npm run dev

  bff:
    build: ./apps/bff/mini
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - PORT=4000
      - TX_STORE=./tx_store.json
    volumes:
      - ./apps/bff/mini:/usr/src/app
    command: npm start
```

---

## VII. Mini BFF（TX-ID Economy 実装）

**ファイル:** `/apps/bff/mini/server.js`

```js
const express = require("express");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 4000;
const STORE = process.env.TX_STORE || "./tx_store.json";

app.use(express.json());
function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE)); }
  catch { return { balance: 0, tx: [] }; }
}
function saveStore(data) {
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2));
}

app.get("/wallet/balance", (req, res) => {
  const data = loadStore();
  res.json({ balance: data.balance, tx: data.tx.slice(-20) });
});

app.post("/wallet/redeem", (req, res) => {
  const { amount_pt = 0, tx_id } = req.body;
  const data = loadStore();
  if (data.tx.find(t => t.tx_id === tx_id))
    return res.status(409).json({ error: "Duplicate TX-ID" });
  data.balance += amount_pt;
  data.tx.push({ tx_id, amount_pt, type: "redeem", time: new Date() });
  saveStore(data);
  res.json({ balance: data.balance });
});

app.post("/wallet/consume", (req, res) => {
  const { amount_pt = 0, sku, idempotency_key } = req.body;
  const data = loadStore();
  if (data.balance < amount_pt)
    return res.status(402).json({ error: "Insufficient points" });
  if (data.tx.find(t => t.idempotency_key === idempotency_key))
    return res.status(409).json({ error: "Duplicate consume" });
  data.balance -= amount_pt;
  data.tx.push({ sku, idempotency_key, amount_pt, type: "consume", time: new Date() });
  saveStore(data);
  res.json({ balance: data.balance });
});

app.listen(PORT, () => console.log(`Mini BFF running on port ${PORT}`));
```

---

## VIII. ローカル実行手順

```bash
# 1. 依存インストール
npm install --prefix apps/frontend/lite-ui
npm install --prefix apps/bff/mini

# 2. Docker起動
docker compose build && docker compose up -d

# 3. 動作確認
curl http://localhost:4000/wallet/balance
```

---

## IX. 監督ログとAI連携指針

| AIエージェント      | 機能             | トリガー                   | 出力/責任範囲                 |
| ------------------- | ---------------- | -------------------------- | ------------------------------ |
| Codex CLI           | 実装生成・構成更新 | `update phase3` コマンド   | コードと構成の自動補完         |
| Gemini Studio       | デバッグ＆診断     | `verify docker logs`       | エラー解析とバージョン提案     |
| Ollama Local        | 実機テスト         | `run local tests`          | TX-ID ストアとAPI確認          |
| GPT-5 Atlas         | 記録・要約・監督   | `summarize phase logs`     | ノート自動化・履歴保存         |

---

## X. 最終到達目標

1. DockerでUI＋BFFを同時起動  
2. TX-IDエコノミーの残高管理が動作  
3. `SESSION_NOTES.md` に「Phase 3 Complete」記録  
4. Codex・Gemini・Ollama いずれでも同じ環境を再現  
5. Soul Logicフェーズ（Phase 4）に進行準備完了

---

## XI. 保存指示

- この `.sAtd.md` を `/docs/IZAKAYA_phase3_final_integration.sAtd.md` に保存済み。  
- GitHubにコミットする際は **「phase3-final」ブランチ** を切ること。  
- `SESSION_NOTES.md` には次の文言を追記すること：

  > ✅ Phase 3: Docker統合およびTX-ID Economy 実装 完了  
  > 監督AI：Codex / Gemini / Ollama 連携開始

---

以上。  
この指示書は、Codex・Gemini・Ollama いずれの環境でも Phase 3 の引き継ぎ資料として利用できる。
