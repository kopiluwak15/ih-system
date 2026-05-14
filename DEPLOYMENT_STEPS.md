# CEO Dashboard - 本番デプロイメント手順

## 🚀 デプロイメント完全ガイド

現在のシステム状態：
- ✅ Git リポジトリ初期化完了
- ✅ server.js (Node.js サーバー) 準備完了
- ✅ vercel.json (Vercel 設定) 準備完了
- ✅ ログイン画面と認証機能実装完了
- ✅ 階層的 KGI 可視化実装完了

---

## ステップ 1: GitHub リポジトリを作成

### 1-1. GitHub にログイン
- https://github.com にアクセス
- ログインしていない場合はログイン

### 1-2. 新規リポジトリを作成
1. GitHub の右上のプラス記号 (+) をクリック
2. 「New repository」を選択
3. リポジトリ名を入力：`ceo-dashboard`
4. 説明（オプション）：「CEO Dashboard - 経営管理システム」
5. 公開 / プライベートを選択（プライベート推奨）
6. 「Create repository」をクリック

### 1-3. リポジトリの URL を確認
- リポジトリの主ページで、緑色の「Code」ボタンをクリック
- HTTPS のリンクをコピー
  - 例：`https://github.com/YOUR_USERNAME/ceo-dashboard.git`

---

## ステップ 2: ローカルからコードを GitHub にプッシュ

### 2-1. ターミナルで以下を実行

```bash
cd /Users/kurodamanabu/claude\ _code/thinking-system

# GitHub リモートを設定
git remote add origin https://github.com/YOUR_USERNAME/ceo-dashboard.git

# メインブランチに変更してプッシュ
git branch -M main
git push -u origin main
```

※ `YOUR_USERNAME` は GitHub のユーザー名に置き換えてください

### 2-2. 認証
- GitHub の認証が求められる場合：
  - GitHub CLI を使用している場合は自動認証
  - Personal Access Token が必要な場合は、GitHub で新規作成して使用

確認：GitHub の リポジトリページをリロードして、ファイルが表示されることを確認

---

## ステップ 3: Vercel にプロジェクトをデプロイ

### 3-1. Vercel アカウントの準備
1. https://vercel.com にアクセス
2. 「Sign Up」をクリック
3. GitHub アカウントでサインアップ（推奨）
4. メール認証を完了

### 3-2. GitHub リポジトリを Vercel に接続
1. Vercel ダッシュボードで「New Project」をクリック
2. 「Import Git Repository」を選択
3. 先ほど作成した `ceo-dashboard` リポジトリを選択
4. リポジトリが見つからない場合：
   - 「Configure Git Integration」をクリック
   - GitHub アプリの認可を完了
   - リポジトリリストを更新

### 3-3. Vercel プロジェクトの設定
1. **Project Name**: `ceo-dashboard`
2. **Framework Preset**: Other（Node.js は自動検出される）
3. **Build and Output Settings**：
   - Build Command: （空白 - build 不要）
   - Output Directory: public
   - Install Command: `npm install`
4. **Environment Variables**（後で設定可能）：
   - SUPABASE_URL: （後で設定）
   - SUPABASE_ANON_KEY: （後で設定）
5. 「Deploy」をクリック

### 3-4. デプロイメント完了を待つ
- Vercel が自動でビルドとデプロイを開始
- 1〜2 分で完了
- デプロイ完了後、`https://ceo-dashboard.vercel.app` でアクセス可能

---

## ステップ 4: カスタムドメインを設定

### 4-1. Vercel でドメイン設定
1. Vercel プロジェクトの「Settings」をクリック
2. 左メニューの「Domains」をクリック
3. 「Add」をクリック
4. ドメイン名を入力：`keiei.ikkou-e.com`
5. 「Add」をクリック

### 4-2. DNS レコードの設定
1. Vercel に表示される DNS レコードをコピー（CNAME または A レコード）
2. ドメイン プロバイダー（お名前.com、ムームードメイン、など）にログイン
3. DNS 設定ページで、Vercel から指示されたレコードを追加
4. 設定が反映されるまで待つ（通常 5〜48 時間）

### 4-3. DNS 反映確認
```bash
# ターミナルで以下を実行
nslookup keiei.ikkou-e.com

# Vercel の IP アドレスが返されることを確認
```

---

## ステップ 5: Supabase Auth の設定

### 5-1. Supabase プロジェクトを作成（新規）
1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. 新規プロジェクトを作成：
   - Organization: 新規作成（例：`cookie-group`）
   - Project name: `ceo-dashboard-auth`
   - Database password: 強力なパスワードを設定
   - Region: 東京（ap-northeast-1）を選択
4. プロジェクト作成完了を待つ

### 5-2. Supabase から認証情報を取得
1. Supabase プロジェクトの左メニュー → 「Settings」
2. 「API」をクリック
3. 以下をコピー：
   - **Project URL**: `https://xxxx.supabase.co`
   - **Anon Public**: `eyJhbGc...`

### 5-3. Vercel に環境変数を設定
1. Vercel プロジェクトの「Settings」→「Environment Variables」
2. 新規追加：
   - **Name**: `SUPABASE_URL`
   - **Value**: Supabase の Project URL をペースト
   - **Environments**: Production, Preview, Development すべてにチェック
3. 「Save」をクリック
4. 同じ手順で 2 番目の環境変数を追加：
   - **Name**: `SUPABASE_ANON_KEY`
   - **Value**: Supabase の Anon Public をペースト

### 5-4. アプリコードで環境変数を使用
ファイル: `js/supabase-client.js`

```javascript
// Supabase クライアント初期化（環境変数から読み込み）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGc...';
```

※ 現在は localStorage ベースの認証なので、後で Supabase Auth に移行します

---

## ステップ 6: ログイン認証の初期化

### 6-1. スタッフを登録
1. `https://keiei.ikkou-e.com` にアクセス（またはデプロイ後の Vercel URL）
2. 画面がログイン画面で表示されることを確認
3. ダッシュボードへは、ブラウザのコンソール（DevTools）で以下を実行して初期化：

```javascript
// ローカルストレージにテストスタッフを追加
const staff = {
  id: 1,
  email: 'ceo@ikkou-e.com',
  password_hash: 'テンポラリーパスワード',
  role: 'admin',
  name: 'CEO',
  hasChangedPassword: false
};

const staffList = JSON.parse(localStorage.getItem('staff_list') || '[]');
staffList.push(staff);
localStorage.setItem('staff_list', JSON.stringify(staffList));
```

### 6-2. 本格運用での Staff 管理
- **スタッフ管理ページ**を実装して、Admin ユーザーがスタッフを登録・パスワード設定
- テンポラリーパスワードを設定したスタッフが、初回ログイン時に新パスワードに変更

---

## ステップ 7: ローカルテスト

### 7-1. ローカルサーバーの起動
```bash
cd /Users/kurodamanabu/claude\ _code/thinking-system
npm start
```

ブラウザで `http://localhost:3000` にアクセス

### 7-2. テスト項目
- [ ] ログイン画面が表示される
- [ ] メール + パスワードでログインできる
- [ ] 初回ログイン時に「パスワード変更」ダイアログが表示される
- [ ] 新しいパスワードを設定できる
- [ ] ダッシュボードが表示される
- [ ] 階層的 KGI 可視化が正しく表示される
- [ ] ナビゲーション（KGI 設定、プロジェクト作成など）が機能する

---

## ステップ 8: 本番環境の確認

### 8-1. 本番 URL でテスト
- ブラウザで `https://keiei.ikkou-e.com` にアクセス
- または `https://ceo-dashboard.vercel.app` でテスト

### 8-2. HTTPS の確認
- URL バーで鍵アイコンが表示される（SSL/TLS 有効）
- Vercel は自動で HTTPS を有効化

### 8-3. ログイン確認
- テストスタッフでログイン
- ダッシュボード機能が正常に動作することを確認

---

## トラブルシューティング

### DNS が反映されない
```bash
# DNS レコードの確認
dig keiei.ikkou-e.com
nslookup keiei.ikkou-e.com

# キャッシュをクリア（Mac）
dscacheutil -flushcache
```

### Vercel デプロイメントが失敗
1. Vercel ダッシュボードの「Deployments」でログを確認
2. Build エラーがないか確認
3. package.json に必要なスクリプトが設定されているか確認

### ログイン画面が表示されない
1. ブラウザのコンソール（F12）でエラーを確認
2. localStorage が有効か確認
3. auth.js が正しく読み込まれているか確認（Network タブ）

### 環境変数が読み込まれない
1. Vercel の環境変数設定を再確認
2. プロジェクトを再デプロイ：Vercel ダッシュボード → Redeploy

---

## 今後のステップ

### フェーズ 1（現在）
- ✅ ローカル実装完了
- ✅ Git リポジトリ作成完了
- 🔄 Vercel デプロイメント（このステップ）

### フェーズ 2（近日）
- Supabase Auth への移行
- スタッフ管理ページの実装
- 多要素認証（MFA）の検討

### フェーズ 3（今後）
- セッション管理の強化
- 監査ログの実装
- バックアップ / リカバリー戦略の構築

---

## サポート

問題が発生した場合：
1. Vercel ダッシュボード → Deployments でビルドログを確認
2. GitHub の リポジトリ → Actions で CI/CD ログを確認
3. ブラウザのコンソール（DevTools）でエラーメッセージを確認

---

**最後に**：デプロイ完了後、スタッフに以下を配布してください：
- ログイン URL: `https://keiei.ikkou-e.com`
- メールアドレス
- テンポラリーパスワード
- 初回ログイン時にパスワード変更が必要なこと
