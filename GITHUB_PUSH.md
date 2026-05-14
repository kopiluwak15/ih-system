# GitHub へのコード プッシュ手順

リポジトリ名: **IH-SYSTEM**

## ステップ 1: GitHub にリポジトリを作成

1. https://github.com/new にアクセス
2. **Repository name:** `IH-SYSTEM`
3. 説明（オプション）: CEO Dashboard - 経営管理システム
4. **Private** を選択（セキュリティ）
5. 「Create repository」をクリック

---

## ステップ 2: リポジトリ URL をコピー

リポジトリ作成後、以下のように表示されます：

```
…or push an existing repository from the command line
```

この画面から以下のコマンドをコピーして、ターミナルで実行してください：

```bash
cd /Users/kurodamanabu/claude\ _code/thinking-system

# GitHub リモートリポジトリを設定
git remote add origin https://github.com/YOUR_USERNAME/IH-SYSTEM.git

# main ブランチに変更してプッシュ
git branch -M main
git push -u origin main
```

※ `YOUR_USERNAME` は自分の GitHub ユーザー名に置き換えてください

---

## ステップ 3: 認証

GitHub の Personal Access Token を要求されます：

### Token を生成する場合：
1. https://github.com/settings/tokens にアクセス
2. 「Generate new token」→「Generate new token (classic)」
3. Token name: `IH-SYSTEM-Deploy`
4. Expiration: 90 days
5. Scopes: **repo** にチェック
6. 「Generate token」をクリック
7. トークンをコピー
8. ターミナルで password 入力時にペースト

---

## ステップ 4: プッシュ完了確認

ターミナルに以下が表示されれば成功：

```
Enumerating objects: ...
Counting objects: 100% ...
Compressing objects: 100% ...
Writing objects: 100% ...
```

GitHub で https://github.com/YOUR_USERNAME/IH-SYSTEM をリロードしてファイルが表示されることを確認

---

**完了後、GitHub のリポジトリ URL を教えてください。**
**例：** `https://github.com/yourname/IH-SYSTEM`

Vercel へのデプロイメントに進みます。
