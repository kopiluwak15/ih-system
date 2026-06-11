/**
 * 🧠 IH-SYSTEM Digital Twin - PLAUD 自動収集パイプライン
 *
 * 役割: 毎晩1:00 AMにGmailからPlaud.aiメールを取得 → Claude API分析 → Supabase保存
 *
 * セットアップ:
 *   1. Google Apps Script (https://script.google.com) で新規プロジェクト作成
 *   2. このファイル全体を貼り付け
 *   3. 下の3つの値を入力
 *   4. トリガー設定: 「dailyAutoProcess」を毎日 0-1時に時間ベースで実行
 *   5. 初回手動実行で testFullProcess() を実行して確認
 */

// ============ 設定（CEO が値を入れる。リポジトリには絶対 commit しない） ============
const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY';   // https://console.anthropic.com で発行
const SUPABASE_URL      = 'YOUR_SUPABASE_URL';        // IH-SYSTEM → 🧠 デジタルツイン → ⚙️ 接続設定 に表示
const SUPABASE_KEY      = 'YOUR_SUPABASE_ANON_KEY';   // 同上
const PLAUD_QUERY       = 'from:noreply@plaud.ai';
const CLAUDE_MODEL      = 'claude-opus-4-7';          // 必要なら "claude-sonnet-4-6" などに

// ============ メイン ============
function dailyAutoProcess() {
  try {
    const email = getLatestPlaudEmail();
    if (!email.success) { Logger.log('❌ ' + email.message); return; }
    if (email.text.length < 100) { Logger.log('⚠️ 本文短すぎ'); return; }

    const alreadyProcessed = isAlreadyProcessed(email.date);
    if (alreadyProcessed) { Logger.log('✅ 既に処理済み (' + email.date + ')'); return; }

    const analysis = analyzeWithClaude(email.text);
    if (analysis.error) { Logger.log('❌ AI分析失敗: ' + analysis.error); return; }

    const saved = saveToSupabase(analysis, email.text, email.date);
    Logger.log(saved.success ? '✅ 保存完了' : '❌ 保存失敗: ' + saved.message);
  } catch (e) {
    Logger.log('❌ エラー: ' + e.toString());
  }
}

// 同じ日のエントリが既にあるか
function isAlreadyProcessed(emailDate) {
  try {
    const dateStr = Utilities.formatDate(emailDate, 'Asia/Tokyo', 'yyyy-MM-dd');
    const res = UrlFetchApp.fetch(
      SUPABASE_URL + '/rest/v1/daily_entries?entry_date=eq.' + dateStr + '&limit=1',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }, muteHttpExceptions: true }
    );
    const arr = JSON.parse(res.getContentText());
    return Array.isArray(arr) && arr.length > 0;
  } catch (e) { return false; }
}

// Gmail から取得
function getLatestPlaudEmail() {
  try {
    const threads = GmailApp.search(PLAUD_QUERY, 0, 1);
    if (threads.length === 0) return { success: false, message: 'Plaudメール無し' };
    const msgs = threads[0].getMessages();
    const latest = msgs[msgs.length - 1];
    let body = latest.getPlainBody() || latest.getBody();
    body = cleanEmailText(body);
    return { success: true, text: body, date: latest.getDate(), subject: latest.getSubject() };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function cleanEmailText(text) {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Claude API で分析
function analyzeWithClaude(text) {
  const prompt = 'あなたはユーザーの完全な理解者です。以下の日中の会話/音声記録を分析し、JSON形式で返してください。\n\n' +
    '【記録テキスト】\n' + text + '\n\n' +
    '以下のスキーマで JSON のみ返してください（コード ブロック不要）:\n' +
    '{\n' +
    '  "summary": "今日全体の要約（200-400字）",\n' +
    '  "primary_category": "メインカテゴリ名（仕事/家族/学習/健康/人間関係/趣味/雑談 など、適切なものを動的に選ぶ）",\n' +
    '  "secondary_categories": ["副カテゴリ1", "副カテゴリ2"],\n' +
    '  "people_mentioned": ["人名1", "人名2"],\n' +
    '  "locations": ["場所1"],\n' +
    '  "mood": "気分の総称（前向き/疲労/集中/不安など）",\n' +
    '  "energy_level": 1-10の整数,\n' +
    '  "stress_level": 1-10の整数,\n' +
    '  "importance": 1-5の整数,\n' +
    '  "key_insights": ["今日の重要な気づき1", "気づき2"],\n' +
    '  "recurring_patterns": ["過去から繰り返されていそうな行動・思考"],\n' +
    '  "ai_analysis": { "themes": ["テーマ1"], "decisions": ["決断1"], "concerns": ["懸念1"] },\n' +
    '  "detected_insights": [\n' +
    '    { "type": "forgotten_important|pattern_recognition|behavior_shift|opportunity|risk|consistency|contradiction|growth", "title": "短い見出し", "description": "詳細", "urgency": "low|medium|high", "ai_commentary": "AIからの所感", "suggested_actions": ["アクション1"] }\n' +
    '  ],\n' +
    '  "people_details": [\n' +
    '    { "name": "人名", "relationship": "関係性推測", "interaction_type": "会話/打ち合わせ/食事など", "context": "今日の文脈" }\n' +
    '  ]\n' +
    '}';

  try {
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      payload: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });
    const status = res.getResponseCode();
    if (status !== 200) return { error: 'API ' + status + ': ' + res.getContentText().slice(0, 200) };
    const data = JSON.parse(res.getContentText());
    let content = data.content[0].text.trim();
    // ```json ... ``` の場合を考慮
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
    return JSON.parse(content);
  } catch (e) {
    return { error: e.toString() };
  }
}

// Supabase に保存
function saveToSupabase(analysis, originalText, emailDate) {
  try {
    const dateStr = Utilities.formatDate(emailDate, 'Asia/Tokyo', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(emailDate, 'Asia/Tokyo', 'HH:mm:ss');

    // 1) カテゴリ upsert
    let categoryId = null;
    if (analysis.primary_category) {
      categoryId = upsertCategory(analysis.primary_category);
    }

    // 2) daily_entries 挿入
    const entryPayload = {
      entry_date: dateStr,
      entry_time: timeStr,
      processed_at: new Date().toISOString(),
      primary_category_id: categoryId,
      secondary_categories: analysis.secondary_categories || [],
      transcription_text: originalText.slice(0, 50000),
      summary: analysis.summary || '',
      detailed_analysis: analysis.ai_analysis || {},
      people_mentioned: analysis.people_mentioned || [],
      locations: analysis.locations || [],
      mood: analysis.mood || null,
      energy_level: analysis.energy_level || null,
      stress_level: analysis.stress_level || null,
      importance: analysis.importance || 3,
      key_insights: analysis.key_insights || [],
      ai_analysis: analysis.ai_analysis || {},
      recurring_patterns: analysis.recurring_patterns || []
    };
    const entryRes = sbInsert('daily_entries', entryPayload);
    const entryId = entryRes[0]?.id;
    if (!entryId) return { success: false, message: 'entry id 取得失敗' };

    // 3) people upsert + entry_people リンク
    (analysis.people_details || []).forEach(p => {
      const personId = upsertPerson(p.name, p.relationship);
      if (personId) {
        sbInsert('entry_people', {
          entry_id: entryId,
          person_id: personId,
          context: p.context || null,
          interaction_type: p.interaction_type || null
        });
      }
    });

    // 4) insights 挿入
    (analysis.detected_insights || []).forEach(ins => {
      sbInsert('insights', {
        insight_type: ins.type || 'pattern_recognition',
        title: ins.title || '(無題)',
        description: ins.description || null,
        urgency: ins.urgency || 'medium',
        importance: 3,
        suggested_actions: ins.suggested_actions || [],
        ai_commentary: ins.ai_commentary || null,
        related_entries: [entryId],
        status: 'new'
      });
    });

    return { success: true, entry_id: entryId };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function upsertCategory(name) {
  try {
    const exists = sbGet('/categories?name=eq.' + encodeURIComponent(name) + '&limit=1');
    if (exists.length > 0) return exists[0].id;
    const created = sbInsert('categories', { name: name, status: 'active', last_activity_date: new Date().toISOString().slice(0,10), activity_count: 0 });
    return created[0]?.id;
  } catch (e) { Logger.log('カテゴリ upsert 失敗: ' + e); return null; }
}

function upsertPerson(name, relationship) {
  if (!name) return null;
  try {
    const exists = sbGet('/people?name=eq.' + encodeURIComponent(name) + '&limit=1');
    if (exists.length > 0) return exists[0].id;
    const today = new Date().toISOString().slice(0,10);
    const created = sbInsert('people', {
      name: name,
      relationship: relationship || null,
      first_mentioned_date: today,
      last_mentioned_date: today,
      mention_count: 1
    });
    return created[0]?.id;
  } catch (e) { Logger.log('人物 upsert 失敗: ' + e); return null; }
}

function sbGet(path) {
  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1' + path, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}

function sbInsert(table, payload) {
  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'post',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code !== 201 && code !== 200) {
    throw new Error(table + ' insert ' + code + ': ' + res.getContentText().slice(0, 200));
  }
  return JSON.parse(res.getContentText());
}

// ============ テスト ============
function testConnection() {
  try {
    const r = sbGet('/categories?limit=1');
    Logger.log('✅ Supabase 接続成功 (categories: ' + r.length + ')');
  } catch (e) { Logger.log('❌ 接続失敗: ' + e); }
}

function testFullProcess() {
  Logger.log('=== テスト実行開始 ===');
  dailyAutoProcess();
  Logger.log('=== 完了 ===');
}
