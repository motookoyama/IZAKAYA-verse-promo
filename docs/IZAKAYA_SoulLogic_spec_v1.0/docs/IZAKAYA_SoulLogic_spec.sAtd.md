# IZAKAYA Soul Logic Spec (.sAtd.md)
---
### [JP] 概要
この文書は IZAKAYA verse における「ソウルロジック層」定義の中核仕様です。
V2カードの人格的反応、感情・記憶・トーン制御・自己反省層を統合し、Codexによるモジュール化実装を前提にしています。

### [EN] Overview
Defines the "Soul Logic Layer" for the IZAKAYA verse project.  
It connects persona card logic (V2 architecture) to LLM-based engines, including modules for emotion, memory, reflection, and orchestration.

---
## Structure
1. Persona Engine
2. Emotion & Memory API
3. Reflection / Tone Control
4. Persona Orchestration

Each module is stored under `/docs/modules/` and loaded dynamically.
