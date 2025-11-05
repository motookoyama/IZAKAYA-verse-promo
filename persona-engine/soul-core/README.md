# IZAKAYA Soul Core

このフォルダは、すべてのキャラクターチャットが共有する「人格 OS」を保管するための場所です。  
`soul-core.sAtd.md` を編集することで、各カードが持つ個別設定の前に必ず読み込まれる共通ルールを定義できます。

構成:

```
soul-core/
├─ README.md           # この説明書
└─ soul-core.sAtd.md   # 共通の会話ポリシー（SATD 形式）
```

- V2 カードを追加する際は、`apps/persona-engine/cards/<card-id>/persona.json` に個別設定を置き、BFF が自動的にソウルコアと合成します。
- このフォルダを削除したり、ファイル名を変更すると BFF がチャットを生成できなくなるため注意してください。

