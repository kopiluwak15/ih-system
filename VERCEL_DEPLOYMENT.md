# Vercel デプロイメント手順

## ✅ Git 準備完了

- ✅ GitHub リポジトリ作成完了：https://github.com/IH-SYSTEM/IH-SYSTEM
- ✅ develop ブランチをプッシュ完了
- ⏳ **Vercel にデプロイ開始**

---

## ステップ 1: Vercel にアクセス

1. https://vercel.com/new にアクセス
2. **「Import Git Repository」** をクリック
3. GitHub アカウントでサインイン（または登録）

---

## ステップ 2: IH-SYSTEM リポジトリを選択

1. GitHub 認可ページで **「Authorize Vercel」** をクリック
2. リポジトリリストから **「IH-SYSTEM」** を選択
3. 「Import」をクリック

---

## ステップ 3: Vercel プロジェクト設定

以下の設定を確認・調整してください：

| 項目 | 設定値 |
|------|--------|
| **Project Name** | `ih-system` |
| **Framework Preset** | Other |
| **Root Directory** | ./ （デフォルト） |
| **Build Command** | （空白） |
| **Output Directory** | public |
| **Install Command** | `npm install` |

**環境変数（オプション - 後で設定可能）:**
- SUPABASE_URL
- SUPABASE_ANON_KEY

---

## ステップ 4: デプロイを開始

1. 上記設定で **「Deploy」** をクリック
2. デプロイメント開始（1〜2 分待機）
3. 完了すると、デプロイ URL が表示されます：
   - 例：`https://ih-system.vercel.app`

---

## ステップ 5: デプロイ確認

ブラウザで以下にアクセス：

```
https://ih-system.vercel.app
```

**確認項目：**
- [ ] ログイン画面が表示される
- [ ] デザインが正しく表示される
- [ ] メール入力欄がある
- [ ] パスワード入力欄がある

---

## ステップ 6: カスタムドメイン設定

### 6-1. Vercel にドメインを追加

1. Vercel プロジェクトダッシュボードを開く
2. **「Settings」** → **「Domains」**
3. **「Add」** をクリック
4. ドメイン: **`keiei.ikkou-e.com`** を入力
5. **「Add」** をクリック

### 6-2. DNS レコードを取得

Vercel が DNS レコードを表示します：
- **Type**: CNAME
- **Name**: keiei
- **Value**: `cname.vercel-dns.com` または Vercel 指定の値

### 6-3. レンタルサーバーで DNS 設定

1. レンタルサーバーのコントロールパネルにログイン
2. **DNS 設定** ページを開く
3. 新規レコードを追加：
   - **ホスト名**: keiei.ikkou-e.com
   - **タイプ**: CNAME
   - **値**: Vercel から指示されたCNAME値
4. **保存**

**反映待機:** 5〜48 時間

---

## ステップ 7: ローカルテスト（オプション）

デプロイ前にローカルで確認：

```bash
cd /Users/kurodamanabu/claude\ _code/thinking-system
npm start
```

ブラウザで `http://localhost:3000` にアクセス

---

## テストスタッフ ログイン情報

デプロイ後、以下でテストできます：

**ブラウザコンソールで実行：**

```javascript
const staff = {
  id: 1,
  email: 'ceo@ikkou-e.com',
  password_hash: 'TestPassword123!',
  role: 'admin',
  name: 'CEO',
  hasChangedPassword: false
};

const staffList = JSON.parse(localStorage.getItem('staff_list') || '[]');
staffList.push(staff);
localStorage.setItem('staff_list', JSON.stringify(staffList));
```

**ログイン：**
- Email: `ceo@ikkou-e.com`
- Password: `TestPassword123!`
- 初回ログイン時に新しいパスワードを設定

---

## トラブルシューティング

### Vercel デプロイメントが失敗
- Vercel ダッシュボードの「Deployments」でログを確認
- package.json が正しく配置されているか確認

### DNS が反映されない
```bash
nslookup keiei.ikkou-e.com
dig keiei.ikkou-e.com
```

### ログイン画面が表示されない
- ブラウザのコンソール（F12）でエラーを確認
- localStorage が有効か確認

---

## 次のステップ

- [ ] Vercel デプロイ完了
- [ ] テスト URL（ih-system.vercel.app）で動作確認
- [ ] カスタムドメイン（keiei.ikkou-e.com）で動作確認
- [ ] スタッフ管理ページでスタッフを登録
- [ ] 本番運用開始
