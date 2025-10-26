# IZAKAYA Soul Logic Spec v1.0
---
## 概要 / Overview
このZIPは「IZAKAYA verse」のソウルロジック層（persona-engine）を定義する仕様書です。
Codex・Cursor・Geminiが共通認識可能なフォーマットで記述され、人間開発者向けには日本語解説も併記されています。

### 利用方法
- `/IZAKAYA-verse-promo/docs/` に展開してください。
- Codex が自動的に `.sAtd.md` 構成を読み込み、ロジック層モジュールを参照します。
- 各モジュールは `modules/` 配下に格納されています。

---
## Codex Import Guide
```
# Example: Codex import command
codex import ./docs/IZAKAYA_SoulLogic_spec.sAtd.md
```

---
## Directory Map
```
docs/
 ├── IZAKAYA_SoulLogic_spec.sAtd.md
 ├── modules/
 │   ├── persona-engine.md
 │   ├── emotion-memory.md
 │   ├── reflection-tone.md
 │   └── orchestration.md
 └── references.md
```
