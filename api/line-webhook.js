// LINE Webhook 受け口（セットアップ用）
// 役割: botが参加したグループでメッセージを受けたら、その場に groupId を返信する。
//       管理者はそのIDを Vercel の LINE_GROUP_ID に設定する。
// LINE Developers → Messaging API → Webhook URL に
//   https://keiei.ikkou-e.com/api/line-webhook を設定し、Webhookを有効化する。

module.exports = async (req, res) => {
  // LINEは即時200を期待するため、まず受理
  if (req.method !== 'POST') { res.status(200).send('OK'); return; }

  const token = process.env.LINE_CHANNEL_TOKEN;
  try {
    const events = (req.body && req.body.events) || [];
    for (const ev of events) {
      const src = ev.source || {};
      const id = src.groupId || src.roomId || src.userId || '(不明)';
      const kind = src.groupId ? 'グループ' : (src.roomId ? 'トークルーム' : 'ユーザー');

      // メッセージ受信時、その場にID を返信（セットアップ補助）
      if ((ev.type === 'message' || ev.type === 'join') && ev.replyToken && token) {
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            replyToken: ev.replyToken,
            messages: [{
              type: 'text',
              text: `✅ ${kind}ID:\n${id}\n\nこのIDを管理者に伝えてください（Vercelの LINE_GROUP_ID に設定すると、このグループへ自動通知が届くようになります）。`
            }]
          })
        }).catch(() => {});
      }
    }
  } catch (e) { /* 受理優先：失敗してもLINEには200を返す */ }

  res.status(200).send('OK');
};
