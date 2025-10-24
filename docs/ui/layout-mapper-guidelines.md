# Layout Mapper — 参考意見仕様書（Guidelines）

## 1. 前書き（位置づけ）
- 本書は必須仕様ではなく、参考意見・設計ガイドです。
- 開発側が流れを維持しつつ、必要な観点のみを取捨選択できるようにまとめています。
- 対象は「管理者用レイアウト調整ツール」。公開サービス（閲覧者用UI）とは分離します。

## 2. レイアウトマッパーに期待する役割
- `.sAtd` 等の記述や管理者が用意した画像モックから、UIレイアウト定義（比率/配色/パターン）を抽出・解釈。
- 複数環境（Web, Mobile, CLI/TUI）の出力テンプレートへ橋渡しする中間表現を提供。
- 将来的な「レイアウトパターンの学習」や、好まれる配色/構図の蓄積に資するメタデータを記録。

## 3. 実装に役立つ観点（参考）
- 軽量さ: JSONベースで数KB規模、読み書きが速く手で編集できること。
- 段階的拡張: v0は比率（bar/drawer/panel）と配色のみ。v1以降でbreakpoints, nesting, routingへ拡張。
- I/O透明性: 入力（.sAtd/画像）、中間（`layout.json`）、出力（CSS変数/React props）を明示。
- 診断性: 無視されたプロパティや解析不能項目をログへ出力（学習や見直しに還元）。
- モード柔軟性: overlay / push / docked を表現できる最小プロパティを設計。
- セキュリティ: 管理者専用（トークン or 環境変数）で、公開UIからは非表示。書き込みは限定パスのみ。
- 互換性: 既存UIはCSS変数と比率propsで動かし、差し替えの衝撃を小さく。

## 4. 応用例（将来）
- マルチデバイス: breakpointsによりPC/スマホで自動レイアウト切替。
- RAG連動: 知識ナビの状態に応じて、重要パネルを強調/拡張。
- 操作ログ学習: よく使うレイアウト/配色の自動提案。

## 5. 結び
- 本書は参考意見であり、開発の進行を妨げる意図はありません。
- IZAKAYA builder/Verseの進化に合わせ、必要部分のみ採用してください。

---

## 付録A: v0 JSON（最小案）
```
{
  "version": 0,
  "updatedAt": "2025-09-03T00:00:00Z",
  "ratios": {
    "rightPane": 0.46,
    "codePreview": 0.50
  },
  "palette": {
    "bg": "#111111",
    "fg": "#eaeaea",
    "accent": "#ff3b30",
    "border": "#e5e7eb"
  },
  "grid": { "snap": 0.05, "show": false, "unit": 8 },
  "header": { "height": 48 },
  "source": { "imageName": "mock.png", "imageHash": "sha256-..." },
  "meta": { "author": "admin", "note": "IZAKAYA theme v1" }
}
```

- `ratios.rightPane`: 左右比率（右ペイン幅 0.25–0.85）
- `ratios.codePreview`: 右ペイン内 上下比率（0.15–0.85）
- `palette`: CSS変数に適用（`--bg`, `--fg`, `--accent`, `--border`）
- `grid.snap`: スナップ刻み（例: 5%）

## 付録B: API最小案
- GET `/api/ui/layout` → 現行設定（なければ既定値）
- PUT `/api/ui/layout` → 保存（body = layout.json）。管理者トークンを必須化可（`ADMIN_TOKEN`）。
- 実装指針:
  - 保存先: `docs/ui/layout.json`
  - PUT時に簡易バリデーション（範囲/型）
  - GET/PUTともにJSONのみ

## 付録C: 適用手順（Phase 1–2）
- Phase 1（比率UX）
  - 太めハンドル＋ホバー強調＋スナップ、ラベル表示、Reset
  - Apply→比率とCSS変数に即反映、localStorage保持
- Phase 2（配色）
  - 画像から主要3色抽出→役割に割当→ApplyでCSS変数更新
  - Reset/Undo、Export/Import（`layout.json`）

