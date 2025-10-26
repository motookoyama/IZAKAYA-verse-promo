spec: soul_core
version: 1.0
title: IZAKAYA Verse — Soul Core Logic Specification
author: Motoo Koyama
date: 2025-10-26
status: concept-integrated
---

## 概要 / Overview
「ソウルコア構想（Soul Core Concept）」は、IZAKAYA verse の世界観を技術的・哲学的に支える基底思想層。キャラクターや設定を超えた “作家性の核” を定義し、Persona Engine の行動原理・感情変数・記憶整合性を導く。LLM ファインチューニングの代替として設計し、AI モデルを直接改変せず、外部 sAtd 文書を参照させて思想を反映する。

## 目的 / Purpose
- すべてのペルソナに統一された魂の論理を与える。
- 物語論・ドラマツルギー・人間観を体系的に保存し、継承可能にする。
- 思想を更新するだけで世界観を進化させる仕組みを提供。
- マルチバース展開（他作者ソウル）を容易にし、互換性を保つ。

## 構造 / Structure
```
Soul Core
├── Identity Layer   # Origin / Ethos / Archetype
├── Cognition Layer  # Emotion Logic / Memory Logic / Motivation
└── Interaction Layer# Dialogue tone / Reflection / Social contracts
```
- **Identity Layer:** V2/V3カードから抽出される人格核。Archetype, Backstory, Signature Lines を定義。
- **Cognition Layer:** Emotion Core, Memory Core, Motivation Vector を制御。
- **Interaction Layer:** 会話トーン、自己反省、行動ルール（禁則・約束）を定義。

## 主要パラメータ
| Name | Layer | 役割 |
| --- | --- | --- |
| `ethos_vector` | Identity | キャラ信条を数値化（勇敢=0.8等） |
| `emotion_vector` | Cognition | Valence/Arousal/Dominance |
| `memory_tags` | Cognition | 記憶の分類タグ（約束/借り等） |
| `interaction_rules` | Interaction | 禁則／口調変化／反応テンプレ |
| `reflection_prompt` | Interaction | 応答後に自己チェックするプロンプト |

## Persona Engine 連携
1. Persona Loader が V2カード + Soul Core spec を読み込み `personaProfile` を構築。
2. Cognition Layer で Emotion Core / Memory Core を初期化し、LLM Bridge へ “Guidance” として渡す。
3. Mini BFF から `/chat/v1` が呼ばれるたびに、Soul Core → Persona Engine → LLM へ値を注入。
4. Interaction Layer で応答後に Reflection → Tone 調整 → Mini BFF へ返却。

## 進化手順
- Soul Core spec は Git 管理 (`docs/IZAKAYA_Soul_Core_Spec.sAtd.md`) で版数を維持。
- Persona Engine の `persona-loader.ts` は spec の Path を読み込めるよう実装。
- 新バージョン投入時は `soul_core_version` を API レスポンスに含め、UI 側で既知かどうかを表示。

## 今後
- Phase 2: Emotion/Motivation の係数チューニング
- Phase 3: Reflection Layer をフル実装
- Phase 4: RP 検証ログを `docs/logs_soul_core.md` に保存
- Phase 5: Cloud Run / Vertex AI へ展開
