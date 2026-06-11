// Digital Twin AI チャット API
// POST /api/dt-chat  body: { question, dt_url, dt_key }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { question, dt_url, dt_key } = req.body || {};
  if (!question || !dt_url || !dt_key) {
    res.status(400).json({ error: 'question / dt_url / dt_key が必要です' });
    return;
  }

  // DT Supabase から直近30件のエントリを取得
  let entries = [];
  try {
    const r = await fetch(
      `${dt_url}/rest/v1/daily_entries?order=entry_date.desc&limit=30&select=entry_date,summary,key_insights,mood,energy_level,stress_level,people_mentioned,recurring_patterns,ai_analysis`,
      { headers: { apikey: dt_key, Authorization: `Bearer ${dt_key}` } }
    );
    if (!r.ok) {
      res.status(403).json({ error: 'DT認証失敗 (Supabase key を確認してください)' });
      return;
    }
    entries = await r.json();
  } catch (e) {
    res.status(500).json({ error: 'Supabase 接続エラー: ' + e.message });
    return;
  }

  // コンテキスト構築
  const context = entries.length > 0
    ? entries.map(e => {
        const insights = (e.key_insights || []).join(' / ');
        const patterns = (e.recurring_patterns || []).join(' / ');
        return `【${e.entry_date}】気分:${e.mood || '-'} エネルギー:${e.energy_level || '-'}/10 ストレス:${e.stress_level || '-'}/10\n` +
          `要約: ${e.summary || '-'}\n` +
          (insights ? `気づき: ${insights}\n` : '') +
          (patterns ? `パターン: ${patterns}` : '');
      }).join('\n\n---\n\n')
    : '（まだ記録がありません）';

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY が Vercel に設定されていません' });
    return;
  }

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `あなたは黒田社長のデジタルツインAIです。以下は黒田社長の音声記録から抽出した日々の記録です。この記録をコンテキストとして、黒田社長の質問に答えてください。黒田社長を深く理解した上で、簡潔で実用的な回答をしてください。\n\n=== 記録 ===\n${context}`,
        messages: [{ role: 'user', content: question }]
      })
    });

    const data = await claudeRes.json();
    if (!claudeRes.ok) {
      res.status(500).json({ error: data.error?.message || 'Claude API エラー' });
      return;
    }
    res.json({ answer: data.content[0].text });
  } catch (e) {
    res.status(500).json({ error: 'Claude API 接続エラー: ' + e.message });
  }
};
