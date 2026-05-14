# CEO Dashboard - Vercel デプロイメントガイド

## 概要
CEO Dashboard を ikkou-e.com/keiei にデプロイするためのガイドです。

## 前提条件
- Vercel アカウント（https://vercel.com）
- Git リポジトリ（GitHub、GitLab、Bitbucket）
- Node.js 18.x 以上（ローカルテスト用）

## ステップ 1: Vercel にサインアップ
1. https://vercel.com にアクセス
2. GitHub / GitLab / Bitbucket アカウントでサインアップ
3. メール認証を完了

## ステップ 2: プロジェクトをGitにプッシュ
```bash
cd /Users/kurodamanabu/claude _code/thinking-system
git init
git add .
git commit -m "Initial CEO Dashboard deployment"
git remote add origin https://github.com/YOUR_ORG/ceo-dashboard.git
git push -u origin main
```

## ステップ 3: Vercel にプロジェクトをインポート
1. Vercel ダッシュボードで「New Project」をクリック
2. Git リポジトリを選択して接続
3. プロジェクト名を入力（例: ceo-dashboard）
4. デプロイ

## ステップ 4: カスタムドメイン設定
1. Vercel プロジェクトの「Settings」→「Domains」
2. 「Add Domain」をクリック
3. `keiei.ikkou-e.com` を入力
4. DNS 設定を追加（Vercel から指示される）

## ステップ 5: 環境変数設定（必要に応じて）
Settings → Environment Variables で以下を設定：
- `SUPABASE_URL`: Supabase プロジェクト URL
- `SUPABASE_ANON_KEY`: Supabase API キー

## ローカルテスト
```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm start

# ブラウザで http://localhost:3000 を開く
```

## 初期スタッフセットアップ
1. ローカルストレージを初期化するか、管理画面でスタッフを登録
2. 各スタッフに以下を配布：
   - メールアドレス
   - 仮パスワード
3. 初回ログイン時にパスワード変更を要求

## ログイン認証フロー
1. スタッフ管理ページでメールアドレスと仮パスワードを設定
2. ユーザーがログイン画面でメール・仮パスワードで認証
3. パスワード変更ダイアログが表示される
4. 新しいパスワードを設定してログイン完了

## トラブルシューティング

### ログインできない
- メールアドレスとパスワードが一致していることを確認
- スタッフ管理ページでスタッフが登録されているか確認
- ブラウザのキャッシュをクリア

### Vercel にデプロイできない
- package.json と server.js が存在することを確認
- Node.js バージョンが 18.x 以上か確認
- git push が成功しているか確認

### データが保存されない
- ブラウザの localStorage が有効か確認
- ブラウザのプライベートモードを使用していないか確認

## セキュリティに関する注意
- 本番環境では Supabase Auth を導入することを推奨
- API キーは環境変数で管理
- HTTPS は Vercel により自動的に有効化される

## サポート
問題が発生した場合は、以下を確認してください：
- Vercel ログ: Vercel ダッシュボードの「Deployments」
- ローカルログ: `npm start` の出力
