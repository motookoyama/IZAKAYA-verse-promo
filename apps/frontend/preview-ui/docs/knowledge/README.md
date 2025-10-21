# Knowledge Pack (外部知識の取り込み方)

目的: ChatGPT スレッドや他所で書いた指示・ノウハウを、このプロジェクトに“読める形”で置き、後でBFF/フロントから参照できるようにする。

## 使い方（3ステップ）
- 1) 知識を貼る: `docs/knowledge/cards/` にカードごとのMarkdownを作る（テンプレは `TEMPLATE.md`）
- 2) 紐づける: `docs/knowledge/index.yaml` にカードIDとファイル名を追記
- 3) 共有する: GitHubへプッシュ（Codespacesでも読める）

将来: BFFが `docs/knowledge/index.yaml` を読み、該当Markdown（frontmatter＋本文）をAPIで返す。今は“置き場所と形”を決めるだけ。

## 取り込み元の例
- ChatGPT スレッド: 重要部分をコピペし、見出しごとに分割（例: 指示/制約/FAQ/例）
- 既存ドキュメント: sAtdやメモから要点を転記

## フォーマット（frontmatter）
```
---
id: v2_horus_twitterx   # V2カードID（例）
title: Horus TwitterX bot Knowledge
version: 0.08
updated: 2025-09-04
keywords: [twitter, trends, posting, knowledge-graph]
---
```
本文はMarkdownで、次の章立てを推奨:
- 目的 / ロール
- コア指示（守ること）
- 手順（箇条書き）
- 禁止事項（NG例）
- 例（プロンプト例/回答例）
- 参考リンク

## 注意
- パスワード/トークン等の秘密は絶対に書かない（.envやSecretsで管理）
- 長文は分割してOK（複数ファイルにして index.yaml で列挙）

