# グループLINE通知 セットアップ手順

IH-SYSTEM のアクション（日報提出・設計提出・承認・タスク発行・タスク完了）を
業務グループLINEに自動通知する設定です。

## 仕組み
- `/api/line-push` … アプリが叩くと、設定済みグループへ Push 通知を送る（トークンはVercel環境変数で安全に保持）
- `/api/line-webhook` … セットアップ用。グループでメッセージを送ると groupId を返信する

未設定の間は通知がスキップされるだけで、アプリは正常に動きます。

---

## セットアップ手順

### 1. LINE公式アカウント（Messaging API）を作る
1. https://developers.line.biz/ にログイン
2. プロバイダー作成 → 新規チャネル → **Messaging API** を選択
3. チャネル名「IH-SYSTEM通知」等で作成

### 2. チャネルアクセストークンを発行
1. 作成したチャネル → **Messaging API設定** タブ
2. 「チャネルアクセストークン（長期）」を発行してコピー

### 3. Vercel に環境変数を設定
Vercel → ih-system → Settings → Environment Variables
- `LINE_CHANNEL_TOKEN` = 上でコピーしたトークン
- （`LINE_GROUP_ID` は手順5で設定）

→ いったん **Redeploy**

### 4. Webhookを設定して bot をグループに招待
1. Messaging API設定 → **Webhook URL** に
   `https://keiei.ikkou-e.com/api/line-webhook` を設定し、**Webhookの利用をオン**
2. 「応答メッセージ」はオフ推奨（自動応答が邪魔になるため）
3. QRコードから bot を友だち追加し、**業務グループLINEに招待**

### 5. グループIDを取得して設定
1. bot がいるグループで何かメッセージを送信
2. bot が「✅ グループID: Cxxxxxxxx...」と返信する
3. その ID を Vercel の `LINE_GROUP_ID` に設定
4. **Redeploy**

---

## 完了確認
誰かが日報を提出すると、グループLINEに
「📝 日報提出 / ✅完了 N / 🔄継続 N / ⏸見送り N」
のような通知が届けば成功です。

## 通知されるアクション
- 📝 日報の提出
- 📐 KPI/マイルストーン設計の提出（承認待ち）
- ✅ 課題の承認（実行開始）
- 📋 タスク指示の発行
- 🏁 タスクの完了報告
