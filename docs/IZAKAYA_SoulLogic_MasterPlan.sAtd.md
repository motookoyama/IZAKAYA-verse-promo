# IZAKAYA_SoulLogic_MasterPlan.sAtd.md

spec: izakaya-verse-promo.soul-logic.master.v1.0
author: moto koyama (ChatGPT Atlas)
target: Codex CLI / Atlas / Gemini
goal: IZAKAYA verse の Soul Logic 中間層を設計・実装・公開するための行動仕様

---

## 📘 概要
**目的:** V2カードに「意志」「感情」「記憶」を持たせる中間層（Soul Logic）を定義し、ローカル実装→RP検証→クラウド公開までを一連化する。

---

## 🧩 Phase Flow
| Phase | 名称 | 担当AI | 目的 / 出力 |
| --- | --- | --- | --- |
| 1 | Deep Research | GPT-5 / Gemini / Claude / Perplexity | Persona API / Emotion Logic / Memory Core に関する世界的事例を収集し要約する |
| 2 | Logic Aggregation | GPT-5 (ChatGPT本部) | 収集結果を統合し `IZAKAYA_SoulLogic_spec.sAtd.md` を生成 |
| 3 | Implementation | Codex (Docker Local) | `/apps/persona-engine/` を TypeScript で実装。Docker Compose で起動検証 |
| 4 | RP Validation | GPT-5 + Local LLM | Dr.Orb/Miss Madi でロールプレイ検証。感情・記憶遷移をログ保存 |
| 5 | Cloud Integration | Render / GitHub Pages / GCP Vertex AI | 実装を main へ push → Lite UI と接続 → Online デモ公開 |

---

## 🧱 コア構成要素
```yaml
soul_logic:
  modules:
    - persona_loader   # V2/V3カード→人格構造
    - emotion_core     # 感情ベクトル生成
    - memory_core      # 会話履歴・長期記憶
    - inference_unit   # 文脈/目的/動機の認知
    - reflection_layer # 自己評価・tone調整
    - llm_bridge       # LLM プロンプト統合 (system+memory+tone)
  output_targets:
    - local_docker
    - lite_ui (GitHub Pages)
    - render_bff
```

---

## ⚙️ 技術概要
| 項目 | 内容 |
| --- | --- |
| ベース | Node.js 20+, Docker Compose |
| 実装パス | `/apps/persona-engine/` |
| 言語 | TypeScript / Express / Vite |
| 通信 | REST (Mini BFF `/chat/v1`, `/wallet/*`) |
| LLM | OpenAI GPT-5, Gemini 2, Local Ollama |
| 記憶 | IndexedDB (local) / CloudSync (Render + GitHub) |
| ツール | Cursor, Codex CLI, Atlas Bridge |

---

## 🧠 Deep Research プロンプト群
1. Persona Card Frameworks → “Search existing persona card logic engines or soul layers between LLM and character data.”
2. Emotion & Memory API → “Research emotion modeling / conversational memory projects in Node/Python.”
3. Reflection & Tone → “Examples of reflection layers or self evaluation loops in character AI.”
4. Persona Orchestration → “Architecture patterns for multi-persona conversational systems.”

各AIへ分散投入し、1週間で要約を回収する。

---

## 🧭 集約手順 (Phase 2)
1. 収集結果を GPT-5 が統合し「Identity / Cognition / Interaction」の三層構造に整理。
2. `IZAKAYA_SoulLogic_spec.sAtd.md` を作成し Codex へ共有。

---

## 🧪 実装～実証 (Phase 3–4)
| 項目 | 内容 |
| --- | --- |
| Docker Compose | persona-engine + mini-bff + lite-ui |
| テストカード | Dr.Orb, Miss Madi |
| 目的 | 感情変化・記憶保持・tone反応の再現性確認 |
| ログ | `/docs/logs.md` (emotion_vector + reply_trace) |
| 成功条件 | RP会話で一貫した人格＆ポイント挙動が成立 |

---

## ☁️ Phase 5 公開方針
| 環境 | 目的 | 出力 |
| --- | --- | --- |
| GitHub Pages | UI＋ドキュメント公開 | `/docs/` |
| Render Cloud | Mini BFF + persona-engine | `apps/bff/mini` |
| GCP Vertex AI | LLM連携・拡張 | `vertex.ai: izakaya-verse` |
| Local Backup | Docker/Mac mini | `/Volumes/Mac2TB/cursor_main/` |

---

## ✅ 指示
1. 本書を `docs/IZAKAYA_SoulLogic_MasterPlan.sAtd.md` として保持済み。
2. 直ちに Deep Research プロンプトを Atlas 経由で投入。
3. 集約結果を `IZAKAYA_SoulLogic_spec.sAtd.md` にまとめ、Codex 実装へ移行。

---

## 📝 備考
- 完了後、上位計画 “Soul Logic v2.0: Collective Memory & Motivation Core” に移行。
- Codex / Gemini / Atlas すべてが参照可。Push 時は commit log を徹底。
