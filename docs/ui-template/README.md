# IZAKAYA UI Template (Starter)

目的: IZAKAYA系の小さなツール/画面を素早く作るための“共通レイアウト + 部品”のテンプレ。

含まれるもの
- 共通レイアウト: ヘッダー / サイド（任意）/ コンテンツ / ステータス
- 和文フォント優先のタイポグラフィ、色変数、余白ルール
- 部品: ボタン/入力/トグル/パネル/ドロップゾーン/トースト
- JSユーティリティ: ドロップ受け取り、画像プレビュー、ファイル選択、トースト、タブ切替

使い方
- `docs/ui-template/index.html` をそのまま開いて雰囲気確認
- 必要なところだけ `kit.css` と `kit.js` を読み込み、マークアップ（クラス名）を真似る
- React/Vite側で使う場合も、`kit.css` を読み込み、`kit.js` の関数を参考にコンポーネント化

ガイド
- 和文フォント: `'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic','Meiryo'`
- ボタン: `.btn`, 強調は `.btn.primary`、アイコンは内側にspan
- ドロップ: `.dropzone`（クリック=選択/ドラッグ&ドロップ対応）、右に `.preview` を並べる
- エラー表示: `.toast.error` を `showToast('message','error')` で表示

