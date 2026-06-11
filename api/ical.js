// IH-SYSTEM Google カレンダー同期用 ICS フィード
// 使い方: /api/ical?staff=<staff_id>&token=<calendar_token>

const SUPABASE_URL = 'https://rhlsimhxmrxpgnafldze.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobHNpbWh4bXJ4cGduYWZsZHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDUxMjUsImV4cCI6MjA5NDIyMTEyNX0.yXKopAuzWMgQvU2bpZHBG4tAstYB0LpXFjx6bLCi85w';

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

// JST の日付+分 → UTC の ICS 日時文字列
function toIcsUtc(dateStr, minutes) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // JST = UTC+9
  const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0) + (minutes - 9 * 60) * 60000;
  const dt = new Date(utcMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
}

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

module.exports = async (req, res) => {
  try {
    const { staff: staffId, token } = req.query;
    if (!staffId || !token) {
      res.status(400).send('Missing staff or token');
      return;
    }

    // トークン検証
    const staffRows = await sbGet(`/staff?id=eq.${encodeURIComponent(staffId)}&calendar_token=eq.${encodeURIComponent(token)}&select=id,name`);
    if (!staffRows || staffRows.length === 0) {
      res.status(403).send('Invalid token');
      return;
    }
    const staff = staffRows[0];

    // 過去14日〜未来60日のスロット
    const now = new Date();
    const from = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
    const to = new Date(now.getTime() + 60 * 86400000).toISOString().slice(0, 10);

    const slots = await sbGet(`/timeline_slots?staff_id=eq.${encodeURIComponent(staffId)}&schedule_date=gte.${from}&schedule_date=lte.${to}&order=schedule_date.asc,start_minutes.asc`);

    // 付箋タイトルをまとめて取得
    const stickyIds = [...new Set(slots.map(s => s.sticky_id).filter(Boolean))];
    let stickyMap = {};
    if (stickyIds.length > 0) {
      const idList = stickyIds.map(id => `"${id}"`).join(',');
      const stickies = await sbGet(`/stickies?id=in.(${stickyIds.join(',')})&select=id,title,description,priority`);
      stickies.forEach(s => { stickyMap[s.id] = s; });
    }

    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//IH-SYSTEM//Timeline//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:IH-SYSTEM ${escapeIcs(staff.name)}`,
      'X-WR-TIMEZONE:Asia/Tokyo'
    ];

    for (const slot of slots) {
      const sticky = stickyMap[slot.sticky_id];
      const title = sticky ? sticky.title : '(削除済み付箋)';
      const prio = sticky?.priority === 'high' ? '🔴 ' : '';
      lines.push(
        'BEGIN:VEVENT',
        `UID:ihslot-${slot.id}@ih-system`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${toIcsUtc(slot.schedule_date, slot.start_minutes)}`,
        `DTEND:${toIcsUtc(slot.schedule_date, slot.start_minutes + slot.duration_minutes)}`,
        `SUMMARY:${prio}${escapeIcs(title)}`,
        sticky?.description ? `DESCRIPTION:${escapeIcs(sticky.description)}` : null,
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');

    const body = lines.filter(Boolean).join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="ih-system.ics"');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(body);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
};
