# ✅ docs/ADMIN_LLM_SWITCH.sAtd.md

### — IZAKAYA verse 管理タブによる「プロバイダ & APIキー設定」仕様書 —

## ✔ 目的

* `.env` を編集せず、**UI上の操作のみ**で LLMモデルとAPIキーを設定・切替可能にする
* 管理者のみアクセス可能な **「管理タブ」**を UI に追加
* 選択されたプロバイダとキーは、**ホスト環境のファイル（JSON）として保存**
  → Docker / ローカル / クラウド共通で動作
* 将来新しいモデルを追加しても、コード変更不要で管理者が設定可能

---

## ✔ 追加 UI：管理タブ

### ✅ 仕様

* 画面上部メニューに新しいタブを追加  
  表示名：**「管理」**
* 一般ユーザーには非表示  
  `localStorage.ADMIN_MODE === true` の場合のみ表示
* 未設定時はパスワード入力ダイアログを表示

### ✅ パスワード処理

* 1回認証したら localStorage に保存
* 次回アクセス時は自動ログイン
* パスワードは `.env` を使わず、以下の固定テキストで十分：

```
IZK_ADMIN_PASS= suke-nomi
```

※後で変更可能な設計にする

---

## ✔ 管理タブ内部メニュー構成

```
管理
 ├─ プロバイダ設定
 ├─ APIキー設定
 ├─ 設定保存先の確認
 └─ パスワード変更
```

---

## ✔ 機能①：プロバイダ選択パネル

### ✅ UI要素

* ドロップダウン：

  ```
  [ Gemini ]
  [ OpenAI ]
  [ Ollama ]
  [ Custom Provider ]
  ```
* モデル名入力欄
* 「保存」ボタン

### ✅ 動作

* 「保存」を押すと `/admin/provider` に POST
* 成功するとトースト表示：

  ```
  ✅ プロバイダ設定を保存しました
  ```

---

## ✔ 機能②：APIキー設定パネル

* 入力欄：`APIキー`
* 「保存」ボタン
* 保存先：`apps/bff/mini/.env`

トースト表示：

```
✅ APIキーを保存しました（サーバーで安全に保管）
```

---

## ✔ 機能③：保存場所を明示

管理画面にテキスト表示：

```
現在の設定ファイル:
apps/bff/mini/.env

UI から保存すると即反映されます。
```

---

## ✔ 機能④：パスワード変更

* 入力欄：
  * `現在のパスワード`
  * `新しいパスワード`
  * `新しいパスワード（確認）`
* 「変更を保存」ボタンで `/admin/password` に POST
* 成功時：`✅ パスワードを変更しました` トースト
* 失敗時：`incorrect_password` 等のコードに応じてエラー表示
* 保存先は `apps/bff/mini/provider.json` の `adminPassword`

---

# ✅ バックエンド（Mini BFF）仕様

### ✅ 保存ファイル

- プロバイダ設定／APIキー … `apps/bff/mini/.env`
- 管理パスワード … `apps/bff/mini/provider.json`

### ✅ APIエンドポイント

#### ✅ 書き込み

```
POST /admin/provider
Body:
{
  provider: string,
  model: string,
  apiKey: string
}
```

動作：

1. `.env` に保存（バックアップは `.env.bak`）
2. メモリ再ロード
3. レスポンス `{ ok: true }`

#### ✅ 読み込み

```
GET /admin/provider
```

→ UI初期表示用に使用

---

#### ✅ 認証

```
POST /admin/login
Body:
{
  password: string
}
```

動作：

1. `.env` の内容を読み込んだ上で、`provider.json` の `adminPassword` と照合
2. 一致すれば `{ status: "ok" }`
3. 不一致の場合は `403 { error: "incorrect_password" }`

---

#### ✅ パスワード変更

```
POST /admin/password
Body:
{
  current_password: string,
  new_password: string
}
```

動作：

1. `provider.json` の `adminPassword` と照合
2. 合致すれば新しいパスワードで上書き（`.env` には影響なし）
3. レスポンス `{ status: "ok" }`
4. 不一致の場合は `403 { error: "incorrect_password" }`

---

### ✅ /chat/v1 の処理

1. `.env` を読み込み、現在のプロバイダ設定を取得
2. provider に応じて LLM呼び出しを切替
3. provider.json は管理パスワードのみ保持

---

# ✅ フロントエンド仕様

### ✅ localStorage 利用

```ts
ADMIN_MODE = true
API_PROVIDER = "GEMINI"
```

### ✅ 管理タブを出す条件

```ts
if (localStorage.getItem("ADMIN_MODE") === "true") { showAdminTab() }
```

### ✅ パスワード入力

初回のみ実施：

```js
const pass = prompt("管理パスワードを入力してください");
if (pass === "suke-nomi") {
    localStorage.setItem("ADMIN_MODE", "true");
}
```

> 実際の実装では `POST /admin/login` を呼び出してサーバー側のパスワードと照合します。

### ✅ パスワード変更フロー

1. 管理タブ内フォームで現在のパスワードと新パスワードを入力
2. `POST /admin/password` を呼び出し (`current_password`, `new_password`)
3. 成功時はトースト表示・フォームはリセット
4. 認証に失敗した場合はエラートーストで「現在のパスワードが違います」

---

# ✅ CODEX 実装手順（指示）

この内容を CODEX へそのまま渡すと、実装できます：

```
1. UIに「管理」タブを追加し、ADMIN_MODE が true の場合のみ表示
2. 管理タブには4項目：
   - プロバイダ設定
   - APIキー設定
   - 設定保存先の確認
   - パスワード変更
3. `.env`（`apps/bff/mini/.env`）にプロバイダ設定を保存できるようにする（`.env.bak` バックアップ付き）
4. /admin/login を BFFに追加（管理パスワードの認証）
5. /admin/provider (GET, POST) を BFFに追加
6. /admin/password を BFFに追加（現在のパスワードを検証して更新）
7. /chat/v1 は `.env` に基づいて LLM呼び替え
8. UIで保存 → `.env` に書き込み → 即反映
9. 成功・失敗時は日本語トーストで通知
```

---

# ✅ この方式のメリット

| 方法 | .env編集 | ターミナル操作 | UI管理 | 新モデル追加 |
| -- | ------ | ------- | ---- | ------ |
| 以前 | 必須     | 必須      | ❌    | ❌      |
| 今回 | ✅不要    | ✅不要     | ✅可能  | ✅可能    |

---

# ✅ 完成時のユーザー体験

✔ 管理タブを開く  
✔ 好きなLLMを選択  
✔ APIキー入力  
✔ 保存  
➡ **即切り替わる**  
➡ もう `.env` やターミナルに触る必要なし

---

必要なら、この仕様を「プロンプト最適化版」や「CODEX専用 英語版」に変換できます。  
まずは、この .sAtd.md を `/docs/ADMIN_LLM_SWITCH.sAtd.md` に保存し、コミットすれば準備完了です。
