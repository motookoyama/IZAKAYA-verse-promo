<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1nkWPyMM7DyioZ2be_oVLWG-IjPDiEIWk

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`







# 🛰 Silly Checker（衛星デバッグアプリ）
開発中の Webアプリや BFF/API が動かないとき、  
「どこがダメなのか」「何を直せば動くのか」を自動でチェックし、  
**修復スクリプトまで自動生成する**開発支援ツールです。

本体が壊れていても、Silly Checkerだけ動かせば診断できます。

---

## ✅ 主な機能

### ✔ 1. Webブラウザで診断（クラウド版）
- ボタン1つで診断開始  
- 成功／失敗／警告を色分け表示
- 失敗項目は理由と対策を提示

### ✔ 2. ローカルでも使える（オフライン可）
- ローカルPCにインストール可能  
- ネットが不安定でも診断できる
- 会社LAN・現場マシンでもOK

### ✔ 3. JSONレポート出力
- `silly-check.sh --json`
- `silly_report.json` を生成し、AI連携に利用可能

### ✔ 4. レポートを読み込んで再解析
- Webから JSON をアップロード → 診断画面に反映
- チーム共有・過去検証にも便利

### ✔ 5. 自動修復スクリプト生成
- Gemini が修理用 `.sh` を自動生成
- `.env`の修正、npm再構築、docker再起動などを自動記述
- ダウンロード or クリップボードコピー可

### ✔ 6. ワンクリック自動修復（butler連携）
- ローカルのヘルパー(例: localhost:9999)へ送信
- Silly Checker → butler → PCが自動で修復

---

## ✅ ローカル実行方法

### 📌 必要なもの
- Node.js（推奨: 18以上）
- Gemini APIキー

### 📌 セットアップ

1. 依存パッケージをインストール
```bash
npm install
```

2. `.env.local` に Gemini APIキーを記入
```
GEMINI_API_KEY="ここにあなたのAPIキー"
```

3. アプリを起動
```bash
npm run dev
```

📌 ブラウザが自動で開かない場合は  
http://localhost:5173  
へアクセスしてください。

---

## ✅ ローカル診断専用シェルスクリプト

### 実行
```bash
./silly-check.sh
```

### JSONレポート出力
```bash
./silly-check.sh --json
# → silly_report.json が生成されます
```

生成された `silly_report.json` を  
Web版 Silly Checker にアップロードすれば、  
UIで診断結果を再現できます。

---

## ✅ 自動修復スクリプトの生成

1. Webアプリで診断  
2. 失敗項目がある場合、  
   **「AI修復スクリプトを生成」ボタン**を押す  
3. `.sh` が自動生成・ダウンロード可能

例：含まれる処理
- `.env`再構築
- `npm install / npm rebuild`
- `docker compose`再起動
- 間違ったURLやポートの修正

---

## ✅ ワンクリック自動修復（任意）

Silly Checker が butler（小さなローカルBFF）に修復命令を送り、  
人手なしで修理を実行できます。

例：
```
POST http://localhost:9999/api/fix
```

---

## ✅ こんな人・シーンに向いています

| 状況 | Silly Checkerの役割 |
|------|----------------------|
| Web UI が動かない | 原因を自動解析 |
| BFF が応答しない | ポート/URL/依存崩壊を検出 |
| 移行やPC変更で壊れた | `.sh` で自動復旧 |
| ネットに繋がらない | ローカル版を使用 |
| 本体が死んでいる | 衛星アプリとして診断可能 |

---

## ✅ ライセンス / 免責
- 開発支援を目的としたツールです
- 自動修復スクリプトは内容を確認してから実行してください
- カスタマイズして自由に利用可能です

---

## ✅ 作者より
Silly Checker は、  
**「人間が毎回同じミスで苦しむ時間をゼロにする」**  
ことを目的に作られました。

壊れた本体とは独立して動き、  
あなたのプロジェクトを“外側から守る衛星”として働きます。

