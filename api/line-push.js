// グループLINEへの通知Push API
// POST /api/line-push  body: { text }
// トークン/グループIDは Vercel 環境変数で安全に保持（ブラウザには出さない）

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { text } = req.body || {};
  if (!text) { res.status(400).json({ error: 'text が必要です' }); return; }

  const token = process.env.LINE_CHANNEL_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  // 未設定でもアプリの動作を止めない（通知だけスキップ）
  if (!token || !groupId) {
    res.status(200).json({ skipped: true, reason: 'LINE未設定（LINE_CHANNEL_TOKEN / LINE_GROUP_ID）' });
    return;
  }

  try {
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: String(text).slice(0, 4900) }]
      })
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(500).json({ error: `LINE API ${r.status}: ${t.slice(0, 200)}` });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
