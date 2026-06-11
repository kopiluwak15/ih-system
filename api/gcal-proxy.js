// Google カレンダー iCal 取得プロキシ（CORS 回避）
// /api/gcal-proxy?url=<encoded ical url>

module.exports = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      res.status(400).send('Missing url');
      return;
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      res.status(400).send('Invalid url');
      return;
    }

    // Google カレンダーのドメインのみ許可（オープンプロキシ化防止）
    const allowedHosts = ['calendar.google.com', 'www.google.com'];
    if (!allowedHosts.includes(parsed.hostname)) {
      res.status(403).send('Host not allowed');
      return;
    }

    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'IH-SYSTEM-Calendar-Sync/1.0' }
    });

    if (!upstream.ok) {
      res.status(upstream.status).send('Upstream error: ' + upstream.status);
      return;
    }

    const body = await upstream.text();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5分キャッシュ
    res.status(200).send(body);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
};
