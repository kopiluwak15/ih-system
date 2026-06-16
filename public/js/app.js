/**
 * IH-SYSTEM Main Application
 * 経営構造化管理システム
 */

const App = {
  state: {
    companies: [],
    businessUnits: [],
    projects: [],
    staff: [],
    notifications: [],
    taskInstructions: [],
    routineTasks: [],
    slogans: [],
    expandedUnits: new Set(),
    currentPage: 'home'
  },

  // ===== Initialization =====
  async init() {
    this.setupNavigation();
    this.setupButtons();
    this.setupSettingsTabs();
    this.setupMobileMenu();
    await this.loadAllData();
    this.renderCurrentPage();
    this.startNotificationPolling();
  },

  setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeSidebar = () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('open');
    };
    btn?.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('open');
    });
    overlay?.addEventListener('click', closeSidebar);
    // ナビ項目クリック後は常にドロワーを閉じる（全画面ドロワー化したため）
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', closeSidebar);
    });
    // ヘッダーのロゴ → ホーム（スローガン）
    document.getElementById('headerHome')?.addEventListener('click', () => {
      this.navigate('home');
      closeSidebar();
    });
  },

  async loadAllData() {
    try {
      const [companies, businessUnits, projects, staff, taskInstructions, routineTasks] = await Promise.all([
        db.getCompanies(),
        db.getBusinessUnits(),
        db.getProjects(),
        db.getAllStaff(),
        db.getTaskInstructions().catch(() => []),
        db.getRoutineTasks({ is_active: true }).catch(() => [])
      ]);
      this.state.companies = companies;
      this.state.businessUnits = businessUnits;
      this.state.projects = projects.filter(p => !p.archived);
      this.state.staff = staff;
      this.state.taskInstructions = taskInstructions.filter(t => !t.archived);
      this.state.routineTasks = routineTasks.filter(r => !r.archived);
      this.state.slogans = await db.getSlogans().catch(() => []);

      if (auth.currentUser?.id) {
        this.state.notifications = await db.getNotifications(auth.currentUser.id);
        this.updateNotificationBadge();
        this.updateApprovalBadge();
        this.updateTaskInstructionBadge();
      }
    } catch (err) {
      console.error('Load error:', err);
      this.toast('データ読み込みエラー: ' + err.message, 'error');
    }
  },

  toggleBusinessUnit(unitId) {
    if (this.state.expandedUnits.has(unitId)) {
      this.state.expandedUnits.delete(unitId);
    } else {
      this.state.expandedUnits.add(unitId);
    }
    if (this.state.currentPage === 'dashboard') this.renderDashboard();
  },

  updateTaskInstructionBadge() {
    // 自分宛で未確認のタスク指示の数を表示
    const myPending = this.state.taskInstructions.filter(t =>
      t.assigned_to === auth.currentUser.id && t.status === 'pending'
    ).length;
    ['taskInstructionBadge', 'taskInstructionBadgeInner'].forEach(bid => {
      const badge = document.getElementById(bid);
      if (!badge) return;
      if (myPending > 0) {
        badge.textContent = myPending;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });
  },

  startNotificationPolling() {
    setInterval(async () => {
      if (!auth.currentUser?.id) return;
      try {
        this.state.notifications = await db.getNotifications(auth.currentUser.id);
        this.updateNotificationBadge();
      } catch (e) { /* silent */ }
    }, 30000);
  },

  updateNotificationBadge() {
    const unread = this.state.notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    if (unread > 0) {
      badge.textContent = unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  updateApprovalBadge() {
    if (!auth.isCEO()) return;
    const count = this.state.projects.filter(p => p.status === 'pending_approval').length;
    ['approvalBadge', 'approvalTabBadge'].forEach(bid => {
      const badge = document.getElementById(bid);
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });
  },

  // ===== Navigation =====
  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.navigate(page);
      });
    });
  },

  navigate(page) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === page));
    this.state.currentPage = page;
    this.renderCurrentPage();
  },

  renderCurrentPage() {
    const renderers = {
      home: () => this.renderHome(),
      dashboard: () => this.renderDashboard(),
      projects: () => this.renderProjects(),
      design: () => this.renderDesignPage(),
      logs: () => this.renderLogs(),
      instructions: () => this.renderInstructionsPage(),
      notifications: () => this.renderNotifications(),
      settings: () => this.renderSettings(),
      'digital-twin': () => this.renderDigitalTwin()
    };
    renderers[this.state.currentPage]?.();
  },

  renderSettings() {
    const activeTab = document.querySelector('.settings-tab.active:not([style*="display: none"])');
    const tabName = activeTab?.dataset.tab || 'my-account';
    this.renderSettingsTab(tabName);
  },

  renderSettingsTab(tabName) {
    if (tabName === 'companies') this.renderCompanies();
    else if (tabName === 'business-units') this.renderBusinessUnits();
    else if (tabName === 'my-account') this.renderMyAccount();
    else if (tabName === 'staff') this.renderStaff();
    else if (tabName === 'slogans') this.renderSlogans();
  },

  setupSettingsTabs() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === tabName));
        this.renderSettingsTab(tabName);
      });
    });
  },

  renderMyAccount() {
    const el = document.getElementById('myAccountContent');
    const me = auth.currentUser;
    const myStaff = this.state.staff.find(s => s.id === me?.id);

    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">👤 アカウント情報</div>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:10px 16px;font-size:13px;">
          <div class="text-muted">氏名</div><div><strong>${me?.name || '-'}</strong></div>
          <div class="text-muted">メール</div><div>${me?.email || '-'}</div>
          <div class="text-muted">権限</div><div><span class="badge ${me?.role === 'ceo' ? 'badge-warning' : 'badge-info'}">${this.roleLabel(me?.role)}</span></div>
        </div>
      </div>

      <div class="card mt-2">
        <div class="card-header">
          <div class="card-title">📥 Google カレンダー → IH-SYSTEM（読み込み）</div>
        </div>
        <p class="text-muted" style="font-size:12px;margin-bottom:12px;line-height:1.7;">
          Google カレンダーの予定をタイムラインに<strong>灰色ブロック</strong>で表示します。<br>
          予定が入っている時間帯が一目で分かり、付箋の配置計画が立てやすくなります。
        </p>
        <div class="form-group">
          <label class="form-label">iCal 形式の非公開 URL</label>
          <input type="text" id="gcalUrl" class="form-input" placeholder="https://calendar.google.com/calendar/ical/..../basic.ics" value="${myStaff?.gcal_ical_url || ''}" style="font-size:11px;">
        </div>
        <div class="flex gap-1">
          <button class="btn btn-primary btn-sm" onclick="App.saveGcalUrl()">💾 保存</button>
          ${myStaff?.gcal_ical_url ? `<button class="btn btn-danger btn-sm" onclick="App.clearGcalUrl()">🗑 解除</button>` : ''}
        </div>
        <details style="margin-top:10px;">
          <summary style="cursor:pointer;font-size:12px;color:var(--primary);font-weight:600;">📖 URL の取得手順</summary>
          <ol style="font-size:12px;color:var(--gray-700);line-height:1.9;margin:10px 0 0 20px;">
            <li>PC で <a href="https://calendar.google.com" target="_blank" style="color:var(--primary);">Google カレンダー</a> を開く</li>
            <li>右上 ⚙ →「設定」</li>
            <li>左の「マイカレンダーの設定」から同期したいカレンダーを選択</li>
            <li>「カレンダーの統合」セクションまでスクロール</li>
            <li><strong>「iCal 形式の非公開 URL」</strong>をコピー</li>
            <li>上の欄に貼り付けて「💾 保存」</li>
          </ol>
          <p style="font-size:11px;color:var(--gray-500);margin-top:8px;">※ この URL は本人のみが知るべき URL です。他人と共有しないでください。</p>
        </details>
      </div>

      <div class="card mt-2">
        <div class="card-header">
          <div class="card-title">📤 IH-SYSTEM → Google カレンダー（書き出し）</div>
        </div>
        <p class="text-muted" style="font-size:12px;margin-bottom:12px;line-height:1.7;">
          タイムラインのスケジュールを Google カレンダーに自動同期できます。<br>
          発行した URL を Google カレンダーに登録すると、数時間ごとに自動で反映されます。
        </p>
        <div id="calSyncArea">
          ${myStaff?.calendar_token ? `
            <div class="form-group">
              <label class="form-label">同期 URL（このURLは他人に教えないでください）</label>
              <div style="display:flex;gap:6px;">
                <input type="text" id="calSyncUrl" class="form-input" readonly value="${location.origin}/api/ical?staff=${me.id}&token=${myStaff.calendar_token}" style="font-size:11px;">
                <button class="btn btn-secondary" onclick="App.copyCalSyncUrl()">📋 コピー</button>
              </div>
            </div>
            <details style="margin-top:10px;">
              <summary style="cursor:pointer;font-size:12px;color:var(--primary);font-weight:600;">📖 Google カレンダーへの登録手順</summary>
              <ol style="font-size:12px;color:var(--gray-700);line-height:1.9;margin:10px 0 0 20px;">
                <li>上の URL を「📋 コピー」</li>
                <li>PC で <a href="https://calendar.google.com" target="_blank" style="color:var(--primary);">Google カレンダー</a> を開く</li>
                <li>左サイドバー「他のカレンダー」の <strong>+</strong> をクリック</li>
                <li><strong>「URL で追加」</strong>を選択</li>
                <li>コピーした URL を貼り付けて「カレンダーを追加」</li>
                <li>「IH-SYSTEM ${me?.name || ''}」カレンダーが追加されます</li>
              </ol>
              <p style="font-size:11px;color:var(--gray-500);margin-top:8px;">※ Google 側の仕様で反映は数時間ごとです（即時ではありません）</p>
            </details>
            <button class="btn btn-sm btn-danger" style="margin-top:12px;" onclick="App.regenerateCalToken()">🔄 URL を再発行（旧URLは無効化）</button>
          ` : `
            <button class="btn btn-primary" onclick="App.generateCalToken()">🔗 同期 URL を発行</button>
          `}
        </div>
      </div>

      <div class="card mt-2">
        <div class="card-header">
          <div class="card-title">🔒 パスワード変更</div>
        </div>
        <div class="form-group">
          <label class="form-label">現在のパスワード</label>
          <input type="password" id="pwd_current" class="form-input" autocomplete="current-password">
        </div>
        <div class="form-group">
          <label class="form-label">新しいパスワード（8文字以上）</label>
          <input type="password" id="pwd_new" class="form-input" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label">新しいパスワード（確認）</label>
          <input type="password" id="pwd_new_confirm" class="form-input" autocomplete="new-password">
        </div>
        <button class="btn btn-primary" onclick="App.changeMyPassword()">🔒 パスワードを変更</button>
      </div>
    `;
  },

  // ===== Google カレンダー読み込み（インポート） =====
  async saveGcalUrl() {
    const url = document.getElementById('gcalUrl')?.value.trim();
    if (!url) { this.toast('URL を入力してください', 'error'); return; }
    if (!url.includes('calendar.google.com')) {
      this.toast('Google カレンダーの iCal URL を入力してください', 'error');
      return;
    }
    try {
      await db.updateStaff(auth.currentUser.id, { gcal_ical_url: url });
      sessionStorage.removeItem('gcal_cache');
      await this.loadAllData();
      this.renderMyAccount();
      this.toast('Google カレンダー URL を保存しました');
    } catch (e) {
      this.toast('エラー: ' + e.message + '（gcal_ical_url カラム未作成の可能性）', 'error');
    }
  },

  async clearGcalUrl() {
    if (!confirm('Google カレンダーの読み込みを解除しますか？')) return;
    try {
      await db.updateStaff(auth.currentUser.id, { gcal_ical_url: null });
      sessionStorage.removeItem('gcal_cache');
      await this.loadAllData();
      this.renderMyAccount();
      this.toast('解除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // ICS テキストを取得（5分 sessionStorage キャッシュ）
  async fetchGcalIcs() {
    const myStaff = this.state.staff.find(s => s.id === auth.currentUser.id);
    const url = myStaff?.gcal_ical_url;
    if (!url) return null;

    try {
      const cached = JSON.parse(sessionStorage.getItem('gcal_cache') || 'null');
      if (cached && cached.url === url && Date.now() - cached.at < 5 * 60 * 1000) {
        return cached.ics;
      }
    } catch {}

    try {
      const res = await fetch('/api/gcal-proxy?url=' + encodeURIComponent(url));
      if (!res.ok) return null;
      const ics = await res.text();
      try {
        sessionStorage.setItem('gcal_cache', JSON.stringify({ url, at: Date.now(), ics }));
      } catch {}
      return ics;
    } catch {
      return null;
    }
  },

  // ICS をパースして対象日のイベント（分単位）を返す
  parseGcalEventsForDate(icsText, dateStr) {
    if (!icsText) return [];
    // 行の折り返し（RFC5545: 行頭スペースは継続行）を結合
    const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);

    const events = [];
    let cur = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
      if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
      if (!cur) continue;
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const keyPart = line.slice(0, idx);
      const value = line.slice(idx + 1);
      const key = keyPart.split(';')[0];
      if (key === 'DTSTART') cur.dtstart = { raw: value, params: keyPart };
      else if (key === 'DTEND') cur.dtend = { raw: value, params: keyPart };
      else if (key === 'SUMMARY') cur.summary = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ');
      else if (key === 'RRULE') cur.rrule = value;
      else if (key === 'EXDATE') (cur.exdates = cur.exdates || []).push(value);
      else if (key === 'STATUS') cur.status = value;
    }

    const target = new Date(dateStr + 'T00:00:00+09:00');
    const targetYmd = dateStr.replace(/-/g, '');
    const result = [];

    // ICS 日時 → JST の {ymd, minutes} に変換
    const parseDt = (dt) => {
      if (!dt) return null;
      const raw = dt.raw;
      const isDateOnly = /^\d{8}$/.test(raw) || dt.params.includes('VALUE=DATE');
      if (isDateOnly) {
        return { ymd: raw.slice(0, 8), minutes: 0, allDay: true };
      }
      const m = raw.match(/^(\d{8})T(\d{2})(\d{2})\d{2}(Z?)$/);
      if (!m) return null;
      if (m[4] === 'Z') {
        // UTC → JST (+9h)
        const y = +m[1].slice(0, 4), mo = +m[1].slice(4, 6), d = +m[1].slice(6, 8);
        const utc = Date.UTC(y, mo - 1, d, +m[2], +m[3]);
        const jst = new Date(utc + 9 * 3600000);
        const pad = (n) => String(n).padStart(2, '0');
        return {
          ymd: `${jst.getUTCFullYear()}${pad(jst.getUTCMonth() + 1)}${pad(jst.getUTCDate())}`,
          minutes: jst.getUTCHours() * 60 + jst.getUTCMinutes(),
          allDay: false
        };
      }
      // TZID 付き（多くは Asia/Tokyo）はそのままローカル扱い
      return { ymd: m[1], minutes: (+m[2]) * 60 + (+m[3]), allDay: false };
    };

    for (const ev of events) {
      if (ev.status === 'CANCELLED') continue;
      const start = parseDt(ev.dtstart);
      if (!start) continue;
      const end = parseDt(ev.dtend);
      const durMin = end && !start.allDay
        ? this.icsDiffMinutes(start, end)
        : (start.allDay ? 1440 : 60);

      let occursToday = false;

      if (ev.rrule) {
        occursToday = this.rruleMatchesDate(ev.rrule, start.ymd, targetYmd);
        // EXDATE 除外
        if (occursToday && ev.exdates) {
          const excluded = ev.exdates.some(ex => ex.replace(/[^0-9]/g, '').startsWith(targetYmd));
          if (excluded) occursToday = false;
        }
      } else {
        occursToday = start.ymd === targetYmd;
      }

      if (occursToday) {
        result.push({
          title: ev.summary || '(無題)',
          startMinutes: start.allDay ? 0 : start.minutes,
          durationMinutes: Math.min(durMin, 1440),
          allDay: start.allDay
        });
      }
    }
    return result;
  },

  icsDiffMinutes(start, end) {
    const toMs = (x) => {
      const y = +x.ymd.slice(0, 4), m = +x.ymd.slice(4, 6), d = +x.ymd.slice(6, 8);
      return Date.UTC(y, m - 1, d) + x.minutes * 60000;
    };
    const diff = Math.round((toMs(end) - toMs(start)) / 60000);
    return diff > 0 ? diff : 60;
  },

  // 簡易 RRULE 判定（DAILY/WEEKLY/MONTHLY、INTERVAL、UNTIL、BYDAY 対応）
  rruleMatchesDate(rrule, startYmd, targetYmd) {
    if (targetYmd < startYmd) return false;
    const parts = {};
    rrule.split(';').forEach(p => {
      const [k, v] = p.split('=');
      parts[k] = v;
    });
    const freq = parts.FREQ;
    const interval = parseInt(parts.INTERVAL || '1');
    if (parts.UNTIL) {
      const until = parts.UNTIL.replace(/[^0-9]/g, '').slice(0, 8);
      if (targetYmd > until) return false;
    }

    const toDate = (ymd) => new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8));
    const sd = toDate(startYmd);
    const td = toDate(targetYmd);
    const dayDiff = Math.round((td - sd) / 86400000);

    if (freq === 'DAILY') {
      if (parts.COUNT && dayDiff / interval >= parseInt(parts.COUNT)) return false;
      return dayDiff % interval === 0;
    }
    if (freq === 'WEEKLY') {
      const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const targetDow = dayMap[td.getDay()];
      const bydays = parts.BYDAY ? parts.BYDAY.split(',') : [dayMap[sd.getDay()]];
      if (!bydays.includes(targetDow)) return false;
      const weekDiff = Math.floor(dayDiff / 7);
      if (parts.COUNT && weekDiff / interval >= parseInt(parts.COUNT)) return false;
      return weekDiff % interval === 0 || dayDiff % 7 !== 0 ? (Math.floor(dayDiff / 7) % interval === 0) : true;
    }
    if (freq === 'MONTHLY') {
      const monthDiff = (td.getFullYear() - sd.getFullYear()) * 12 + (td.getMonth() - sd.getMonth());
      if (monthDiff % interval !== 0) return false;
      if (parts.BYMONTHDAY) return parts.BYMONTHDAY.split(',').includes(String(td.getDate()));
      return td.getDate() === sd.getDate();
    }
    return false;
  },

  // タイムラインに Google 予定を灰色ブロックで描画
  renderGcalBlocks(events) {
    const tl = document.getElementById('tlTimeline');
    if (!tl) return;
    const rowH = 24;

    for (const ev of events) {
      if (ev.allDay) continue; // 終日はブロック表示しない（ヘッダーに表示）
      // 15分にスナップ（下方向に拡張）
      const snapStart = Math.floor(ev.startMinutes / 15) * 15;
      const startRow = tl.querySelector(`.tl-row[data-min="${snapStart}"]`);
      if (!startRow) continue;
      const slotEl = startRow.querySelector('.tl-row-slot');
      if (!slotEl) continue;

      const heightPx = Math.max(16, (ev.durationMinutes / 15) * rowH);
      const sh = String(Math.floor(ev.startMinutes / 60)).padStart(2, '0');
      const sm = String(ev.startMinutes % 60).padStart(2, '0');
      const endMin = ev.startMinutes + ev.durationMinutes;
      const eh = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
      const em = String(endMin % 60).padStart(2, '0');

      const div = document.createElement('div');
      div.className = 'tl-gcal' + (ev.durationMinutes <= 30 ? ' compact' : '');
      div.style.height = heightPx + 'px';
      div.title = `📅 Google: ${ev.title}（${sh}:${sm}-${eh}:${em}）`;
      div.innerHTML = `<span class="tl-gcal-title">📅 ${ev.title}</span><span class="tl-gcal-time">${sh}:${sm}-${eh}:${em}</span>`;
      slotEl.appendChild(div);
    }
  },

  // Google カレンダー同期トークン
  async generateCalToken() {
    try {
      const token = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '');
      await db.updateStaff(auth.currentUser.id, { calendar_token: token });
      await this.loadAllData();
      this.renderMyAccount();
      this.toast('同期 URL を発行しました');
    } catch (e) {
      this.toast('エラー: ' + e.message + '（calendar_token カラム未作成の可能性）', 'error');
    }
  },

  async regenerateCalToken() {
    if (!confirm('URL を再発行すると、Google カレンダーに登録済みの旧 URL は無効になります。\nよろしいですか？')) return;
    await this.generateCalToken();
  },

  copyCalSyncUrl() {
    const input = document.getElementById('calSyncUrl');
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      this.toast('URL をコピーしました');
    }).catch(() => {
      document.execCommand('copy');
      this.toast('URL をコピーしました');
    });
  },

  // ============================================================
  // 🧠 Digital Twin（CEO 専用）
  // 別 Supabase プロジェクトに分離。CEO のブラウザ localStorage のみに URL/Key 保存
  // ============================================================
  dtCfg() {
    return {
      url: localStorage.getItem('dt_supabase_url') || '',
      key: localStorage.getItem('dt_supabase_key') || ''
    };
  },

  async dtFetch(path) {
    const { url, key } = this.dtCfg();
    if (!url || !key) throw new Error('接続設定未完了');
    const res = await fetch(`${url}/rest/v1${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async renderDigitalTwin() {
    if (!auth.isCEO()) {
      const pane = document.getElementById('digital-twin');
      if (pane) pane.querySelector('.dt-tab-pane.active').innerHTML = '<div class="text-muted" style="padding:40px;text-align:center;">アクセス権がありません</div>';
      return;
    }
    this.setupDtTabs();
    const active = document.querySelector('.dt-tab.active');
    const tabName = active?.dataset.tab || 'dashboard';
    // 接続未設定なら強制的に config へ
    const { url, key } = this.dtCfg();
    if (!url || !key) {
      document.querySelectorAll('.dt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'config'));
      document.querySelectorAll('.dt-tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById('dtTabConfig').classList.add('active');
      this.renderDtConfig();
      return;
    }
    await this.dispatchDtTab(tabName);
  },

  setupDtTabs() {
    if (this._dtTabsSetup) return;
    this._dtTabsSetup = true;
    document.querySelectorAll('.dt-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.dt-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.dt-tab-pane').forEach(p => p.classList.remove('active'));
        const tabName = tab.dataset.tab;
        const paneId = 'dtTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
        document.getElementById(paneId)?.classList.add('active');
        this.dispatchDtTab(tabName);
      });
    });
  },

  async dispatchDtTab(tabName) {
    try {
      if (tabName === 'dashboard') await this.renderDtDashboard();
      else if (tabName === 'entries') await this.renderDtEntries();
      else if (tabName === 'insights') await this.renderDtInsights();
      else if (tabName === 'patterns') await this.renderDtPatterns();
      else if (tabName === 'people') await this.renderDtPeople();
      else if (tabName === 'chat') this.renderDtChat();
      else if (tabName === 'logs') await this.renderDtLogs();
      else if (tabName === 'config') this.renderDtConfig();
    } catch (e) {
      this.dtShowError(tabName, e.message);
    }
  },

  dtShowError(tabName, msg) {
    const paneId = 'dtTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const pane = document.getElementById(paneId);
    if (pane) pane.innerHTML = `<div class="card" style="border-color:var(--danger);"><div style="color:var(--danger);font-size:13px;">読み込みエラー: ${msg}</div></div>`;
  },

  renderDtConfig() {
    const pane = document.getElementById('dtTabConfig');
    const { url, key } = this.dtCfg();
    pane.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg, #dbeafe, #bfdbfe);">
        <div style="font-weight:700;font-size:14px;color:#1e3a8a;margin-bottom:6px;">🔐 厳重に分離されています</div>
        <p style="font-size:12px;color:#1e40af;line-height:1.7;">
          このページのデータは <strong>IH-SYSTEM とは別の Supabase プロジェクト</strong>に保存されています。<br>
          URL と Key は <strong>このブラウザの localStorage のみに保存</strong>され、コード・GitHub・他スタッフには一切露出しません。
        </p>
      </div>

      <div class="card mt-2">
        <div class="card-header"><div class="card-title">⚙️ 接続設定</div></div>
        <div class="form-group">
          <label class="form-label">Supabase URL（API URL）</label>
          <input type="text" id="dtCfgUrl" class="form-input" placeholder="https://xxxxx.supabase.co" value="${url}">
          <p style="font-size:11px;color:var(--gray-600);margin-top:4px;line-height:1.6;">
            ✅ <strong>形式</strong>: <code style="background:var(--gray-100);padding:1px 4px;border-radius:3px;">https://〇〇.supabase.co</code><br>
            ❌ ダッシュボード URL（<code>supabase.com/dashboard/...</code>）ではありません<br>
            📍 <strong>例（デジタルツイン専用 DB）</strong>: <code style="background:#dbeafe;padding:1px 4px;border-radius:3px;color:#1e3a8a;">https://jbgqwdyvqpajbavbxems.supabase.co</code>
          </p>
        </div>
        <div class="form-group">
          <label class="form-label">Supabase Anon Key</label>
          <input type="password" id="dtCfgKey" class="form-input" placeholder="eyJhbGc..." value="${key}">
          <p style="font-size:11px;color:var(--gray-600);margin-top:4px;line-height:1.6;">
            Project Settings → API → <strong>anon public</strong> の値（"eyJhbGc..." で始まる長いキー）
          </p>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-primary" onclick="App.saveDtConfig()">💾 保存</button>
          <button class="btn btn-secondary" onclick="App.testDtConnection()">🔌 接続テスト</button>
          ${url || key ? '<button class="btn btn-danger" onclick="App.clearDtConfig()">🗑 解除</button>' : ''}
        </div>
        <div id="dtCfgResult" style="margin-top:10px;"></div>
      </div>

      <div class="card mt-2" style="background:var(--gray-50);">
        <div class="card-header"><div class="card-title">📋 GAS（Google Apps Script）セットアップ</div></div>
        <p style="font-size:12px;color:var(--gray-700);line-height:1.7;">
          PLAUD → Gmail → Apps Script → Claude API → Supabase の自動パイプラインです。<br>
          毎晩 1:00 に自動で1日分の音声記録を AI 分析して、このページに反映されます。
        </p>
        <p style="font-size:12px;color:var(--gray-700);margin-top:8px;">
          GAS コードは <code style="background:var(--gray-100);padding:2px 6px;border-radius:4px;">/scripts/gas-digital-twin.gs</code> に格納予定。<br>
          設定する 3 つの値：<br>
          1. <strong>ANTHROPIC_API_KEY</strong>（<a href="https://console.anthropic.com" target="_blank" style="color:var(--primary);">console.anthropic.com</a> で発行）<br>
          2. <strong>SUPABASE_URL</strong>（上の URL と同じ）<br>
          3. <strong>SUPABASE_KEY</strong>（上の Key と同じ）
        </p>
      </div>
    `;
  },

  saveDtConfig() {
    let url = document.getElementById('dtCfgUrl').value.trim();
    const key = document.getElementById('dtCfgKey').value.trim();
    if (!url || !key) { this.toast('URL と Key の両方が必要', 'error'); return; }

    // ダッシュボード URL を入れたら API URL に自動修正
    const dashMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
    if (dashMatch) {
      url = `https://${dashMatch[1]}.supabase.co`;
      this.toast('ダッシュボード URL を API URL に自動修正しました', 'warning');
    }
    // 末尾スラッシュ削除
    url = url.replace(/\/+$/, '');
    // 形式チェック
    if (!/^https:\/\/[a-z0-9]+\.supabase\.(co|in)$/i.test(url)) {
      this.toast('URL 形式が不正です（例: https://xxxxx.supabase.co）', 'error');
      return;
    }

    localStorage.setItem('dt_supabase_url', url);
    localStorage.setItem('dt_supabase_key', key);
    this.toast('保存しました');
    this.renderDtConfig();
  },

  clearDtConfig() {
    if (!confirm('接続設定を解除しますか？')) return;
    localStorage.removeItem('dt_supabase_url');
    localStorage.removeItem('dt_supabase_key');
    this.toast('解除しました');
    this.renderDtConfig();
  },

  async testDtConnection() {
    const resultEl = document.getElementById('dtCfgResult');
    resultEl.innerHTML = '<div style="color:var(--gray-500);font-size:12px;">接続中...</div>';
    try {
      const url = document.getElementById('dtCfgUrl').value.trim();
      const key = document.getElementById('dtCfgKey').value.trim();
      const res = await fetch(`${url}/rest/v1/categories?limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      resultEl.innerHTML = `<div style="color:var(--success);font-size:13px;font-weight:600;">✅ 接続成功（categories テーブル ${data.length} 件）</div>`;
    } catch (e) {
      resultEl.innerHTML = `<div style="color:var(--danger);font-size:13px;">❌ 接続失敗: ${e.message}</div>`;
    }
  },

  async renderDtDashboard() {
    const pane = document.getElementById('dtTabDashboard');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';

    const [entries, insights, patterns, people, profile] = await Promise.all([
      this.dtFetch('/daily_entries?order=entry_date.desc&limit=200').catch(() => []),
      this.dtFetch('/insights?status=in.(new,noted)&order=created_at.desc&limit=10').catch(() => []),
      this.dtFetch('/patterns?order=detected_occurrences.desc&limit=5').catch(() => []),
      this.dtFetch('/people?order=mention_count.desc&limit=10').catch(() => []),
      this.dtFetch('/user_profile?limit=1').catch(() => [])
    ]);

    const recent7 = entries.filter(e => {
      const d = new Date(e.entry_date);
      return (Date.now() - d.getTime()) <= 7 * 86400000;
    });
    const recent30 = entries.filter(e => {
      const d = new Date(e.entry_date);
      return (Date.now() - d.getTime()) <= 30 * 86400000;
    });

    const avg = (arr, k) => {
      const vals = arr.filter(x => x[k] != null).map(x => x[k]);
      return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null;
    };
    const mood7 = avg(recent7, 'energy_level');
    const stress7 = avg(recent7, 'stress_level');

    pane.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">📚 累計エントリ</div>
          <div class="stat-value">${entries.length}</div>
          <div class="stat-trend">直近30日: ${recent30.length}件</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💡 新着インサイト</div>
          <div class="stat-value">${insights.length}</div>
          <div class="stat-trend">未確認</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">⚡ エネルギー（7日平均）</div>
          <div class="stat-value">${mood7 ?? '-'}</div>
          <div class="stat-trend">/ 10</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">😰 ストレス（7日平均）</div>
          <div class="stat-value" style="color:${stress7 >= 7 ? 'var(--danger)' : stress7 >= 5 ? 'var(--warning)' : 'var(--success)'};">${stress7 ?? '-'}</div>
          <div class="stat-trend">/ 10</div>
        </div>
      </div>

      ${entries.length === 0 ? `
        <div class="card" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#f59e0b;">
          <div style="font-weight:700;font-size:14px;color:#92400e;">🌱 まだデータがありません</div>
          <p style="font-size:13px;color:#78350f;margin-top:6px;line-height:1.7;">
            ⚙️ 接続設定 タブで Supabase URL/Key を保存し、<br>
            Google Apps Script で PLAUD パイプラインを有効化してください。<br>
            毎晩 1:00 に自動でデータが流れ始めます。
          </p>
        </div>
      ` : ''}

      ${insights.length > 0 ? `
        <h3 style="font-size:15px;margin:16px 0 8px;">💡 最新インサイト</h3>
        ${insights.slice(0, 5).map(i => `<div class="card" style="padding:10px 14px;margin-bottom:6px;border-left:4px solid ${i.urgency === 'high' ? 'var(--danger)' : i.urgency === 'medium' ? 'var(--warning)' : 'var(--gray-300)'};">
          <div style="font-weight:600;font-size:13px;">${i.title}</div>
          ${i.description ? `<div style="font-size:12px;color:var(--gray-700);margin-top:4px;">${i.description}</div>` : ''}
        </div>`).join('')}
      ` : ''}

      ${people.length > 0 ? `
        <h3 style="font-size:15px;margin:16px 0 8px;">👥 主要人物</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${people.slice(0, 10).map(p => `<span class="badge badge-info">${p.name}（${p.mention_count}回）</span>`).join('')}
        </div>
      ` : ''}
    `;
  },

  async renderDtEntries() {
    const pane = document.getElementById('dtTabEntries');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';
    const entries = await this.dtFetch('/daily_entries?order=entry_date.desc&limit=100');

    if (entries.length === 0) {
      pane.innerHTML = this.emptyState('📅', 'エントリなし', 'GAS が深夜に自動で追加します');
      return;
    }

    pane.innerHTML = entries.map(e => `<div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">${e.entry_date}${e.entry_time ? ' ' + e.entry_time.slice(0, 5) : ''}</div>
          <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
            ${e.mood ? `<span class="badge badge-gray">😊 ${e.mood}</span>` : ''}
            ${e.energy_level != null ? `<span class="badge badge-info">⚡ ${e.energy_level}/10</span>` : ''}
            ${e.stress_level != null ? `<span class="badge ${e.stress_level >= 7 ? 'badge-danger' : 'badge-warning'}">😰 ${e.stress_level}/10</span>` : ''}
            ${e.importance ? `<span class="badge badge-success">★ ${e.importance}</span>` : ''}
          </div>
        </div>
      </div>
      ${e.summary ? `<div style="font-size:13px;color:var(--gray-800);line-height:1.7;margin-top:6px;">${e.summary}</div>` : ''}
      ${e.people_mentioned?.length ? `<div style="margin-top:8px;font-size:11px;"><strong>👥</strong> ${e.people_mentioned.join(' / ')}</div>` : ''}
      ${e.key_insights?.length ? `<div style="margin-top:6px;padding:8px 10px;background:var(--primary-light);border-radius:6px;font-size:12px;"><strong>💡 気づき:</strong> ${e.key_insights.join(' / ')}</div>` : ''}
      ${e.locations?.length ? `<div style="margin-top:6px;font-size:11px;color:var(--gray-500);">📍 ${e.locations.join(' / ')}</div>` : ''}
    </div>`).join('');
  },

  async renderDtInsights() {
    const pane = document.getElementById('dtTabInsights');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';
    const insights = await this.dtFetch('/insights?order=created_at.desc&limit=50');
    if (insights.length === 0) {
      pane.innerHTML = this.emptyState('💡', 'インサイトなし', 'AI が分析してここに追加します');
      return;
    }
    const typeIcons = {
      forgotten_important: '🚨', pattern_recognition: '🔄', behavior_shift: '🔁',
      opportunity: '✨', risk: '⚠️', consistency: '✅', contradiction: '⚖️', growth: '🌱'
    };
    pane.innerHTML = insights.map(i => `<div class="card" style="border-left:5px solid ${i.urgency === 'high' ? 'var(--danger)' : i.urgency === 'medium' ? 'var(--warning)' : 'var(--gray-300)'};">
      <div class="card-header">
        <div>
          <div class="card-title">${typeIcons[i.insight_type] || '💡'} ${i.title}</div>
          <div style="font-size:11px;color:var(--gray-500);margin-top:2px;">${i.insight_type} ・ ${this.formatDate(i.created_at)}</div>
        </div>
        <span class="badge ${i.status === 'new' ? 'badge-info' : i.status === 'actioned' ? 'badge-success' : 'badge-gray'}">${i.status}</span>
      </div>
      ${i.description ? `<div style="font-size:13px;color:var(--gray-700);line-height:1.7;">${i.description}</div>` : ''}
      ${i.ai_commentary ? `<div style="margin-top:8px;padding:8px 10px;background:var(--primary-light);border-radius:6px;font-size:12px;"><strong>🤖 AI:</strong> ${i.ai_commentary}</div>` : ''}
      ${i.suggested_actions?.length ? `<div style="margin-top:6px;font-size:12px;"><strong>💡 提案:</strong> ${i.suggested_actions.join(' / ')}</div>` : ''}
    </div>`).join('');
  },

  async renderDtPatterns() {
    const pane = document.getElementById('dtTabPatterns');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';
    const patterns = await this.dtFetch('/patterns?order=detected_occurrences.desc&limit=30');
    if (patterns.length === 0) {
      pane.innerHTML = this.emptyState('🔄', 'パターンなし', 'AI が繰り返し検出してここに追加します');
      return;
    }
    pane.innerHTML = patterns.map(p => `<div class="card">
      <div class="card-header">
        <div class="card-title">${p.is_concerning ? '⚠️ ' : '🔄 '}${p.pattern_name}</div>
        <span class="badge badge-info">${p.detected_occurrences}回</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        ${p.pattern_type ? `<span class="badge badge-gray">${p.pattern_type}</span>` : ''}
        ${p.frequency ? `<span class="badge badge-info">${p.frequency}</span>` : ''}
        ${p.confidence_level != null ? `<span class="badge badge-success">信頼度 ${Math.round(p.confidence_level * 100)}%</span>` : ''}
      </div>
      ${p.description ? `<div style="font-size:13px;color:var(--gray-700);line-height:1.7;">${p.description}</div>` : ''}
      ${p.trigger ? `<div style="margin-top:6px;font-size:12px;"><strong>📍 きっかけ:</strong> ${p.trigger}</div>` : ''}
      ${p.response ? `<div style="margin-top:4px;font-size:12px;"><strong>↪️ 反応:</strong> ${p.response}</div>` : ''}
    </div>`).join('');
  },

  async renderDtPeople() {
    const pane = document.getElementById('dtTabPeople');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';
    const people = await this.dtFetch('/people?order=mention_count.desc&limit=100');
    if (people.length === 0) {
      pane.innerHTML = this.emptyState('👥', '人物なし', '会話に出てくる人物が自動で蓄積されます');
      return;
    }
    pane.innerHTML = `<div class="bu-grid">${people.map(p => `<div class="bu-card">
      <div class="bu-card-main">
        <div class="bu-card-left">
          <div class="bu-card-name">${p.name}</div>
          <div class="bu-card-meta">${p.relationship || '関係未分類'} ・ ${p.mention_count}回</div>
        </div>
      </div>
      ${p.last_mentioned_date ? `<div style="font-size:10px;color:var(--gray-500);margin-top:4px;">最終言及: ${p.last_mentioned_date}</div>` : ''}
      ${p.context_notes ? `<div style="font-size:11px;color:var(--gray-700);margin-top:6px;padding:6px 8px;background:var(--gray-50);border-radius:4px;">${p.context_notes}</div>` : ''}
    </div>`).join('')}</div>`;
  },

  // ── 💬 AI チャット ──────────────────────────────────────────
  renderDtChat() {
    const pane = document.getElementById('dtTabChat');
    pane.innerHTML = `
      <div style="max-width:700px;margin:0 auto;padding:16px 0;">
        <p style="font-size:12px;color:var(--gray-500);margin-bottom:16px;">過去の記録をコンテキストとして Claude に質問できます。<br>※ Vercel に ANTHROPIC_API_KEY の設定が必要です。</p>
        <div id="dtChatHistory" style="min-height:80px;max-height:400px;overflow-y:auto;margin-bottom:12px;display:flex;flex-direction:column;gap:10px;"></div>
        <div style="display:flex;gap:8px;">
          <textarea id="dtChatInput" class="form-input" rows="2" placeholder="例）最近ストレスが高い日はどんな共通点がありますか？" style="flex:1;resize:none;"></textarea>
          <button class="btn btn-primary" onclick="App.sendDtChat()" style="white-space:nowrap;align-self:flex-end;">送信</button>
        </div>
      </div>`;
    document.getElementById('dtChatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) App.sendDtChat();
    });
  },

  async sendDtChat() {
    const input = document.getElementById('dtChatInput');
    const question = input.value.trim();
    if (!question) return;
    const { url, key } = this.dtCfg();
    if (!url || !key) { this.toast('接続設定が未完了です', 'error'); return; }

    const history = document.getElementById('dtChatHistory');
    history.insertAdjacentHTML('beforeend', `<div style="align-self:flex-end;background:var(--primary);color:#fff;padding:8px 12px;border-radius:12px 12px 2px 12px;max-width:80%;font-size:13px;">${this.esc(question)}</div>`);
    history.insertAdjacentHTML('beforeend', `<div id="dtChatThinking" style="align-self:flex-start;color:var(--gray-500);font-size:12px;">考え中...</div>`);
    history.scrollTop = history.scrollHeight;
    input.value = '';
    input.disabled = true;

    try {
      const res = await fetch('/api/dt-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, dt_url: url, dt_key: key })
      });
      const data = await res.json();
      document.getElementById('dtChatThinking')?.remove();
      if (data.error) throw new Error(data.error);
      history.insertAdjacentHTML('beforeend', `<div style="align-self:flex-start;background:var(--gray-100);padding:10px 14px;border-radius:2px 12px 12px 12px;max-width:85%;font-size:13px;line-height:1.6;white-space:pre-wrap;">${this.esc(data.answer)}</div>`);
    } catch (e) {
      document.getElementById('dtChatThinking')?.remove();
      history.insertAdjacentHTML('beforeend', `<div style="align-self:flex-start;color:var(--danger);font-size:12px;">エラー: ${e.message}</div>`);
    }
    input.disabled = false;
    input.focus();
    history.scrollTop = history.scrollHeight;
  },

  // ── 📋 処理ログ ─────────────────────────────────────────────
  async renderDtLogs() {
    const pane = document.getElementById('dtTabLogs');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';
    const logs = await this.dtFetch('/processing_logs?order=run_at.desc&limit=50');
    if (!Array.isArray(logs) || logs.length === 0) {
      pane.innerHTML = this.emptyState('📋', 'ログなし', 'GASが実行されると処理ログがここに表示されます');
      return;
    }
    const statusIcon = s => s === 'success' ? '✅' : s === 'skipped' ? '⏭️' : '❌';
    const statusColor = s => s === 'success' ? 'var(--success)' : s === 'skipped' ? 'var(--gray-500)' : 'var(--danger)';
    pane.innerHTML = `
      <div style="margin-bottom:8px;font-size:12px;color:var(--gray-500);">直近50件の処理履歴</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${logs.map(l => `
          <div style="background:var(--gray-50);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:flex-start;gap:10px;">
            <span style="font-size:16px;flex-shrink:0;">${statusIcon(l.status)}</span>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-size:12px;font-weight:600;color:${statusColor(l.status)};">${l.status}</span>
                ${l.email_date ? `<span style="font-size:11px;color:var(--gray-600);">📅 ${l.email_date}</span>` : ''}
                ${l.char_count ? `<span style="font-size:11px;color:var(--gray-500);">${l.char_count.toLocaleString()}文字</span>` : ''}
                ${l.file_name ? `<span style="font-size:11px;color:var(--gray-500);">📎 ${this.esc(l.file_name)}</span>` : ''}
              </div>
              ${l.message ? `<div style="font-size:11px;color:var(--gray-600);margin-top:3px;">${this.esc(l.message)}</div>` : ''}
              ${l.email_subject ? `<div style="font-size:11px;color:var(--gray-500);margin-top:2px;">件名: ${this.esc(l.email_subject)}</div>` : ''}
              <div style="font-size:10px;color:var(--gray-400);margin-top:3px;">${new Date(l.run_at).toLocaleString('ja-JP')}</div>
            </div>
          </div>
        `).join('')}
      </div>`;
  },

  async changeMyPassword() {
    const me = auth.currentUser;
    const current = document.getElementById('pwd_current').value;
    const newPass = document.getElementById('pwd_new').value;
    const confirm = document.getElementById('pwd_new_confirm').value;

    if (!current || !newPass || !confirm) {
      this.toast('全ての項目を入力してください', 'error');
      return;
    }
    if (newPass.length < 8) {
      this.toast('新しいパスワードは8文字以上にしてください', 'error');
      return;
    }
    if (newPass !== confirm) {
      this.toast('新しいパスワードが一致しません', 'error');
      return;
    }

    try {
      const staff = await db.getStaffByEmail(me.email);
      if (!staff || staff.password_hash !== current) {
        this.toast('現在のパスワードが正しくありません', 'error');
        return;
      }
      await db.updateStaff(staff.id, {
        password_hash: newPass,
        is_first_login: false
      });
      document.getElementById('pwd_current').value = '';
      document.getElementById('pwd_new').value = '';
      document.getElementById('pwd_new_confirm').value = '';
      this.toast('パスワードを変更しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // パスワードを忘れた → CEO へリセット依頼を通知
  async requestPasswordReset() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10001';
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <div class="modal-title">🔑 パスワードリセット依頼</div>
          <button class="modal-close" type="button">×</button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px;color:var(--gray-600);margin-bottom:12px;line-height:1.6;">
            登録メールアドレスを入力してください。<br>管理者にリセット依頼が通知されます。
          </p>
          <div class="form-group">
            <label class="form-label">メールアドレス</label>
            <input type="email" id="reset_email" class="form-input" autocomplete="email">
          </div>
          <div id="reset_msg" style="display:none;font-size:12px;margin-top:8px;"></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" data-action="cancel">キャンセル</button>
          <button class="btn btn-primary" type="button" data-action="send">📧 依頼を送信</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('[data-action="send"]').addEventListener('click', async () => {
      const email = overlay.querySelector('#reset_email').value.trim();
      const msg = overlay.querySelector('#reset_msg');
      if (!email) {
        msg.style.display = 'block';
        msg.style.color = 'var(--danger)';
        msg.textContent = 'メールアドレスを入力してください';
        return;
      }
      try {
        const staff = await db.getStaffByEmail(email);
        if (!staff) {
          // セキュリティ的に成功と見せるが、何もしない
          msg.style.display = 'block';
          msg.style.color = 'var(--success)';
          msg.textContent = '✓ 該当アカウントがあれば、管理者にリセット依頼が送られます';
          setTimeout(close, 2500);
          return;
        }
        // CEO 全員に通知
        const all = await db.getAllStaff();
        const ceos = all.filter(s => s.role === 'ceo');
        for (const ceo of ceos) {
          await db.createNotification({
            recipient_id: ceo.id,
            type: 'task_instruction',
            title: '🔑 パスワードリセット依頼',
            message: `${staff.name} (${staff.email}) からパスワード再設定の依頼が来ています。スタッフ管理ページから仮パスワードを再設定してください。`,
          }).catch(() => {});
        }
        msg.style.display = 'block';
        msg.style.color = 'var(--success)';
        msg.textContent = '✓ 管理者にリセット依頼を送信しました。連絡をお待ちください。';
        setTimeout(close, 2500);
      } catch (e) {
        msg.style.display = 'block';
        msg.style.color = 'var(--danger)';
        msg.textContent = 'エラー: ' + e.message;
      }
    });
  },

  setupButtons() {
    document.getElementById('addCompanyBtn')?.addEventListener('click', () => this.openCompanyModal());
    document.getElementById('addBusinessUnitBtn')?.addEventListener('click', () => this.openBusinessUnitModal());
    document.getElementById('addProjectBtn')?.addEventListener('click', () => this.openProjectModal());
    document.getElementById('addLogBtn')?.addEventListener('click', () => this.openLogModal());
    document.getElementById('addStaffBtn')?.addEventListener('click', () => this.openStaffModal());
    document.getElementById('addTaskInstructionBtn')?.addEventListener('click', () => this.openTaskInstructionModal());
    document.getElementById('addRoutineTaskBtn')?.addEventListener('click', () => this.openRoutineTaskModal());
    document.getElementById('addSloganBtn')?.addEventListener('click', () => this.addSloganModal());
  },

  // ===== Task Instructions =====
  renderTaskInstructions() {
    const container = document.getElementById('taskInstructionsContent');
    const isCEO = auth.isCEO();
    let list = this.state.taskInstructions;

    // 自分宛て or 自分が出した指示
    if (!isCEO) {
      list = list.filter(t => t.assigned_to === auth.currentUser.id);
    }

    if (list.length === 0) {
      container.innerHTML = this.emptyState('📋', 'タスク指示なし',
        isCEO ? '右上の「+ 新規指示」から作成' : '指示が来ると表示されます');
      return;
    }

    // フィルタ: 未確認 / 確認済 / 完了
    const pending = list.filter(t => t.status === 'pending');
    const acknowledged = list.filter(t => t.status === 'acknowledged');
    const completed = list.filter(t => t.status === 'completed');

    let html = '';

    if (pending.length > 0) {
      html += '<h3 class="mb-2" style="font-size:15px;">⚠️ 未確認の指示</h3>';
      pending.forEach(t => { html += this.renderTaskInstructionCard(t); });
    }
    if (acknowledged.length > 0) {
      html += '<h3 class="mt-3 mb-2" style="font-size:15px;">✅ 確認済み・進行中</h3>';
      acknowledged.forEach(t => { html += this.renderTaskInstructionCard(t); });
    }
    if (completed.length > 0) {
      html += '<h3 class="mt-3 mb-2" style="font-size:15px;">🏁 完了</h3>';
      completed.slice(0, 10).forEach(t => { html += this.renderTaskInstructionCard(t); });
    }

    container.innerHTML = html;
  },

  renderTaskInstructionCard(t) {
    const assignee = this.state.staff.find(s => s.id === t.assigned_to);
    const creator = this.state.staff.find(s => s.id === t.created_by);
    const isMyTask = t.assigned_to === auth.currentUser.id;
    const isCEO = auth.isCEO();
    const statusLabel = { pending: '未確認', acknowledged: '進行中', completed: '完了' }[t.status];
    const statusClass = { pending: 'badge-danger', acknowledged: 'badge-info', completed: 'badge-success' }[t.status];

    return `<div class="card" style="${t.status === 'pending' && isMyTask ? 'border-left:4px solid var(--danger);' : ''}">
      <div class="card-header">
        <div class="card-title">${t.title}</div>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </div>
      <div style="display:grid;grid-template-columns:auto auto;gap:6px 16px;font-size:12px;margin-bottom:12px;">
        <div class="text-muted">担当</div><div>${assignee?.name || '-'}</div>
        <div class="text-muted">指示者</div><div>${creator?.name || '-'}</div>
        <div class="text-muted">期限</div><div>${t.deadline || '-'}</div>
        ${t.acknowledged_at ? `<div class="text-muted">確認日時</div><div>${this.formatDate(t.acknowledged_at)}</div>` : ''}
      </div>
      ${t.description ? `<div class="mb-2" style="font-size:13px;color:var(--gray-700);">${t.description}</div>` : ''}
      ${t.completion_criteria ? `<div style="background:var(--gray-50);padding:10px;border-radius:6px;font-size:12px;margin-bottom:12px;"><strong>完了条件:</strong> ${t.completion_criteria}</div>` : ''}
      <div class="flex gap-1">
        ${isMyTask && t.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="App.acknowledgeTaskInstruction('${t.id}')">✅ 指示を確認した</button>` : ''}
        ${isMyTask && t.status === 'acknowledged' ? `<button class="btn btn-sm btn-success" onclick="App.completeTaskInstruction('${t.id}')">🏁 完了報告</button>` : ''}
        ${isCEO ? `<button class="btn btn-sm btn-danger" onclick="App.deleteTaskInstruction('${t.id}')">削除</button>` : ''}
      </div>
    </div>`;
  },

  openTaskInstructionModal() {
    const staffOptions = this.state.staff
      .filter(s => s.id !== auth.currentUser.id)
      .map(s => `<option value="${s.id}">${s.name} (${this.roleLabel(s.role)})</option>`)
      .join('');

    this.showModal('新規タスク指示', `
      <p class="text-muted mb-2" style="font-size:12px;">「誰向け」「いつまで」「何を」「どのような完了形」を明確に指示します。</p>
      <div class="form-group">
        <label class="form-label">指示タイトル *</label>
        <input type="text" id="ti_title" class="form-input" placeholder="例: 月次売上レポートの作成">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">誰向け（担当者）*</label>
          <select id="ti_assignee" class="form-select"><option value="">-- 選択 --</option>${staffOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">いつまで（期限）*</label>
          <input type="date" id="ti_deadline" class="form-input">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">何を（内容・詳細）</label>
        <textarea id="ti_desc" class="form-textarea" placeholder="具体的な行動内容、背景、参考資料など" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">どのような完了形（完了条件）*</label>
        <textarea id="ti_criteria" class="form-textarea" placeholder="例: PDF化したレポートをSlackで共有、KPI入力欄を全て埋める、など" rows="2"></textarea>
      </div>
    `, async () => {
      const data = {
        title: document.getElementById('ti_title').value.trim(),
        assigned_to: document.getElementById('ti_assignee').value,
        deadline: document.getElementById('ti_deadline').value || null,
        description: document.getElementById('ti_desc').value.trim(),
        completion_criteria: document.getElementById('ti_criteria').value.trim(),
        created_by: auth.currentUser.id,
        status: 'pending'
      };
      if (!data.title || !data.assigned_to || !data.deadline || !data.completion_criteria) {
        this.toast('タイトル・担当・期限・完了条件は必須', 'error');
        return false;
      }
      try {
        await db.createTaskInstruction(data);
        await db.createNotification({
          recipient_id: data.assigned_to,
          type: 'task_instruction',
          title: 'タスク指示が届きました',
          message: data.title
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast('指示を送りました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    });
  },

  async acknowledgeTaskInstruction(id) {
    const t = this.state.taskInstructions.find(x => x.id === id);
    if (!t) return;
    if (!confirm('この指示を理解しましたか？確認するとCEOに通知されます。')) return;
    try {
      await db.updateTaskInstruction(id, {
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      });
      // CEO 全員に通知（指示作成者 + CEO 全員）
      const targets = new Set();
      if (t.created_by) targets.add(t.created_by);
      this.state.staff.filter(s => s.role === 'ceo').forEach(s => targets.add(s.id));
      for (const recipientId of targets) {
        if (recipientId === auth.currentUser.id) continue;
        await db.createNotification({
          recipient_id: recipientId,
          type: 'task_acknowledged',
          title: '✅ タスク指示が確認されました',
          message: `${auth.currentUser.name} が「${t.title}」を確認しました`
        }).catch(() => {});
      }
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('確認しました。CEOに通知済みです');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  completeTaskInstruction(id) {
    const t = this.state.taskInstructions.find(x => x.id === id);
    if (!t) return;
    this.openCompletionModal('task', id, t.title,
      async (note) => {
        await db.updateTaskInstruction(id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_note: note,
          archived: true,
          archived_at: new Date().toISOString()
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      },
      async () => {
        await db.deleteTaskInstruction(id);
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      }
    );
  },

  async deleteTaskInstruction(id) {
    const t = this.state.taskInstructions.find(x => x.id === id);
    await this.ceoDeleteWithPassword(`タスク指示: ${t?.title || ''}`, async () => {
      await db.deleteTaskInstruction(id);
    });
  },

  // ===== Routine Tasks =====
  async renderRoutine() {
    const container = document.getElementById('routineContent');
    const isCEO = auth.isCEO();

    // スタッフフィルター（CEO のみ表示）
    let staffFilterHtml = '';
    if (isCEO) {
      const staffOptions = this.state.staff
        .filter(s => s.is_active)
        .map(s => `<option value="${s.id}">${s.name} (${this.roleLabel(s.role)})</option>`)
        .join('');
      staffFilterHtml = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;background:var(--gray-50);padding:10px 14px;border-radius:8px;border:1px solid var(--border);">
          <label style="font-size:12px;font-weight:600;color:var(--gray-700);min-width:100px;">👤 担当スタッフ</label>
          <select id="routineStaffFilter" class="form-select" style="flex:1;max-width:300px;" onchange="App.applyRoutineStaffFilter()">
            <option value="">-- 全員 --</option>
            ${staffOptions}
          </select>
          <span id="routineFilterCount" class="text-muted" style="font-size:11px;"></span>
        </div>
      `;
    }

    let html = staffFilterHtml + `
      <div class="settings-tabs">
        <button class="routine-tab active" data-cycle="daily">📅 日次</button>
        <button class="routine-tab" data-cycle="weekly">📆 週次</button>
        <button class="routine-tab" data-cycle="monthly">🗓 月次</button>
      </div>
      <div id="routineList"></div>
    `;
    container.innerHTML = html;

    // タブ切り替え
    document.querySelectorAll('.routine-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.routine-tab').forEach(t => t.classList.toggle('active', t === tab));
        this.applyRoutineStaffFilter();
      });
    });
    this.applyRoutineStaffFilter();
  },

  applyRoutineStaffFilter() {
    const isCEO = auth.isCEO();
    const selectedStaff = document.getElementById('routineStaffFilter')?.value || '';
    const activeTab = document.querySelector('.routine-tab.active');
    const cycle = activeTab?.dataset.cycle || 'daily';

    let tasks = this.state.routineTasks;
    if (!isCEO) {
      tasks = tasks.filter(t => t.assigned_to === auth.currentUser.id);
    } else if (selectedStaff) {
      tasks = tasks.filter(t => t.assigned_to === selectedStaff);
    }

    // フィルター件数表示
    const countEl = document.getElementById('routineFilterCount');
    if (countEl) {
      if (selectedStaff) {
        const staff = this.state.staff.find(s => s.id === selectedStaff);
        countEl.textContent = `${staff?.name || ''} のルーティン ${tasks.length}件`;
      } else {
        countEl.textContent = `全${tasks.length}件`;
      }
    }

    this.renderRoutineList(cycle, tasks);
  },

  async renderRoutineList(cycle, tasks) {
    const filtered = tasks.filter(t => t.cycle === cycle && t.is_active && !t.archived);
    const container = document.getElementById('routineList');
    if (filtered.length === 0) {
      const label = { daily: '日次', weekly: '週次', monthly: '月次' }[cycle];
      container.innerHTML = this.emptyState('🔄', `${label}ルーティンなし`,
        auth.isCEO() ? '右上の「+ 新規ルーティン」から作成' : '');
      return;
    }

    let html = '';
    for (const t of filtered) {
      const assignee = this.state.staff.find(s => s.id === t.assigned_to);
      const logs = await db.getRoutineLogs(t.id).catch(() => []);
      const cycleLabel = { daily: '毎日', weekly: '毎週', monthly: '毎月' }[t.cycle];

      // 今期の実施判定
      const todayStr = new Date().toISOString().slice(0, 10);
      const doneToday = logs.some(l => l.log_date === todayStr);

      const isMine = t.assigned_to === auth.currentUser.id;
      const isUnack = isMine && !t.acknowledged_at;

      html += `<div class="card" style="${isUnack ? 'border-left:4px solid var(--danger);' : ''}">
        <div class="card-header">
          <div>
            <div class="card-title">${t.title}</div>
            <div class="text-muted" style="font-size:11px;margin-top:2px;">${cycleLabel} ・ 担当 ${assignee?.name || '-'}${t.acknowledged_at ? ` ・ <span style="color:var(--success);">✓ 確認済</span>` : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
            ${isUnack ? '<span class="badge badge-danger">未確認</span>' : ''}
            <span class="badge ${doneToday ? 'badge-success' : 'badge-gray'}">${doneToday ? '本日実施済' : '未実施'}</span>
          </div>
        </div>
        ${t.description ? `<div class="mb-2" style="font-size:12px;color:var(--gray-700);">${t.description}</div>` : ''}
        <div class="flex gap-1 mb-2" style="flex-wrap:wrap;">
          ${isUnack ? `<button class="btn btn-sm btn-success" onclick="App.acknowledgeRoutineTask('${t.id}')">✅ 指示を確認した</button>` : ''}
          ${(isMine || auth.isCEO()) ? `<button class="btn btn-sm btn-primary" onclick="App.openRoutineLogModal('${t.id}')">+ ログ登録</button>` : ''}
          ${(isMine || auth.isCEO()) ? `<button class="btn btn-sm btn-success" onclick="App.archiveRoutineTask('${t.id}', '${t.title.replace(/'/g, "\\'")}');">📦 完了/アーカイブ</button>` : ''}
          ${auth.isCEO() ? `<button class="btn btn-sm btn-secondary" onclick="App.openRoutineTaskModal('${t.id}')">編集</button>` : ''}
          ${auth.isCEO() ? `<button class="btn btn-sm btn-danger" onclick="App.deleteRoutineTask('${t.id}')">🗑 削除</button>` : ''}
        </div>
        ${logs.length > 0 ? `
          <details>
            <summary style="cursor:pointer;font-size:12px;color:var(--gray-600);">実施ログ (${logs.length}件)</summary>
            <div style="margin-top:8px;max-height:200px;overflow-y:auto;">
              ${logs.slice(0, 20).map(l => {
                const s = this.state.staff.find(x => x.id === l.staff_id);
                return `<div style="padding:6px 10px;background:var(--gray-50);border-radius:4px;margin-bottom:4px;font-size:11px;">
                  <strong>${l.log_date}</strong> ${s?.name || '-'}
                  ${l.content ? `<div style="margin-top:2px;color:var(--gray-700);">${l.content}</div>` : ''}
                </div>`;
              }).join('')}
            </div>
          </details>
        ` : ''}
      </div>`;
    }
    container.innerHTML = html;
  },

  openRoutineTaskModal(id = null) {
    const t = id ? this.state.routineTasks.find(x => x.id === id) : null;
    const staffOptions = this.state.staff
      .filter(s => s.is_active)
      .map(s => `<option value="${s.id}" ${t?.assigned_to === s.id ? 'selected' : ''}>${s.name} (${this.roleLabel(s.role)})</option>`)
      .join('');

    // フィルターで選んでいるスタッフを初期値に
    const filterStaff = document.getElementById('routineStaffFilter')?.value;
    const defaultAssignee = t?.assigned_to || filterStaff || '';

    this.showModal(t ? 'ルーティン編集' : '新規ルーティン指示', `
      <div style="background:var(--primary-light);padding:12px 14px;border-radius:8px;margin-bottom:14px;border-left:4px solid var(--primary);">
        <label style="font-size:13px;font-weight:700;color:var(--gray-900);display:block;margin-bottom:6px;">👤 誰のルーティン？ *</label>
        <select id="rt_assignee" class="form-select" style="background:white;">
          <option value="">-- 担当者を選択 --</option>
          ${this.state.staff.filter(s => s.is_active).map(s =>
            `<option value="${s.id}" ${defaultAssignee === s.id ? 'selected' : ''}>${s.name} (${this.roleLabel(s.role)})</option>`
          ).join('')}
        </select>
        <p style="font-size:11px;color:var(--gray-600);margin-top:6px;">このスタッフが毎日/毎週/毎月実施するルーティンを設定します。</p>
      </div>

      <div class="form-group">
        <label class="form-label">ルーティン名 *</label>
        <input type="text" id="rt_title" class="form-input" value="${t?.title || ''}" placeholder="例: 朝の店内チェック">
      </div>
      <div class="form-group">
        <label class="form-label">サイクル *</label>
        <select id="rt_cycle" class="form-select">
          <option value="daily" ${t?.cycle === 'daily' ? 'selected' : ''}>📅 日次（毎日）</option>
          <option value="weekly" ${t?.cycle === 'weekly' ? 'selected' : ''}>📆 週次（毎週）</option>
          <option value="monthly" ${t?.cycle === 'monthly' ? 'selected' : ''}>🗓 月次（毎月）</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">内容・手順</label>
        <textarea id="rt_desc" class="form-textarea" rows="4" placeholder="チェック項目、実施手順など">${t?.description || ''}</textarea>
      </div>
    `, async () => {
      const data = {
        title: document.getElementById('rt_title').value.trim(),
        cycle: document.getElementById('rt_cycle').value,
        assigned_to: document.getElementById('rt_assignee').value,
        description: document.getElementById('rt_desc').value.trim(),
        created_by: auth.currentUser.id
      };
      if (!data.title || !data.assigned_to) {
        this.toast('タイトル・担当者は必須', 'error');
        return false;
      }
      try {
        if (id) {
          await db.updateRoutineTask(id, data);
        } else {
          const created = await db.createRoutineTask(data);
          const newId = Array.isArray(created) ? created[0]?.id : created?.id;
          // 担当者へ通知
          await db.createNotification({
            recipient_id: data.assigned_to,
            type: 'routine_assigned',
            title: '🔄 ルーティン指示が届きました',
            message: `${data.title}（${{daily:'毎日',weekly:'毎週',monthly:'毎月'}[data.cycle]}）`
          }).catch(() => {});
        }
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast(id ? '更新しました' : 'ルーティンを登録し、担当者に通知しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    });
  },

  // ルーティン確認（担当者が「指示を確認した」を押下）
  async acknowledgeRoutineTask(id) {
    const r = this.state.routineTasks.find(x => x.id === id);
    if (!r) return;
    if (!confirm('このルーティン指示を理解しましたか？確認するとCEOに通知されます。')) return;
    try {
      const now = new Date().toISOString();
      await db.updateRoutineTask(id, {
        acknowledged_at: now,
        acknowledged_by: auth.currentUser.id
      });
      // CEO 全員に通知
      const ceos = this.state.staff.filter(s => s.role === 'ceo');
      for (const ceo of ceos) {
        await db.createNotification({
          recipient_id: ceo.id,
          type: 'routine_acknowledged',
          title: '✅ ルーティン指示が確認されました',
          message: `${auth.currentUser.name} が「${r.title}」を確認しました`
        }).catch(() => {});
      }
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('確認しました。CEOに通知済みです');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  openRoutineLogModal(routineId) {
    const r = this.state.routineTasks.find(x => x.id === routineId);
    this.showModal(`ログ登録: ${r.title}`, `
      <div class="form-group">
        <label class="form-label">日付</label>
        <input type="date" id="rl_date" class="form-input" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="form-group">
        <label class="form-label">実施内容・備考</label>
        <textarea id="rl_content" class="form-textarea" rows="3" placeholder="気付いたこと、特記事項など"></textarea>
      </div>
    `, async () => {
      const data = {
        routine_task_id: routineId,
        staff_id: auth.currentUser.id,
        log_date: document.getElementById('rl_date').value,
        content: document.getElementById('rl_content').value.trim()
      };
      try {
        await db.createRoutineLog(data);
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast('ログを登録しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    });
  },

  archiveRoutineTask(id, title) {
    this.openCompletionModal('routine', id, title,
      async (note) => {
        await db.updateRoutineTask(id, {
          archived: true,
          archived_at: new Date().toISOString(),
          completion_note: note,
          is_active: false
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      },
      async () => {
        await db.deleteRoutineTask(id);
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      }
    );
  },

  async deleteRoutineTask(id) {
    const r = this.state.routineTasks.find(x => x.id === id);
    await this.ceoDeleteWithPassword(`ルーティン: ${r?.title || ''}`, async () => {
      await db.deleteRoutineTask(id);
    });
  },

  // ===== Home (スローガン着地ページ) =====
  renderHome() {
    const container = document.getElementById('homeContent');
    if (!container) return;
    const slogans = this.state.slogans || [];
    // ログインセッション内で1つ選んで固定（毎回の再描画でちらつかないよう保持）
    if (!this._sessionSlogan) {
      if (slogans.length > 0) {
        const idx = Math.floor(Math.random() * slogans.length);
        this._sessionSlogan = slogans[idx];
      } else {
        this._sessionSlogan = null;
      }
    }
    const s = this._sessionSlogan;
    const me = auth.currentUser;
    const hour = new Date().getHours();
    const greet = hour < 5 ? 'お疲れさまです' : hour < 11 ? 'おはようございます' : hour < 17 ? 'こんにちは' : 'お疲れさまです';

    container.innerHTML = `
      <div class="home-hero">
        <div class="home-greet">${greet}、${me?.name || ''} さん</div>
        ${s ? `
          <div class="home-slogan">${this.esc(s.text)}</div>
          ${s.author ? `<div class="home-slogan-author">— ${this.esc(s.author)}</div>` : ''}
        ` : `
          <div class="home-slogan" style="color:var(--gray-400);">スローガン未登録</div>
          ${auth.isCEO() ? '<div class="home-slogan-author">設定 → 💬 スローガン から追加できます</div>' : ''}
        `}
        <div class="home-actions">
          <button class="btn btn-primary" onclick="App.navigate('dashboard')">📊 ダッシュボードへ</button>
          ${!auth.isCEO() ? '<button class="btn btn-secondary" onclick="App.navigate(\'logs\')">📝 日報を書く</button>' : ''}
        </div>
      </div>
    `;
  },

  // ===== スローガン管理（CEO） =====
  renderSlogans() {
    const el = document.getElementById('slogansContent');
    if (!el) return;
    const slogans = this.state.slogans || [];
    if (slogans.length === 0) {
      el.innerHTML = this.emptyState('💬', 'スローガン未登録', '「+ 追加」で言葉を登録すると、ログイン時にランダム表示されます');
      return;
    }
    el.innerHTML = slogans.map(s => `
      <div class="card" style="padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;line-height:1.6;">${this.esc(s.text)}</div>
          ${s.author ? `<div class="text-muted" style="font-size:11px;margin-top:4px;">— ${this.esc(s.author)}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-danger" onclick="App.deleteSlogan('${s.id}')">削除</button>
      </div>
    `).join('');
  },

  addSloganModal() {
    this.showModal('💬 スローガンを追加', `
      <div class="form-group">
        <label class="form-label">スローガン（言葉）*</label>
        <textarea id="sl_text" class="form-textarea" rows="3" placeholder="例: 凡事徹底。当たり前を、誰よりも丁寧に。"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">出典・著者（任意）</label>
        <input type="text" id="sl_author" class="form-input" placeholder="例: 黒田 / 松下幸之助">
      </div>
    `, async () => {
      const text = document.getElementById('sl_text').value.trim();
      if (!text) { this.toast('スローガンを入力してください', 'error'); return false; }
      const author = document.getElementById('sl_author').value.trim();
      try {
        await db.createSlogan({ text, author: author || null });
        this.state.slogans = await db.getSlogans().catch(() => []);
        this.renderSlogans();
        this.toast('スローガンを追加しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    }, false, { submitLabel: '➕ 追加', submitClass: 'btn-primary' });
  },

  async deleteSlogan(id) {
    if (!confirm('このスローガンを削除しますか？')) return;
    try {
      await db.deleteSlogan(id);
      this.state.slogans = (this.state.slogans || []).filter(s => s.id !== id);
      this.renderSlogans();
      this.toast('削除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // ===== KPI/マイルストーン設計ページ（設計 / 承認待ち タブ） =====
  renderDesignPage() {
    if (!this._designTabsSetup) {
      this._designTabsSetup = true;
      document.querySelectorAll('.design-page-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const name = tab.dataset.tab;
          document.querySelectorAll('.design-page-tab').forEach(t => t.classList.toggle('active', t === tab));
          document.getElementById('designPaneDesign').classList.toggle('active', name === 'design');
          document.getElementById('designPaneApproval').classList.toggle('active', name === 'approval');
          if (name === 'approval') this.renderApproval(); else this.renderDesign();
        });
      });
    }
    const activeTab = document.querySelector('.design-page-tab.active')?.dataset.tab || 'design';
    if (activeTab === 'approval') this.renderApproval(); else this.renderDesign();
  },

  // ===== 指示一覧ページ（ルーティン / タスク タブ） =====
  renderInstructionsPage() {
    if (!this._instructionsTabsSetup) {
      this._instructionsTabsSetup = true;
      document.querySelectorAll('.instructions-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const name = tab.dataset.tab;
          document.querySelectorAll('.instructions-tab').forEach(t => t.classList.toggle('active', t === tab));
          document.getElementById('instructionsPaneRoutine').classList.toggle('active', name === 'routine');
          document.getElementById('instructionsPaneTask').classList.toggle('active', name === 'task');
          this.updateInstructionsButtons(name);
          if (name === 'task') this.renderTaskInstructions(); else this.renderRoutine();
        });
      });
    }
    const activeTab = document.querySelector('.instructions-tab.active')?.dataset.tab || 'routine';
    this.updateInstructionsButtons(activeTab);
    if (activeTab === 'task') this.renderTaskInstructions(); else this.renderRoutine();
  },

  // タブに応じて「+新規ルーティン / +新規タスク」ボタンを出し分け
  updateInstructionsButtons(tabName) {
    const isCEO = auth.isCEO();
    const rBtn = document.getElementById('addRoutineTaskBtn');
    const tBtn = document.getElementById('addTaskInstructionBtn');
    if (rBtn) rBtn.style.display = (isCEO && tabName === 'routine') ? '' : 'none';
    if (tBtn) tBtn.style.display = (isCEO && tabName === 'task') ? '' : 'none';
  },

  // ===== Dashboard =====
  renderDashboard() {
    const container = document.getElementById('dashboardContent');
    const projects = this.state.projects;
    const active = projects.filter(p => p.status === 'active');
    const pending = projects.filter(p => p.status === 'pending_design' || p.status === 'pending_approval');
    const completed = projects.filter(p => p.status === 'completed');
    const avgProgress = active.length > 0
      ? Math.round(active.reduce((s, p) => s + (p.progress_percent || 0), 0) / active.length)
      : 0;

    let html = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">📊 進行中プロジェクト</div>
          <div class="stat-value">${active.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">⏳ 設計/承認待ち</div>
          <div class="stat-value">${pending.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">✅ 完了</div>
          <div class="stat-value">${completed.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📈 平均進捗</div>
          <div class="stat-value">${avgProgress}%</div>
        </div>
      </div>
    `;

    // ===== 担当者別グルーピング（誰が何個動かしているか） =====
    html += '<h3 style="font-size:13px;font-weight:600;color:var(--gray-700);margin:16px 0 8px 0;">👥 担当者別プロジェクト</h3>';

    // 担当者ごとにプロジェクトを集計（進行中のみカウント、表示は全状態）
    const groups = {};
    this.state.projects.forEach(p => {
      const key = p.assigned_to || '__unassigned__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    // 進行中件数の多い順に担当者を並べる（未割り当ては最後）
    const entries = Object.entries(groups).map(([staffId, projs]) => {
      const staff = this.state.staff.find(s => s.id === staffId);
      const activeProjs = projs.filter(p => p.status === 'active');
      return { staffId, staff, projs, activeCount: activeProjs.length };
    }).sort((a, b) => {
      if (a.staffId === '__unassigned__') return 1;
      if (b.staffId === '__unassigned__') return -1;
      return b.activeCount - a.activeCount;
    });

    if (entries.length === 0) {
      html += this.emptyState('🎯', 'プロジェクトなし', '「課題抽出」から新しい課題を作成してください');
    } else {
      html += '<div class="assignee-grid">';
      entries.forEach(({ staffId, staff, projs, activeCount }) => {
        const name = staffId === '__unassigned__' ? '未割り当て' : (staff?.name || '不明');
        const avatar = staffId === '__unassigned__' ? '—' : (staff?.name?.charAt(0) || '?');
        const stalled = projs.filter(p => p.status === 'paused').length;
        const done = projs.filter(p => p.status === 'completed').length;
        const hasOverdue = projs.some(p => p.status === 'active' && this.daysUntilDeadline(p.deadline) !== null && this.daysUntilDeadline(p.deadline) < 0);

        // 表示順: 進行中 → 停滞 → その他
        const sortedProjs = [...projs].sort((a, b) => {
          const order = { active: 0, paused: 1, pending_design: 2, pending_approval: 2, completed: 3 };
          return (order[a.status] ?? 9) - (order[b.status] ?? 9);
        });

        html += `<div class="assignee-card ${hasOverdue ? 'deadline-overdue' : ''}">
          <div class="assignee-head">
            <div class="assignee-avatar">${avatar}</div>
            <div style="flex:1;min-width:0;">
              <div class="assignee-name">${name}</div>
              <div class="assignee-meta">
                <span class="bu-pill bu-pill-active">進行 ${activeCount}</span>
                ${stalled > 0 ? `<span class="bu-pill bu-pill-stalled">停滞 ${stalled}</span>` : ''}
                ${done > 0 ? `<span class="bu-pill" style="background:#dcfce7;color:#166534;">完了 ${done}</span>` : ''}
                ${hasOverdue ? '<span class="bu-pill bu-pill-stalled">🚨期限超過</span>' : ''}
              </div>
            </div>
            <div class="assignee-count">${activeCount}</div>
          </div>
          <div class="assignee-projects">
            ${sortedProjs.map(p => {
              const dlClass = this.deadlineClass(p.deadline);
              const unit = this.state.businessUnits.find(u => u.id === p.business_unit_id);
              return `<div class="assignee-project ${dlClass}" onclick="App.openProjectDetail('${p.id}')">
                <div class="assignee-project-row">
                  <span class="badge status-${p.status}" style="font-size:10px;">${this.statusLabel(p.status)}</span>
                  <span class="assignee-project-title">${p.title}</span>
                  ${this.deadlineTagHtml(p.deadline)}
                  ${unit ? `<span class="text-muted" style="font-size:10px;margin-left:auto;white-space:nowrap;">${unit.name}</span>` : ''}
                </div>
                <div class="bu-project-progress">
                  <div class="progress-bar" style="flex:1;height:5px;"><div class="progress-fill" style="width:${p.progress_percent || 0}%"></div></div>
                  <span style="font-size:10px;color:var(--gray-500);min-width:32px;text-align:right;">${p.progress_percent || 0}%</span>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      });
      html += '</div>';
    }

    container.innerHTML = html;
  },

  // ===== Companies =====
  renderCompanies() {
    const container = document.getElementById('companiesContent');
    if (this.state.companies.length === 0) {
      container.innerHTML = this.emptyState('🏢', '会社が未登録', '右上の「+ 新規会社」から登録');
      return;
    }

    let html = '<div class="card"><table class="table"><thead><tr><th>コード</th><th>会社名</th><th>説明</th><th>事業数</th><th></th></tr></thead><tbody>';
    this.state.companies.forEach(c => {
      const unitCount = this.state.businessUnits.filter(u => u.company_id === c.id).length;
      html += `<tr>
        <td><span class="badge badge-info">${c.code}</span></td>
        <td><strong>${c.name}</strong></td>
        <td class="text-muted">${c.description || ''}</td>
        <td>${unitCount}件</td>
        <td>
          ${auth.isCEO() ? `
            <button class="btn btn-sm btn-secondary" onclick="App.openCompanyModal('${c.id}')">編集</button>
            <button class="btn btn-sm btn-danger" onclick="App.deleteCompany('${c.id}')">削除</button>
          ` : ''}
        </td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  openCompanyModal(id = null) {
    const c = id ? this.state.companies.find(x => x.id === id) : null;
    this.showModal(c ? '会社を編集' : '新規会社を登録', `
      <div class="form-group">
        <label class="form-label">会社コード *</label>
        <input type="text" id="cName_code" class="form-input" value="${c?.code || ''}" placeholder="例: IH">
      </div>
      <div class="form-group">
        <label class="form-label">会社名 *</label>
        <input type="text" id="cName_name" class="form-input" value="${c?.name || ''}" placeholder="例: 一鴻ホールディングス">
      </div>
      <div class="form-group">
        <label class="form-label">説明</label>
        <textarea id="cName_desc" class="form-textarea">${c?.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">表示順</label>
        <input type="number" id="cName_order" class="form-input" value="${c?.display_order || 0}">
      </div>
    `, async () => {
      const data = {
        code: document.getElementById('cName_code').value.trim(),
        name: document.getElementById('cName_name').value.trim(),
        description: document.getElementById('cName_desc').value.trim(),
        display_order: parseInt(document.getElementById('cName_order').value) || 0
      };
      if (!data.code || !data.name) { this.toast('コードと会社名は必須', 'error'); return false; }
      try {
        if (id) await db.updateCompany(id, data);
        else await db.createCompany(data);
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast(id ? '会社を更新しました' : '会社を登録しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    });
  },

  async deleteCompany(id) {
    const c = this.state.companies.find(x => x.id === id);
    if (!confirm(`「${c.name}」を削除しますか？\n配下の事業も全て削除されます。`)) return;
    try {
      await db.deleteCompany(id);
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('会社を削除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // ===== Business Units =====
  renderBusinessUnits() {
    const container = document.getElementById('businessUnitsContent');
    if (this.state.companies.length === 0) {
      container.innerHTML = this.emptyState('🏪', '会社が未登録', 'まず会社を登録してください');
      return;
    }
    if (this.state.businessUnits.length === 0) {
      container.innerHTML = this.emptyState('🏪', '事業が未登録', '右上の「+ 新規事業」から登録');
      return;
    }

    let html = '';
    this.state.companies.forEach(company => {
      const units = this.state.businessUnits.filter(u => u.company_id === company.id);
      if (units.length === 0) return;
      html += `<div class="card">
        <div class="card-header"><div class="card-title">${company.name} <span class="company-code">${company.code}</span></div></div>
        <table class="table"><thead><tr><th>コード</th><th>名称</th><th>種類</th><th>説明</th><th></th></tr></thead><tbody>`;
      units.forEach(u => {
        html += `<tr>
          <td><span class="badge badge-gray">${u.code}</span></td>
          <td><strong>${u.name}</strong></td>
          <td>${this.unitTypeLabel(u.type)}</td>
          <td class="text-muted">${u.description || ''}</td>
          <td>
            ${auth.isCEO() ? `
              <button class="btn btn-sm btn-secondary" onclick="App.openBusinessUnitModal('${u.id}')">編集</button>
              <button class="btn btn-sm btn-danger" onclick="App.deleteBusinessUnit('${u.id}')">削除</button>
            ` : ''}
          </td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    });
    container.innerHTML = html;
  },

  openBusinessUnitModal(id = null) {
    if (this.state.companies.length === 0) {
      this.toast('先に会社を登録してください', 'error');
      return;
    }
    const u = id ? this.state.businessUnits.find(x => x.id === id) : null;
    const companyOptions = this.state.companies.map(c =>
      `<option value="${c.id}" ${u?.company_id === c.id ? 'selected' : ''}>${c.code} - ${c.name}</option>`
    ).join('');
    this.showModal(u ? '事業を編集' : '新規事業を登録', `
      <div class="form-group">
        <label class="form-label">所属会社 *</label>
        <select id="bu_company" class="form-select">${companyOptions}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">コード *</label>
          <input type="text" id="bu_code" class="form-input" value="${u?.code || ''}" placeholder="例: CFM">
        </div>
        <div class="form-group">
          <label class="form-label">種類 *</label>
          <select id="bu_type" class="form-select">
            <option value="store" ${u?.type === 'store' ? 'selected' : ''}>店舗</option>
            <option value="product" ${u?.type === 'product' ? 'selected' : ''}>プロダクト</option>
            <option value="service" ${u?.type === 'service' ? 'selected' : ''}>サービス事業</option>
            <option value="department" ${u?.type === 'department' ? 'selected' : ''}>部署/部門</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">名称 *</label>
        <input type="text" id="bu_name" class="form-input" value="${u?.name || ''}" placeholder="例: COOKIE for MEN">
      </div>
      <div class="form-group">
        <label class="form-label">説明</label>
        <textarea id="bu_desc" class="form-textarea">${u?.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">表示順</label>
        <input type="number" id="bu_order" class="form-input" value="${u?.display_order || 0}">
      </div>
    `, async () => {
      const data = {
        company_id: document.getElementById('bu_company').value,
        code: document.getElementById('bu_code').value.trim(),
        name: document.getElementById('bu_name').value.trim(),
        type: document.getElementById('bu_type').value,
        description: document.getElementById('bu_desc').value.trim(),
        display_order: parseInt(document.getElementById('bu_order').value) || 0
      };
      if (!data.code || !data.name) { this.toast('コードと名称は必須', 'error'); return false; }
      try {
        if (id) await db.updateBusinessUnit(id, data);
        else await db.createBusinessUnit(data);
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast(id ? '事業を更新しました' : '事業を登録しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    });
  },

  async deleteBusinessUnit(id) {
    const u = this.state.businessUnits.find(x => x.id === id);
    if (!confirm(`「${u.name}」を削除しますか？`)) return;
    try {
      await db.deleteBusinessUnit(id);
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('事業を削除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // ===== Projects (課題抽出) =====
  renderProjects() {
    const container = document.getElementById('projectsContent');
    if (this.state.projects.length === 0) {
      container.innerHTML = this.emptyState('🎯', '課題未登録', '右上の「+ 新規課題」から登録');
      return;
    }
    let html = '<div class="card"><table class="table"><thead><tr><th>状態</th><th>課題</th><th>事業</th><th>解決方法</th><th>担当</th><th>締切</th><th></th></tr></thead><tbody>';
    this.state.projects.forEach(p => {
      const unit = this.state.businessUnits.find(u => u.id === p.business_unit_id);
      const company = unit ? this.state.companies.find(c => c.id === unit.company_id) : null;
      const assignee = this.state.staff.find(s => s.id === p.assigned_to);
      html += `<tr>
        <td><span class="badge status-${p.status}">${this.statusLabel(p.status)}</span></td>
        <td><strong onclick="App.openProjectDetail('${p.id}')" style="cursor:pointer;color:var(--primary);">${p.title}</strong></td>
        <td><span class="badge badge-gray">${company?.code || '?'}</span> ${unit?.name || '?'}</td>
        <td><span class="badge ${p.solution_type === 'kpi' ? 'badge-info' : 'badge-warning'}">${p.solution_type === 'kpi' ? 'KPI' : 'マイルストーン'}</span></td>
        <td>${assignee?.name || '-'}</td>
        <td class="text-muted">${p.deadline || '-'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="App.openProjectDetail('${p.id}')">詳細</button>
          ${auth.isCEO() ? `<button class="btn btn-sm btn-danger" onclick="App.deleteProject('${p.id}')">削除</button>` : ''}
        </td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  openProjectModal() {
    if (this.state.businessUnits.length === 0) {
      this.toast('先に事業を登録してください', 'error');
      return;
    }
    const unitOptions = this.state.companies.map(c => {
      const units = this.state.businessUnits.filter(u => u.company_id === c.id);
      if (units.length === 0) return '';
      return `<optgroup label="${c.code} - ${c.name}">` +
        units.map(u => `<option value="${u.id}">${u.code} - ${u.name}</option>`).join('') +
        '</optgroup>';
    }).join('');
    const staffOptions = this.state.staff
      .filter(s => s.role !== 'ceo' || s.id === auth.currentUser.id)
      .map(s => `<option value="${s.id}">${s.name} (${this.roleLabel(s.role)})</option>`)
      .join('');

    this.showModal('新規課題を登録', `
      <div class="form-group">
        <label class="form-label">事業・店舗・プロダクト *</label>
        <select id="p_bu" class="form-select"><option value="">-- 選択 --</option>${unitOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">課題タイトル *</label>
        <input type="text" id="p_title" class="form-input" placeholder="例: A店の新規集客数を増やす">
      </div>
      <div class="form-group">
        <label class="form-label">背景・詳細</label>
        <textarea id="p_desc" class="form-textarea" placeholder="なぜこれが課題か、どう変えたいか"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">解決方法 *</label>
          <select id="p_type" class="form-select">
            <option value="kpi">KPI（数値で管理）</option>
            <option value="milestone">マイルストーン（チェックポイント）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">締切</label>
          <input type="date" id="p_deadline" class="form-input">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">担当者 *</label>
        <select id="p_assignee" class="form-select"><option value="">-- 選択 --</option>${staffOptions}</select>
      </div>
    `, async () => {
      const data = {
        business_unit_id: document.getElementById('p_bu').value,
        title: document.getElementById('p_title').value.trim(),
        description: document.getElementById('p_desc').value.trim(),
        solution_type: document.getElementById('p_type').value,
        deadline: document.getElementById('p_deadline').value || null,
        assigned_to: document.getElementById('p_assignee').value || null,
        created_by: auth.currentUser.id,
        status: 'pending_design'
      };
      if (!data.business_unit_id || !data.title || !data.assigned_to) {
        this.toast('事業、タイトル、担当者は必須', 'error');
        return false;
      }
      try {
        const result = await db.createProject(data);
        const projectId = Array.isArray(result) ? result[0].id : result.id;
        // 担当者に通知
        await db.createNotification({
          recipient_id: data.assigned_to,
          type: 'new_project',
          title: '新しい課題が作成されました',
          message: data.title,
          project_id: projectId
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast('課題を登録し、担当者に通知しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    });
  },

  async deleteProject(id) {
    const p = this.state.projects.find(x => x.id === id);
    await this.ceoDeleteWithPassword(`プロジェクト: ${p?.title || ''}`, async () => {
      await db.deleteProject(id);
    });
  },

  // ===== Project Detail Modal =====
  async openProjectDetail(id) {
    const p = await db.getProject(id);
    const unit = this.state.businessUnits.find(u => u.id === p.business_unit_id);
    const company = unit ? this.state.companies.find(c => c.id === unit.company_id) : null;
    const assignee = this.state.staff.find(s => s.id === p.assigned_to);
    const creator = this.state.staff.find(s => s.id === p.created_by);

    let detailContent = '';
    if (p.solution_type === 'kpi') {
      // 現在の設計のみ（archived = 過去の差し戻し履歴は除外）
      const kpis = (await db.getKPIs(id)).filter(k => !k.archived);
      detailContent = this.renderKpiChartView(kpis);
    } else {
      // 現在の設計のみ表示 + 完了報告済み（差し戻し履歴は除外）
      const milestones = (await db.getMilestones(id)).filter(m => {
        // 差し戻し履歴は除外（completion_note に「差し戻しによる履歴化」「解決方法変更」が含まれる archived）
        if (m.archived && m.completion_note &&
            (m.completion_note.includes('差し戻しによる履歴化') ||
             m.completion_note.includes('解決方法変更により履歴化'))) {
          return false;
        }
        return true;
      });
      detailContent = this.renderMilestoneTimelineView(milestones);
    }

    // 日報履歴
    const logs = await db.getDailyLogs({ project_id: id });
    const logsHtml = logs.length === 0
      ? '<p class="text-muted">日報なし</p>'
      : logs.slice(0, 10).map(l => {
          const s = this.state.staff.find(x => x.id === l.staff_id);
          return `<div style="padding:8px 12px;border-left:3px solid var(--primary);background:var(--gray-50);margin-bottom:6px;border-radius:0 6px 6px 0;">
            <div style="font-size:11px;color:var(--gray-500);">${l.log_date} ・ ${s?.name || '-'}</div>
            <div style="margin-top:4px;font-size:13px;">${l.action_content}</div>
          </div>`;
        }).join('');

    this.showModal(p.title, `
      <div style="display:grid;grid-template-columns:auto auto;gap:8px 16px;font-size:13px;margin-bottom:16px;">
        <div class="text-muted">状態</div><div><span class="badge status-${p.status}">${this.statusLabel(p.status)}</span></div>
        <div class="text-muted">事業</div><div>${company?.code || '?'} / ${unit?.name || '?'}</div>
        <div class="text-muted">解決方法</div><div>${p.solution_type === 'kpi' ? 'KPI' : 'マイルストーン'}</div>
        <div class="text-muted">担当</div><div>${assignee?.name || '-'}</div>
        <div class="text-muted">作成者</div><div>${creator?.name || '-'}</div>
        <div class="text-muted">締切</div><div>${p.deadline || '-'}</div>
        <div class="text-muted">進捗</div><div>${p.progress_percent || 0}%</div>
      </div>
      ${p.description ? `<div class="card" style="background:var(--gray-50);"><div style="font-size:12px;color:var(--gray-500);margin-bottom:4px;">背景・詳細</div>${p.description}</div>` : ''}
      ${p.rejection_comment ? `
        <div style="background:#dbeafe;border-left:4px solid var(--primary);padding:14px 16px;border-radius:10px;margin:12px 0;">
          <div style="font-weight:700;font-size:13px;color:#1e40af;margin-bottom:6px;">💬 CEO コメント${p.rejected_at ? ` <span style="font-weight:400;font-size:11px;">（${this.formatDate(p.rejected_at)}）</span>` : ''}</div>
          <div style="font-size:13px;color:#1e3a8a;line-height:1.7;white-space:pre-wrap;">${p.rejection_comment}</div>
        </div>
      ` : ''}
      <h4 style="margin:16px 0 8px 0;font-size:14px;">${p.solution_type === 'kpi' ? '📊 KPI' : '🎯 マイルストーン'}</h4>
      ${detailContent}
      <h4 style="margin:16px 0 8px 0;font-size:14px;">📝 最近の日報</h4>
      ${logsHtml}
    `, null, true);
  },

  // ===== Archive / Complete 共通フロー =====
  CEO_DELETE_PASSWORD: 'mk550428',

  // 共通の完了報告モーダル（破棄 or アーカイブ）
  openCompletionModal(entityType, entityId, entityTitle, onArchive, onDiscard) {
    const isCEO = auth.isCEO();
    this.showModal(`完了報告: ${entityTitle}`, `
      <p class="text-muted mb-2" style="font-size:12px;">完了内容を記録します。${isCEO ? '「破棄」は履歴に残さず消去、「アーカイブ」は履歴として保存します。' : '「アーカイブ」で履歴として保存します。'}</p>
      <div class="form-group">
        <label class="form-label">完了報告 *</label>
        <textarea id="comp_note" class="form-textarea" rows="4" placeholder="達成した内容、得られた成果、学んだことなど"></textarea>
      </div>
    `, async () => {
      const note = document.getElementById('comp_note').value.trim();
      if (!note) {
        this.toast('完了報告を入力してください', 'error');
        return false;
      }
      try {
        await onArchive(note);
        this.toast('アーカイブしました（履歴に保存）');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    }, false, {
      submitLabel: '📦 アーカイブ（保存）',
      submitClass: 'btn-success',
      extraButton: isCEO ? {
        label: '🗑 破棄（管理者専用）',
        class: 'btn-danger',
        onClick: async () => {
          // 破棄もパスワード認証
          const pwdConfirm = await this.promptPassword('履歴に残さず破棄します。管理者パスワードを入力してください。');
          if (!pwdConfirm) return false;
          try {
            await onDiscard();
            this.toast('破棄しました');
            return true;
          } catch (e) {
            this.toast('エラー: ' + e.message, 'error');
            return false;
          }
        }
      } : null
    });
  },

  // CEO 用パスワード認証付き削除（マスク表示）
  async ceoDeleteWithPassword(entityName, deleteFunc) {
    if (!auth.isCEO()) {
      this.toast('削除は管理者のみ実行できます', 'error');
      return;
    }
    const ok = await this.promptPassword(`「${entityName}」を完全削除します。<br>管理者パスワードを入力してください。`);
    if (!ok) return;
    try {
      await deleteFunc();
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('完全削除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // パスワード入力モーダル（マスク表示）
  promptPassword(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '10001';
      overlay.innerHTML = `
        <div class="modal" style="max-width:420px;">
          <div class="modal-header">
            <div class="modal-title">🔒 管理者認証</div>
            <button class="modal-close" type="button" aria-label="閉じる">×</button>
          </div>
          <div class="modal-body">
            <p style="font-size:13px;color:var(--gray-700);margin-bottom:14px;line-height:1.6;">${message}</p>
            <div class="form-group">
              <label class="form-label">パスワード</label>
              <input type="password" id="pwd_input" class="form-input" autocomplete="current-password" inputmode="text" style="font-size:16px;padding:12px 14px;letter-spacing:3px;">
              <div id="pwd_error" style="display:none;color:var(--danger);font-size:12px;margin-top:6px;">パスワードが正しくありません</div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" data-action="cancel">キャンセル</button>
            <button class="btn btn-danger" type="button" data-action="confirm">🔓 確認</button>
          </div>
        </div>
      `;
      document.getElementById('modalContainer').appendChild(overlay);

      const input = overlay.querySelector('#pwd_input');
      const errorEl = overlay.querySelector('#pwd_error');
      input.focus();

      const cleanup = (result) => {
        overlay.remove();
        resolve(result);
      };

      const tryConfirm = () => {
        if (input.value === this.CEO_DELETE_PASSWORD) {
          cleanup(true);
        } else {
          errorEl.style.display = 'block';
          input.value = '';
          input.focus();
        }
      };

      overlay.querySelector('[data-action="confirm"]').addEventListener('click', tryConfirm);
      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
      overlay.querySelector('.modal-close').addEventListener('click', () => cleanup(false));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); tryConfirm(); }
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });
    });
  },

  // ===== KPI ツリーチャート（読み取り専用） =====
  renderKpiChartView(kpis) {
    if (!kpis || kpis.length === 0) {
      return '<p class="text-muted" style="text-align:center;padding:20px;">KPI 未設定</p>';
    }

    // Lv.1 を見つける
    const lv1 = kpis.find(k => (k.level || 1) === 1) || kpis.find(k => !k.parent_kpi_id);
    if (!lv1) {
      // 階層がない（古いデータ）→ 平面リスト表示
      return `<div class="kpi-tree-level2">${kpis.map(k => this.kpiViewCard(k, 2)).join('')}</div>`;
    }

    const lv2List = kpis.filter(k => k.parent_kpi_id === lv1.id);

    let html = '<div class="kpi-view-wrap">';
    html += `<div class="kpi-tree-level1">${this.kpiViewCard(lv1, 1)}</div>`;

    if (lv2List.length > 0) {
      html += '<div class="kpi-tree-arrow">▼</div>';
      html += `<div class="kpi-tree-level2">${lv2List.map(k => this.kpiViewCard(k, 2)).join('')}</div>`;

      // Lv.3 を Lv.2 ごとにグループ化
      const lv3Groups = lv2List.map(l2 => ({
        parent: l2,
        children: kpis.filter(k => k.parent_kpi_id === l2.id)
      })).filter(g => g.children.length > 0);

      if (lv3Groups.length > 0) {
        html += '<div class="kpi-tree-arrow">▼</div>';
        lv3Groups.forEach(g => {
          html += `<div class="kpi-tree-level3-group">
            <div class="kpi-tree-level3-header">
              <span class="kpi-tree-level3-label">└ <strong>${g.parent.name}</strong> の実行KPI</span>
            </div>
            <div class="kpi-tree-level3">${g.children.map(k => this.kpiViewCard(k, 3)).join('')}</div>
          </div>`;
        });
      }
    }

    html += '</div>';
    return html;
  },

  kpiViewCard(k, level) {
    const range = k.target_value - k.start_value;
    // current_value が未更新（== start_value）の場合は必ず 0%
    const hasActualProgress = k.current_value !== null && k.current_value !== undefined && k.current_value !== k.start_value;
    const rawProgress = (range !== 0 && hasActualProgress) ? ((k.current_value - k.start_value) / range) * 100 : 0;
    const progress = Math.round(Math.max(0, Math.min(100, rawProgress)));
    const progressColor = progress >= 100 ? '#10b981' : (progress >= 50 ? '#3b82f6' : (progress >= 25 ? '#f59e0b' : '#ef4444'));
    const canComplete = progress >= 100 && !k.archived;
    const isCEO = auth.isCEO();

    return `<div class="kpi-row kpi-row-lv${level} kpi-view-card">
      <div class="kpi-view-name">${k.name}</div>
      <div class="kpi-view-stats">
        <span class="kpi-view-current">${k.current_value}</span>
        <span class="kpi-view-sep">/</span>
        <span class="kpi-view-target">${k.target_value}</span>
        <span class="kpi-view-unit">${k.unit || ''}</span>
      </div>
      <div class="progress-bar" style="margin-top:4px;height:6px;"><div class="progress-fill" style="width:${progress}%;background:${progressColor};"></div></div>
      <div class="kpi-view-progress">${progress}%${k.target_date ? ` ・ ${k.target_date}` : ''}</div>
      <div style="display:flex;gap:4px;margin-top:6px;justify-content:flex-end;">
        ${canComplete ? `<button class="btn btn-sm btn-success" onclick="event.stopPropagation();App.completeKpi('${k.id}', '${k.name.replace(/'/g, "\\'")}'); ">🏁 完了報告</button>` : ''}
        ${isCEO ? `<button class="btn btn-sm" style="background:none;border:none;color:var(--gray-400);cursor:pointer;padding:2px 4px;font-size:13px;" title="完全削除" onclick="event.stopPropagation();App.ceoDeleteKpi('${k.id}', '${k.name.replace(/'/g, "\\'")}');">🗑</button>` : ''}
      </div>
    </div>`;
  },

  completeKpi(id, title) {
    this.openCompletionModal('kpi', id, title,
      async (note) => {
        await db.updateKPI(id, {
          archived: true,
          archived_at: new Date().toISOString(),
          completion_note: note
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
        // 詳細を再表示する場合は親プロジェクトから再オープン（ここではトースト後 modal を閉じる）
      },
      async () => {
        await db.deleteKPI(id);
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      }
    );
  },

  async ceoDeleteKpi(id, title) {
    await this.ceoDeleteWithPassword(`KPI: ${title}`, async () => {
      await db.deleteKPI(id);
    });
  },

  // ===== マイルストーンタイムライン（読み取り専用） =====
  renderMilestoneTimelineView(milestones) {
    if (!milestones || milestones.length === 0) {
      return '<p class="text-muted" style="text-align:center;padding:20px;">マイルストーン未設定</p>';
    }
    // 全フェーズを表示（archived 含む）。進捗計算は完了報告（archived + note）ベース
    const sorted = [...milestones].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const isCEO = auth.isCEO();
    const total = milestones.length;
    const reported = milestones.filter(m => m.archived && m.completion_note).length;

    return `<div style="margin-bottom:10px;padding:10px 14px;background:var(--gray-50);border-radius:8px;font-size:12px;display:flex;justify-content:space-between;align-items:center;">
      <span>進捗カウント：完了報告済み <strong>${reported}</strong> / 全 <strong>${total}</strong> フェーズ</span>
      <strong style="color:var(--primary);">${total > 0 ? Math.round((reported / total) * 100) : 0}%</strong>
    </div>
    <div class="ms-timeline ms-timeline-view">
      ${sorted.map((m, i) => {
        const isReported = m.archived && m.completion_note;
        const isDone = m.status === 'completed';
        const isProgress = m.status === 'in_progress';
        const numBg = isReported
          ? 'linear-gradient(135deg, #10b981, #047857)'
          : isDone
            ? 'linear-gradient(135deg, #3b82f6, #1e40af)'
            : isProgress
              ? 'linear-gradient(135deg, #3b82f6, #1e40af)'
              : 'linear-gradient(135deg, #9ca3af, #6b7280)';
        const bodyBg = isReported
          ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
          : isDone
            ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
            : isProgress
              ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
              : 'linear-gradient(135deg, var(--gray-50), var(--gray-100))';
        const borderColor = isReported ? '#10b981' : (isDone || isProgress) ? '#3b82f6' : '#d1d5db';
        const icon = isReported ? '✅' : isDone ? '🔵' : isProgress ? '🔄' : '⏳';

        return `<div class="ms-phase ms-phase-view">
          <div class="ms-phase-num" style="background:${numBg};">${isReported ? '✓' : (i + 1)}</div>
          <div class="ms-phase-body" style="background:${bodyBg};border-color:${borderColor};">
            <div class="ms-view-title">${icon} ${m.title} ${isReported ? '<span class="badge badge-success" style="font-size:10px;margin-left:6px;">完了報告済み</span>' : ''}</div>
            ${m.description ? `<div class="ms-view-desc">${m.description}</div>` : ''}
            ${isReported && m.completion_note ? `<div style="margin-top:6px;padding:8px 10px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:12px;color:#065f46;">📝 ${m.completion_note}</div>` : ''}
            <div class="ms-view-meta">
              ${m.due_date ? `<span>📅 期限 ${m.due_date}</span>` : ''}
              ${m.archived_at ? `<span style="color:var(--success);">✓ 完了報告 ${this.formatDate(m.archived_at)}</span>` : (m.completed_at ? `<span style="color:var(--primary);">完了マーク ${this.formatDate(m.completed_at)}</span>` : '')}
            </div>
            <div style="display:flex;gap:4px;margin-top:8px;">
              ${!isReported ? `<button class="btn btn-sm btn-success" onclick="event.stopPropagation();App.completeMilestone('${m.id}', '${m.title.replace(/'/g, "\\'")}');">🏁 完了報告</button>` : ''}
              ${isCEO ? `<button class="btn btn-sm" style="background:none;border:none;color:var(--gray-400);cursor:pointer;padding:2px 4px;font-size:13px;margin-left:auto;" title="完全削除" onclick="event.stopPropagation();App.ceoDeleteMilestone('${m.id}', '${m.title.replace(/'/g, "\\'")}');">🗑</button>` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },

  completeMilestone(id, title) {
    this.openCompletionModal('milestone', id, title,
      async (note) => {
        await db.updateMilestone(id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_note: note,
          archived: true,
          archived_at: new Date().toISOString()
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      },
      async () => {
        await db.deleteMilestone(id);
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      }
    );
  },

  archiveMilestone(id, title) {
    this.openCompletionModal('milestone', id, title,
      async (note) => {
        await db.updateMilestone(id, {
          completion_note: note,
          archived: true,
          archived_at: new Date().toISOString()
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      },
      async () => {
        await db.deleteMilestone(id);
        await this.loadAllData();
        this.renderCurrentPage();
        this.closeModal();
      }
    );
  },

  async ceoDeleteMilestone(id, title) {
    await this.ceoDeleteWithPassword(`マイルストーン: ${title}`, async () => {
      await db.deleteMilestone(id);
    });
  },

  // ===== Design (担当者がKPI/Milestoneを設計) =====
  renderDesign() {
    const container = document.getElementById('designContent');
    const isCEO = auth.isCEO();

    // CEO の場合はタブ表示（設計待ち + 履歴）
    if (isCEO) {
      this.renderDesignForCEO(container);
      return;
    }

    const myProjects = this.state.projects.filter(p =>
      p.assigned_to === auth.currentUser.id && p.status === 'pending_design'
    );
    if (myProjects.length === 0) {
      container.innerHTML = this.emptyState('📐', '設計待ち課題なし', '自分が担当の未設計プロジェクトはありません');
      return;
    }

    let html = '<p class="text-muted mb-2">あなたに割り当てられた課題です。KPI または マイルストーンを設計してCEOに提出してください。</p>';
    myProjects.forEach(p => {
      const unit = this.state.businessUnits.find(u => u.id === p.business_unit_id);
      const company = unit ? this.state.companies.find(c => c.id === unit.company_id) : null;
      const hasDraft = this.isDraftValid(p.id);
      const isRejected = !!p.rejection_comment;
      html += `<div class="card" ${p.rejection_comment ? 'style="border-left:4px solid var(--danger);"' : ''}>
        <div class="card-header">
          <div class="card-title">${p.title}</div>
          <span class="badge ${p.solution_type === 'kpi' ? 'badge-info' : 'badge-warning'}">${p.solution_type === 'kpi' ? 'KPI 設計' : 'マイルストーン 設計'}</span>
        </div>
        <div class="text-muted mb-2" style="font-size:12px;">
          ${company?.code || '?'} / ${unit?.name || '?'} ・ 締切 ${p.deadline || '-'}
        </div>
        ${p.description ? `<div class="mb-2" style="font-size:13px;color:var(--gray-700);">${p.description}</div>` : ''}
        ${p.rejection_comment ? `
          <div style="background:#fee2e2;border-left:4px solid var(--danger);padding:12px 14px;border-radius:8px;margin-bottom:12px;">
            <div style="font-size:12px;font-weight:600;color:#991b1b;margin-bottom:4px;">⚠️ CEO からの差し戻しコメント</div>
            <div style="font-size:13px;color:#7f1d1d;line-height:1.6;white-space:pre-wrap;">${p.rejection_comment}</div>
            ${p.rejected_at ? `<div style="font-size:10px;color:#991b1b;margin-top:6px;">差し戻し: ${this.formatDate(p.rejected_at)}</div>` : ''}
            <div style="font-size:11px;color:#7f1d1d;margin-top:8px;background:rgba(255,255,255,0.5);padding:6px 8px;border-radius:4px;">📦 前回の設計は履歴にアーカイブされました。コメントを参考に新規で設計してください。</div>
          </div>
        ` : ''}
        ${hasDraft ? `<div style="background:#dbeafe;color:#1e40af;padding:8px 12px;border-radius:6px;font-size:12px;margin-bottom:8px;">📝 作成中の下書きが保存されています</div>` : ''}
        <button class="btn btn-primary btn-sm" onclick="App.openDesignModal('${p.id}')">${isRejected ? '🆕 新規に設計する' : (hasDraft ? '下書きを開く' : '設計する')}</button>
      </div>`;
    });
    container.innerHTML = html;
  },

  // CEO 用設計画面（タブ: 進行中 / 履歴）
  async renderDesignForCEO(container) {
    const allProjects = this.state.projects;
    container.innerHTML = `
      <div class="settings-tabs">
        <button class="design-tab active" data-tab="active">📋 進行中の設計</button>
        <button class="design-tab" data-tab="history">📚 履歴ログ</button>
      </div>
      <div id="designTabContent"></div>
    `;
    document.querySelectorAll('.design-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.design-tab').forEach(x => x.classList.toggle('active', x === t));
        this.renderDesignCeoTab(t.dataset.tab);
      });
    });
    this.renderDesignCeoTab('active');
  },

  async renderDesignCeoTab(tab) {
    const el = document.getElementById('designTabContent');
    if (tab === 'active') {
      // 設計待ち + 承認待ち の全プロジェクト
      const list = this.state.projects.filter(p =>
        p.status === 'pending_design' || p.status === 'pending_approval'
      );
      if (list.length === 0) {
        el.innerHTML = this.emptyState('📐', '進行中の設計なし', '');
        return;
      }
      let html = '';
      list.forEach(p => {
        const unit = this.state.businessUnits.find(u => u.id === p.business_unit_id);
        const assignee = this.state.staff.find(s => s.id === p.assigned_to);
        html += `<div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${p.title}</div>
              <div class="text-muted" style="font-size:11px;margin-top:2px;">${unit?.name || '?'} ・ 担当 ${assignee?.name || '-'}</div>
            </div>
            <span class="badge status-${p.status}">${this.statusLabel(p.status)}</span>
          </div>
          ${p.rejection_comment ? `
            <div style="background:#dbeafe;border-left:4px solid var(--primary);padding:10px 12px;border-radius:6px;font-size:12px;color:#1e3a8a;margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong>💬 CEO コメント（担当者にも表示）</strong>
                ${p.rejected_at ? `<span style="font-size:10px;color:#1e40af;">${this.formatDate(p.rejected_at)}</span>` : ''}
              </div>
              <div style="white-space:pre-wrap;line-height:1.6;">${p.rejection_comment}</div>
            </div>
          ` : ''}
          <div class="flex gap-1" style="flex-wrap:wrap;">
            <button class="btn btn-sm btn-secondary" onclick="App.openProjectDetail('${p.id}')">詳細</button>
            <button class="btn btn-sm btn-primary" onclick="App.editProjectComment('${p.id}')">💬 ${p.rejection_comment ? 'コメント編集' : 'コメント追加'}</button>
            <button class="btn btn-sm btn-warning" onclick="App.changeSolutionType('${p.id}')" title="解決方法を切替">🔄 ${p.solution_type === 'kpi' ? 'マイルストーン' : 'KPI'}に切替</button>
            ${p.status === 'pending_approval' ? `<button class="btn btn-sm btn-success" onclick="App.approveProject('${p.id}')">✅ 承認</button>
            <button class="btn btn-sm btn-danger" onclick="App.rejectProject('${p.id}')">↩ 差し戻し</button>` : ''}
          </div>
        </div>`;
      });
      el.innerHTML = html;
    } else {
      // 履歴: archived = true の KPI / Milestone（全プロジェクトから）
      el.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px;">読み込み中...</div>';
      try {
        // 全プロジェクトの archived KPI/Milestone を集める
        const allKpis = [];
        const allMs = [];
        for (const p of this.state.projects) {
          const ks = await db.getKPIs(p.id);
          ks.filter(k => k.archived).forEach(k => allKpis.push({ ...k, _project: p }));
          const ms = await db.getMilestones(p.id);
          ms.filter(m => m.archived).forEach(m => allMs.push({ ...m, _project: p }));
        }
        allKpis.sort((a, b) => new Date(b.archived_at || 0) - new Date(a.archived_at || 0));
        allMs.sort((a, b) => new Date(b.archived_at || 0) - new Date(a.archived_at || 0));

        let html = '<div class="card"><div class="card-title">📊 KPI 履歴</div>';
        if (allKpis.length === 0) {
          html += '<p class="text-muted" style="font-size:12px;">履歴なし</p>';
        } else {
          allKpis.slice(0, 50).forEach(k => {
            html += `<div style="padding:10px 12px;border-bottom:1px solid var(--gray-100);display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;">${k.name}</div>
                <div style="font-size:11px;color:var(--gray-500);">${k._project.title} ・ Lv.${k.level || 1} ・ ${k.archived_at ? this.formatDate(k.archived_at) : ''}</div>
                ${k.completion_note ? `<div style="font-size:11px;color:var(--gray-600);margin-top:2px;">${k.completion_note}</div>` : ''}
              </div>
              <button class="btn btn-sm" style="background:none;border:none;color:var(--gray-400);cursor:pointer;" title="完全削除" onclick="App.ceoDeleteKpi('${k.id}', '${k.name.replace(/'/g, "\\'")}');">🗑</button>
            </div>`;
          });
        }
        html += '</div>';

        html += '<div class="card mt-2"><div class="card-title">🎯 マイルストーン 履歴</div>';
        if (allMs.length === 0) {
          html += '<p class="text-muted" style="font-size:12px;">履歴なし</p>';
        } else {
          allMs.slice(0, 50).forEach(m => {
            html += `<div style="padding:10px 12px;border-bottom:1px solid var(--gray-100);display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;">${m.title}</div>
                <div style="font-size:11px;color:var(--gray-500);">${m._project.title} ・ ${m.archived_at ? this.formatDate(m.archived_at) : ''}</div>
                ${m.completion_note ? `<div style="font-size:11px;color:var(--gray-600);margin-top:2px;">${m.completion_note}</div>` : ''}
              </div>
              <button class="btn btn-sm" style="background:none;border:none;color:var(--gray-400);cursor:pointer;" title="完全削除" onclick="App.ceoDeleteMilestone('${m.id}', '${m.title.replace(/'/g, "\\'")}');">🗑</button>
            </div>`;
          });
        }
        html += '</div>';
        el.innerHTML = html;
      } catch (e) {
        el.innerHTML = '<p class="text-danger">読み込みエラー: ' + e.message + '</p>';
      }
    }
  },

  async openDesignModal(projectId) {
    const p = await db.getProject(projectId);
    let bodyHtml = '';

    // 差し戻しコメント表示
    const rejectionBlock = p.rejection_comment ? `
      <div style="background:#fee2e2;border-left:4px solid var(--danger);padding:14px 16px;border-radius:10px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:6px;">⚠️ CEO からの差し戻しコメント</div>
        <div style="font-size:13px;color:#7f1d1d;line-height:1.7;white-space:pre-wrap;">${p.rejection_comment}</div>
        ${p.rejected_at ? `<div style="font-size:10px;color:#991b1b;margin-top:6px;">差し戻し: ${this.formatDate(p.rejected_at)}</div>` : ''}
      </div>
    ` : '';

    // 自動保存中のお知らせ
    const autoSaveBlock = `
      <div id="autoSaveStatus" style="font-size:11px;color:var(--gray-500);text-align:right;margin-bottom:6px;">📝 自動保存待機中</div>
    `;

    if (p.solution_type === 'kpi') {
      bodyHtml = rejectionBlock + `
        <div class="kpi-chart-info">
          <div class="kpi-chart-info-title">📊 KPI ツリー設計（3階層必須）</div>
          <div class="kpi-chart-info-desc">
            <span class="kpi-level-tag kpi-level-1">Lv.1 メイン</span> <strong>1個</strong> →
            <span class="kpi-level-tag kpi-level-2">Lv.2 中位</span> <strong>2〜3個</strong> →
            <span class="kpi-level-tag kpi-level-3">Lv.3 実行</span> <strong>合計4〜9個</strong>
          </div>
        </div>
        ${autoSaveBlock}

        <div class="kpi-tree-section">
          <div class="kpi-tree-section-title"><span class="kpi-level-tag kpi-level-1">Lv.1</span> メイン KPI（このプロジェクトの最終目標）</div>
          <div id="kpiLevel1" class="kpi-tree-level1"></div>
        </div>

        <div class="kpi-tree-arrow">▼</div>

        <div class="kpi-tree-section">
          <div class="kpi-tree-section-title">
            <span class="kpi-level-tag kpi-level-2">Lv.2</span> 中位 KPI（メインを分解：2〜3個）
            <button type="button" class="btn btn-sm btn-secondary" onclick="App.addKpiLevel2()" style="margin-left:auto;">+ 中位KPI 追加</button>
          </div>
          <div id="kpiLevel2" class="kpi-tree-level2"></div>
        </div>

        <div class="kpi-tree-arrow">▼</div>

        <div class="kpi-tree-section">
          <div class="kpi-tree-section-title">
            <span class="kpi-level-tag kpi-level-3">Lv.3</span> 実行 KPI（中位ごとに子を設定：合計4〜9個）
          </div>
          <div id="kpiLevel3Container"></div>
        </div>
      `;
    } else {
      bodyHtml = rejectionBlock + `
        <div class="kpi-chart-info" style="background:linear-gradient(135deg,#fef3c7,#fde68a);">
          <div class="kpi-chart-info-title">🎯 マイルストーン タイムライン（5フェーズ以上）</div>
          <div class="kpi-chart-info-desc">
            期限まで <strong>5フェーズ以上</strong> に分けて、達成までの道筋を描いてください。
          </div>
        </div>
        ${autoSaveBlock}
        <div id="msTimeline" class="ms-timeline"></div>
        <div style="text-align:center;margin-top:10px;">
          <button class="btn btn-primary btn-sm" type="button" onclick="App.addMilestoneRow()">+ フェーズ追加</button>
        </div>
        <div id="msCounter" style="text-align:center;margin-top:8px;font-size:12px;color:var(--gray-500);"></div>
      `;
    }

    // 現在編集中のプロジェクト ID を記録（自動保存用）
    this._currentDesignProjectId = projectId;
    this._currentDesignType = p.solution_type;

    this.showModal(`設計: ${p.title}`, bodyHtml, async () => {
      // 提出前のバリデーション → ダブルチェック → 実行
      try {
        if (p.solution_type === 'kpi') {
          // Level 1
          const lv1Row = document.querySelector('#kpiLevel1 .kpi-row');
          if (!lv1Row || !lv1Row.querySelector('.k-name').value.trim() || isNaN(parseFloat(lv1Row.querySelector('.k-target').value))) {
            this.toast('Lv.1 メインKPI が未入力です', 'error'); return false;
          }
          // Level 2
          const lv2Rows = Array.from(document.querySelectorAll('#kpiLevel2 .kpi-row'));
          const lv2Valid = lv2Rows.filter(r => r.querySelector('.k-name').value.trim() && !isNaN(parseFloat(r.querySelector('.k-target').value)));
          if (lv2Valid.length < 2 || lv2Valid.length > 3) {
            this.toast('Lv.2 中位KPI は 2〜3個 必要です', 'error'); return false;
          }
          // Level 3
          const lv3AllRows = Array.from(document.querySelectorAll('.kpi-tree-level3 .kpi-row'));
          const lv3Valid = lv3AllRows.filter(r => r.querySelector('.k-name').value.trim() && !isNaN(parseFloat(r.querySelector('.k-target').value)));
          if (lv3Valid.length < 4 || lv3Valid.length > 9) {
            this.toast('Lv.3 実行KPI は合計 4〜9個 必要です（現在 ' + lv3Valid.length + ' 個）', 'error'); return false;
          }

          // ダブルチェック確認
          const ok = await this.confirmSubmit(
            'KPI 設計を提出してよろしいですか？',
            `Lv.1: 1個 / Lv.2: ${lv2Valid.length}個 / Lv.3: ${lv3Valid.length}個 を CEO に提出します。`
          );
          if (!ok) return false;

          // ★ 重要: 既存の非アーカイブ KPI を削除（重複防止）
          const existingKpis = await db.getKPIs(projectId);
          const toDelete = existingKpis.filter(ek => !ek.archived);
          console.log('[Submit] 削除する既存KPI数:', toDelete.length);
          for (const ek of toDelete) {
            try {
              await db.deleteKPI(ek.id);
            } catch (delErr) {
              console.error('[Submit] KPI削除エラー:', ek.id, delErr);
              throw new Error('既存KPI削除失敗: ' + delErr.message);
            }
          }

          // Save Level 1
          const lv1Data = await db.createKPI({
            project_id: projectId, level: 1, parent_kpi_id: null,
            name: lv1Row.querySelector('.k-name').value.trim(),
            unit: lv1Row.querySelector('.k-unit').value.trim(),
            start_value: parseFloat(lv1Row.querySelector('.k-start').value) || 0,
            target_value: parseFloat(lv1Row.querySelector('.k-target').value),
            current_value: parseFloat(lv1Row.querySelector('.k-start').value) || 0,
            target_date: lv1Row.querySelector('.k-date').value || null
          });
          const lv1Id = Array.isArray(lv1Data) ? lv1Data[0].id : lv1Data.id;

          // Save Level 2 with parent = Lv.1
          const lv2IdMap = {}; // localIdx -> dbId
          for (let i = 0; i < lv2Valid.length; i++) {
            const r = lv2Valid[i];
            const localIdx = r.dataset.localIdx;
            const created = await db.createKPI({
              project_id: projectId, level: 2, parent_kpi_id: lv1Id,
              name: r.querySelector('.k-name').value.trim(),
              unit: r.querySelector('.k-unit').value.trim(),
              start_value: parseFloat(r.querySelector('.k-start').value) || 0,
              target_value: parseFloat(r.querySelector('.k-target').value),
              current_value: parseFloat(r.querySelector('.k-start').value) || 0,
              target_date: r.querySelector('.k-date').value || null
            });
            lv2IdMap[localIdx] = Array.isArray(created) ? created[0].id : created.id;
          }

          // Save Level 3 with parent = Lv.2
          for (const r of lv3Valid) {
            const parentLocalIdx = r.dataset.parentLocalIdx;
            const parentId = lv2IdMap[parentLocalIdx];
            if (!parentId) continue;
            await db.createKPI({
              project_id: projectId, level: 3, parent_kpi_id: parentId,
              name: r.querySelector('.k-name').value.trim(),
              unit: r.querySelector('.k-unit').value.trim(),
              start_value: parseFloat(r.querySelector('.k-start').value) || 0,
              target_value: parseFloat(r.querySelector('.k-target').value),
              current_value: parseFloat(r.querySelector('.k-start').value) || 0,
              target_date: r.querySelector('.k-date').value || null
            });
          }
        } else {
          const rows = document.querySelectorAll('#msTimeline .ms-row');
          const valid = Array.from(rows).filter(r => r.querySelector('.m-title').value.trim());
          if (valid.length < 5) {
            this.toast('マイルストーンは 5フェーズ以上 必要です（現在 ' + valid.length + ' 個）', 'error');
            return false;
          }

          // ダブルチェック確認
          const ok = await this.confirmSubmit(
            'マイルストーン設計を提出してよろしいですか？',
            `${valid.length}個のフェーズを CEO に提出します。`
          );
          if (!ok) return false;

          // ★ 重要: 既存の非アーカイブ Milestone を削除（重複防止）
          const existingMs = await db.getMilestones(projectId);
          const msToDelete = existingMs.filter(em => !em.archived);
          console.log('[Submit] 削除する既存マイルストーン数:', msToDelete.length);
          for (const em of msToDelete) {
            try {
              await db.deleteMilestone(em.id);
            } catch (delErr) {
              console.error('[Submit] マイルストーン削除エラー:', em.id, delErr);
              throw new Error('既存マイルストーン削除失敗: ' + delErr.message);
            }
          }

          let order = 0;
          for (const row of valid) {
            await db.createMilestone({
              project_id: projectId,
              title: row.querySelector('.m-title').value.trim(),
              description: row.querySelector('.m-desc').value.trim(),
              due_date: row.querySelector('.m-date').value || null,
              display_order: order++
            });
          }
        }

        // ステータスを承認待ちに（差し戻しコメントをクリア + 提出時刻スタンプ）
        const nowIso = new Date().toISOString();
        await db.updateProject(projectId, {
          status: 'pending_approval',
          rejection_comment: null,
          rejected_at: null,
          submitted_at: nowIso
        });
        // CEO に通知
        const ceos = this.state.staff.filter(s => s.role === 'ceo');
        for (const ceo of ceos) {
          await db.createNotification({
            recipient_id: ceo.id,
            type: 'design_submitted',
            title: 'KPI/マイルストーンが提出されました',
            message: p.title,
            project_id: projectId
          });
        }
        // 下書き削除
        localStorage.removeItem('design_draft_' + projectId);
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast('設計を提出しました。CEO の承認を待ちます');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    }, false, {
      submitLabel: '📤 提出',
      submitClass: 'btn-success',
      extraButton: {
        label: '💾 保存（下書き）',
        class: 'btn-secondary',
        onClick: async () => {
          this.saveDesignDraft(projectId, p.solution_type);
          this.toast('下書きを保存しました');
          return false; // モーダルを閉じない
        }
      }
    });

    setTimeout(() => {
      // 下書き読み込み
      const draft = this.loadDesignDraft(projectId);

      if (p.solution_type === 'kpi') {
        if (draft && draft.type === 'kpi') {
          // 復元
          this.addKpiRow(document.getElementById('kpiLevel1'), 1, '');
          this.fillKpiRow(document.querySelector('#kpiLevel1 .kpi-row'), draft.lv1);
          (draft.lv2 || []).forEach((l2, idx) => {
            this.addKpiLevel2();
            const lv2Row = document.querySelectorAll('#kpiLevel2 .kpi-row')[idx];
            if (lv2Row) this.fillKpiRow(lv2Row, l2);
          });
          (draft.lv3 || []).forEach((l3, idx) => {
            const lv2Row = document.querySelectorAll('#kpiLevel2 .kpi-row')[l3.parentIdx];
            if (!lv2Row) return;
            const parentLocalIdx = lv2Row.dataset.localIdx;
            this.addKpiLevel3(parentLocalIdx);
            const lv3Rows = document.querySelectorAll(`.kpi-tree-level3[data-parent-local-idx="${parentLocalIdx}"] .kpi-row`);
            const targetRow = lv3Rows[lv3Rows.length - 1];
            if (targetRow) this.fillKpiRow(targetRow, l3);
          });
          this.toast('下書きを復元しました');
        } else {
          this.addKpiRow(document.getElementById('kpiLevel1'), 1, '');
          this.addKpiLevel2();
          this.addKpiLevel2();
        }
      } else {
        if (draft && draft.type === 'milestone' && draft.phases?.length > 0) {
          draft.phases.forEach(phase => {
            this.addMilestoneRow();
            const rows = document.querySelectorAll('#msTimeline .ms-row');
            const last = rows[rows.length - 1];
            if (last) {
              last.querySelector('.m-title').value = phase.title || '';
              last.querySelector('.m-desc').value = phase.desc || '';
              last.querySelector('.m-date').value = phase.date || '';
            }
          });
          this.toast('下書きを復元しました');
        } else {
          for (let i = 0; i < 5; i++) this.addMilestoneRow();
        }
        this.updateMilestoneCounter();
      }

      // 自動保存リスナー
      this.attachAutoSave(projectId, p.solution_type);
    }, 50);
  },

  fillKpiRow(row, data) {
    if (!row || !data) return;
    row.querySelector('.k-name').value = data.name || '';
    row.querySelector('.k-start').value = data.start ?? 0;
    row.querySelector('.k-target').value = data.target ?? '';
    row.querySelector('.k-unit').value = data.unit || '';
    row.querySelector('.k-date').value = data.date || '';
  },

  // 提出前のダブルチェック確認モーダル
  confirmSubmit(title, description) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '10001';
      overlay.innerHTML = `
        <div class="modal" style="max-width:420px;">
          <div class="modal-header">
            <div class="modal-title">📤 提出確認</div>
          </div>
          <div class="modal-body">
            <div style="text-align:center;margin-bottom:14px;">
              <div style="font-size:42px;line-height:1;margin-bottom:8px;">⚠️</div>
              <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${title}</div>
              <div style="font-size:12px;color:var(--gray-600);line-height:1.6;">${description}</div>
              <div style="font-size:11px;color:var(--gray-500);margin-top:10px;">提出後は CEO の承認待ちとなります。<br>差し戻しの場合はコメント付きで戻ってきます。</div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-action="cancel">戻って確認</button>
            <button class="btn btn-success" data-action="confirm">✅ 提出する</button>
          </div>
        </div>
      `;
      document.getElementById('modalContainer').appendChild(overlay);
      const cleanup = (r) => { overlay.remove(); resolve(r); };
      overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => cleanup(true));
      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });
    });
  },

  // 下書き保存・復元
  saveDesignDraft(projectId, solutionType) {
    try {
      if (solutionType === 'kpi') {
        const lv1Row = document.querySelector('#kpiLevel1 .kpi-row');
        if (!lv1Row) return;
        const readRow = (r) => ({
          name: r.querySelector('.k-name').value,
          start: r.querySelector('.k-start').value,
          target: r.querySelector('.k-target').value,
          unit: r.querySelector('.k-unit').value,
          date: r.querySelector('.k-date').value
        });
        const lv1 = readRow(lv1Row);
        const lv2Rows = Array.from(document.querySelectorAll('#kpiLevel2 .kpi-row'));
        const lv2 = lv2Rows.map(r => readRow(r));
        const lv3 = [];
        lv2Rows.forEach((lv2Row, parentIdx) => {
          const parentLocalIdx = lv2Row.dataset.localIdx;
          const children = document.querySelectorAll(`.kpi-tree-level3[data-parent-local-idx="${parentLocalIdx}"] .kpi-row`);
          children.forEach(c => lv3.push({ ...readRow(c), parentIdx }));
        });
        const draft = { type: 'kpi', lv1, lv2, lv3, savedAt: Date.now() };
        localStorage.setItem('design_draft_' + projectId, JSON.stringify(draft));
      } else {
        const rows = Array.from(document.querySelectorAll('#msTimeline .ms-row'));
        const phases = rows.map(r => ({
          title: r.querySelector('.m-title').value,
          desc: r.querySelector('.m-desc').value,
          date: r.querySelector('.m-date').value
        }));
        const draft = { type: 'milestone', phases, savedAt: Date.now() };
        localStorage.setItem('design_draft_' + projectId, JSON.stringify(draft));
      }
      const indicator = document.getElementById('autoSaveStatus');
      if (indicator) {
        indicator.textContent = '✓ ' + new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' に自動保存しました';
        indicator.style.color = 'var(--success)';
      }
    } catch (e) {
      console.error('saveDesignDraft error:', e);
      this.toast('下書き保存エラー: ' + e.message, 'error');
    }
  },

  loadDesignDraft(projectId) {
    try {
      const json = localStorage.getItem('design_draft_' + projectId);
      if (!json) return null;
      const draft = JSON.parse(json);
      // 差し戻し後の下書きは破棄
      const project = this.state.projects.find(p => p.id === projectId);
      if (project && project.rejected_at && draft.savedAt) {
        const rejTime = new Date(project.rejected_at).getTime();
        if (rejTime > draft.savedAt) {
          localStorage.removeItem('design_draft_' + projectId);
          return null;
        }
      }
      return draft;
    } catch { return null; }
  },

  // 差し戻し後かどうか（担当者の renderDesign カード判定用）
  isDraftValid(projectId) {
    try {
      const json = localStorage.getItem('design_draft_' + projectId);
      if (!json) return false;
      const draft = JSON.parse(json);
      const project = this.state.projects.find(p => p.id === projectId);
      if (project && project.rejected_at && draft.savedAt) {
        const rejTime = new Date(project.rejected_at).getTime();
        if (rejTime > draft.savedAt) {
          localStorage.removeItem('design_draft_' + projectId);
          return false;
        }
      }
      return true;
    } catch { return false; }
  },

  attachAutoSave(projectId, solutionType) {
    if (this._autoSaveHandler) document.removeEventListener('input', this._autoSaveHandler, true);
    let timer;
    this._autoSaveHandler = (e) => {
      if (!e.target.closest('.kpi-row, .ms-row')) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.saveDesignDraft(projectId, solutionType), 600);
    };
    document.addEventListener('input', this._autoSaveHandler, true);
  },

  // Level 1/2/3 共通カード生成
  addKpiRow(container, level, parentLocalIdx) {
    const placeholders = {
      1: { name: '例: 売上 1億円', unit: '円' },
      2: { name: '例: 新規顧客売上 50百万', unit: '円' },
      3: { name: '例: Web経由 月10件', unit: '件' }
    };
    const ph = placeholders[level];
    const localIdx = Math.random().toString(36).slice(2, 8);
    const row = document.createElement('div');
    row.className = `kpi-row kpi-row-lv${level}`;
    row.dataset.localIdx = localIdx;
    if (parentLocalIdx) row.dataset.parentLocalIdx = parentLocalIdx;
    row.innerHTML = `
      ${level > 1 ? `<button type="button" class="kpi-remove" onclick="App.removeKpiRow(this, ${level})">×</button>` : ''}
      <div class="kpi-row-fields">
        <input type="text" class="form-input k-name" placeholder="${ph.name}">
        <div class="kpi-row-numeric">
          <input type="number" class="form-input k-start" step="any" placeholder="現在値" value="0">
          <span class="kpi-arrow-small">→</span>
          <input type="number" class="form-input k-target" step="any" placeholder="目標値 *">
          <input type="text" class="form-input k-unit" placeholder="${ph.unit}">
        </div>
        <input type="date" class="form-input k-date" title="期限">
      </div>
    `;
    container.appendChild(row);
    return row;
  },

  addKpiLevel2() {
    const lv2Container = document.getElementById('kpiLevel2');
    const lv2Rows = lv2Container.querySelectorAll('.kpi-row');
    if (lv2Rows.length >= 3) {
      this.toast('Lv.2 は最大3個まで', 'warning');
      return;
    }
    const newRow = this.addKpiRow(lv2Container, 2, '');
    // 対応する Lv.3 コンテナを作る
    const lv3wrap = document.createElement('div');
    lv3wrap.className = 'kpi-tree-level3-group';
    lv3wrap.dataset.parentLocalIdx = newRow.dataset.localIdx;
    lv3wrap.innerHTML = `
      <div class="kpi-tree-level3-header">
        <span class="kpi-tree-level3-label">└ <span class="lv3-parent-name">中位KPI ${lv2Rows.length + 1}</span> の実行KPI</span>
        <button type="button" class="btn btn-sm btn-secondary" onclick="App.addKpiLevel3('${newRow.dataset.localIdx}')">+ 実行KPI 追加</button>
      </div>
      <div class="kpi-tree-level3" data-parent-local-idx="${newRow.dataset.localIdx}"></div>
    `;
    document.getElementById('kpiLevel3Container').appendChild(lv3wrap);

    // 親 Lv2 の name 入力を Lv3 ヘッダーに同期
    newRow.querySelector('.k-name').addEventListener('input', (e) => {
      const label = lv3wrap.querySelector('.lv3-parent-name');
      label.textContent = e.target.value.trim() || `中位KPI ${lv2Rows.length + 1}`;
    });

    // 初期で Lv.3 を 2 個追加
    this.addKpiLevel3(newRow.dataset.localIdx);
    this.addKpiLevel3(newRow.dataset.localIdx);
  },

  addKpiLevel3(parentLocalIdx) {
    const allLv3 = document.querySelectorAll('.kpi-tree-level3 .kpi-row');
    if (allLv3.length >= 9) {
      this.toast('Lv.3 は合計9個まで', 'warning');
      return;
    }
    const container = document.querySelector(`.kpi-tree-level3[data-parent-local-idx="${parentLocalIdx}"]`);
    if (!container) return;
    this.addKpiRow(container, 3, parentLocalIdx);
  },

  removeKpiRow(btn, level) {
    const row = btn.closest('.kpi-row');
    if (level === 2) {
      // Lv.2 削除時は配下の Lv.3 グループも削除
      const localIdx = row.dataset.localIdx;
      const lv3group = document.querySelector(`.kpi-tree-level3-group[data-parent-local-idx="${localIdx}"]`);
      if (lv3group) lv3group.remove();
    }
    row.remove();
  },

  addMilestoneRow() {
    const list = document.getElementById('msTimeline');
    const idx = list.children.length + 1;
    const row = document.createElement('div');
    row.className = 'ms-row ms-phase';
    row.innerHTML = `
      <div class="ms-phase-num">${idx}</div>
      <div class="ms-phase-body">
        <button type="button" class="ms-phase-remove" onclick="this.closest('.ms-phase').remove(); App.refreshMilestoneNumbers();">×</button>
        <input type="text" class="form-input m-title" placeholder="フェーズ${idx} のタイトル *">
        <input type="text" class="form-input m-desc" placeholder="達成条件・成果物">
        <input type="date" class="form-input m-date" title="期限">
      </div>
    `;
    list.appendChild(row);
    this.updateMilestoneCounter();
  },

  refreshMilestoneNumbers() {
    document.querySelectorAll('#msTimeline .ms-phase').forEach((el, i) => {
      el.querySelector('.ms-phase-num').textContent = i + 1;
      const titleInput = el.querySelector('.m-title');
      if (titleInput.placeholder.startsWith('フェーズ')) {
        titleInput.placeholder = `フェーズ${i + 1} のタイトル *`;
      }
    });
    this.updateMilestoneCounter();
  },

  updateMilestoneCounter() {
    const count = document.querySelectorAll('#msTimeline .ms-phase').length;
    const el = document.getElementById('msCounter');
    if (el) {
      el.innerHTML = count >= 5
        ? `<span style="color:var(--success);">✓ ${count} フェーズ（5以上 OK）</span>`
        : `<span style="color:var(--danger);">⚠️ ${count} フェーズ（最低 5 必要、あと ${5 - count} 個）</span>`;
    }
  },

  // ===== Approval (CEO 承認) =====
  renderApproval() {
    const container = document.getElementById('approvalContent');
    if (!auth.isCEO()) {
      container.innerHTML = '<p class="text-muted">この画面は CEO のみ利用可能です</p>';
      return;
    }
    const pending = this.state.projects.filter(p => p.status === 'pending_approval');
    if (pending.length === 0) {
      container.innerHTML = this.emptyState('✅', '承認待ち課題なし', '担当者からの提出を待っています');
      return;
    }

    let html = '<p class="text-muted mb-2">担当者が提出した KPI/マイルストーンを確認して承認します。</p>';
    pending.forEach(p => {
      const unit = this.state.businessUnits.find(u => u.id === p.business_unit_id);
      const assignee = this.state.staff.find(s => s.id === p.assigned_to);
      html += `<div class="card">
        <div class="card-header">
          <div class="card-title">${p.title}</div>
          <span class="badge status-pending_approval">承認待ち</span>
        </div>
        <div class="text-muted mb-2" style="font-size:12px;">
          ${unit?.name || '?'} ・ 担当 ${assignee?.name || '?'} ・ 締切 ${p.deadline || '-'}
        </div>
        <div class="flex gap-1">
          <button class="btn btn-sm btn-secondary" onclick="App.openProjectDetail('${p.id}')">内容を確認</button>
          <button class="btn btn-sm btn-success" onclick="App.approveProject('${p.id}')">✅ 承認してアクティブ化</button>
          <button class="btn btn-sm btn-danger" onclick="App.rejectProject('${p.id}')">差し戻し</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
  },

  async approveProject(id) {
    const p = this.state.projects.find(x => x.id === id);
    if (!confirm(`「${p.title}」を承認してアクティブ化しますか？`)) return;
    try {
      await db.updateProject(id, {
        status: 'active',
        approved_by: auth.currentUser.id,
        approved_at: new Date().toISOString()
      });
      await db.createNotification({
        recipient_id: p.assigned_to,
        type: 'project_approved',
        title: '課題が承認されました',
        message: p.title + ' - 実行を開始してください',
        project_id: id
      });
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('承認しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // CEO 用：解決方法の切替（KPI ↔ マイルストーン）
  async changeSolutionType(id) {
    const p = this.state.projects.find(x => x.id === id);
    if (!p) return;
    const newType = p.solution_type === 'kpi' ? 'milestone' : 'kpi';
    const currentLabel = p.solution_type === 'kpi' ? 'KPI（数値で管理）' : 'マイルストーン（チェックポイント）';
    const newLabel = newType === 'kpi' ? 'KPI（数値で管理）' : 'マイルストーン（チェックポイント）';

    this.showModal(`🔄 解決方法を切替: ${p.title}`, `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:10px;margin-bottom:14px;">
        <div style="font-weight:600;font-size:13px;color:#92400e;margin-bottom:6px;">⚠️ 注意</div>
        <div style="font-size:12px;color:#78350f;line-height:1.7;">
          ・既存の <strong>${p.solution_type === 'kpi' ? 'KPI' : 'マイルストーン'}</strong> は履歴に保存されます<br>
          ・プロジェクトは「設計待ち」に戻り、担当者が新しい形式で再設計します<br>
          ・担当者に切替通知が届きます
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin-bottom:14px;">
        <div style="background:var(--gray-100);padding:14px;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:var(--gray-500);">現在</div>
          <div style="font-weight:700;font-size:13px;margin-top:4px;">${p.solution_type === 'kpi' ? '📊 KPI' : '🎯 マイルストーン'}</div>
        </div>
        <div style="font-size:24px;color:var(--primary);">→</div>
        <div style="background:var(--primary-light);padding:14px;border-radius:10px;text-align:center;border:2px solid var(--primary);">
          <div style="font-size:11px;color:var(--primary);">変更後</div>
          <div style="font-weight:700;font-size:13px;margin-top:4px;color:var(--primary-dark);">${newType === 'kpi' ? '📊 KPI' : '🎯 マイルストーン'}</div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">担当者への切替理由（任意・コメント欄に追記）</label>
        <textarea id="switch_reason" class="form-textarea" rows="3" placeholder="例: 数値追跡が難しいので、フェーズ管理に切り替えます。"></textarea>
      </div>
    `, async () => {
      const reason = document.getElementById('switch_reason').value.trim();
      try {
        const now = new Date().toISOString();
        // 既存をアーカイブ
        if (p.solution_type === 'kpi') {
          const kpis = await db.getKPIs(id);
          for (const k of kpis) {
            if (!k.archived) {
              await db.updateKPI(k.id, {
                archived: true, archived_at: now,
                completion_note: '【解決方法変更により履歴化】KPI → マイルストーン'
              }).catch(() => {});
            }
          }
        } else {
          const milestones = await db.getMilestones(id);
          for (const m of milestones) {
            if (!m.archived) {
              await db.updateMilestone(m.id, {
                archived: true, archived_at: now,
                completion_note: '【解決方法変更により履歴化】マイルストーン → KPI'
              }).catch(() => {});
            }
          }
        }

        const switchComment = `🔄 解決方法を「${newLabel}」に変更しました。${newLabel}で再設計してください。${reason ? '\n\n【理由】\n' + reason : ''}`;
        await db.updateProject(id, {
          solution_type: newType,
          status: 'pending_design',
          rejection_comment: switchComment,
          rejected_at: now
        });

        await db.createNotification({
          recipient_id: p.assigned_to,
          type: 'new_project',
          title: '🔄 解決方法が変更されました',
          message: `${p.title} - ${newLabel} で再設計してください`,
          project_id: id
        }).catch(() => {});

        await this.loadAllData();
        this.renderCurrentPage();
        this.toast(`解決方法を ${newLabel} に変更しました`);
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    }, false, { submitLabel: '🔄 切り替える', submitClass: 'btn-warning' });
  },

  // CEO 用：進行中の設計にコメント追加・編集
  async editProjectComment(id) {
    const p = this.state.projects.find(x => x.id === id);
    if (!p) return;
    const assignee = this.state.staff.find(s => s.id === p.assigned_to);

    this.showModal(`💬 コメント編集: ${p.title}`, `
      <div style="background:#dbeafe;border-left:4px solid var(--primary);padding:12px 14px;border-radius:8px;margin-bottom:14px;">
        <div style="font-weight:600;font-size:13px;color:#1e40af;margin-bottom:4px;">📌 担当者（${assignee?.name || '?'}）にも表示されます</div>
        <div style="font-size:12px;color:#1e40af;">設計画面・プロジェクト詳細・設計モーダル内に表示されます。空欄で保存するとコメントが消えます。</div>
      </div>
      <div class="form-group">
        <label class="form-label">CEO コメント</label>
        <textarea id="edit_comment" class="form-textarea" rows="6" placeholder="例: Lv.2 中位KPI の粒度が大きすぎます。新規顧客と既存顧客を分けて再定義してください。">${p.rejection_comment || ''}</textarea>
      </div>
    `, async () => {
      const comment = document.getElementById('edit_comment').value.trim();
      try {
        await db.updateProject(id, {
          rejection_comment: comment || null,
          rejected_at: comment ? new Date().toISOString() : null
        });
        if (comment && comment !== (p.rejection_comment || '')) {
          await db.createNotification({
            recipient_id: p.assigned_to,
            type: 'new_project',
            title: '💬 CEO からコメントが届きました',
            message: p.title + ' - ' + comment.substring(0, 60),
            project_id: id
          }).catch(() => {});
        }
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast(comment ? 'コメントを保存しました' : 'コメントを削除しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    }, false, { submitLabel: '💾 保存', submitClass: 'btn-primary' });
  },

  async rejectProject(id) {
    const p = this.state.projects.find(x => x.id === id);
    if (!p) return;
    this.showModal(`差し戻し: ${p.title}`, `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 14px;border-radius:8px;margin-bottom:14px;">
        <div style="font-weight:600;font-size:13px;color:#92400e;margin-bottom:4px;">⚠️ 担当者へ具体的な修正点を伝えてください</div>
        <div style="font-size:12px;color:#92400e;">差し戻しコメントは担当者の再設計画面に表示されます。</div>
      </div>
      <div class="form-group">
        <label class="form-label">差し戻しコメント *</label>
        <textarea id="reject_comment" class="form-textarea" rows="6" placeholder="例: Lv.2 中位KPI の粒度が大きすぎます。新規顧客と既存顧客を分けて、それぞれ独立した指標として再定義してください。"></textarea>
      </div>
      <p class="text-muted" style="font-size:11px;margin-top:8px;">※ 既存の KPI/マイルストーンは履歴に保存され、設計画面はクリアされます。</p>
    `, async () => {
      const comment = document.getElementById('reject_comment').value.trim();
      if (!comment || comment.length < 5) {
        this.toast('差し戻しコメントは5文字以上で入力してください', 'error');
        return false;
      }
      try {
        // 既存の KPI/Milestone をアーカイブ（履歴保存）
        const now = new Date().toISOString();
        const existingKpis = await db.getKPIs(id);
        let kpiArchiveCount = 0;
        for (const k of existingKpis) {
          if (!k.archived) {
            try {
              await db.updateKPI(k.id, {
                archived: true,
                archived_at: now,
                completion_note: '【差し戻しによる履歴化】' + comment.substring(0, 100)
              });
              kpiArchiveCount++;
            } catch (archErr) {
              console.error('[Reject] KPIアーカイブ失敗:', k.id, archErr);
              throw new Error('KPIアーカイブ失敗: ' + archErr.message);
            }
          }
        }
        const existingMs = await db.getMilestones(id);
        let msArchiveCount = 0;
        for (const m of existingMs) {
          if (!m.archived) {
            try {
              await db.updateMilestone(m.id, {
                archived: true,
                archived_at: now,
                completion_note: '【差し戻しによる履歴化】' + comment.substring(0, 100)
              });
              msArchiveCount++;
            } catch (archErr) {
              console.error('[Reject] マイルストーンアーカイブ失敗:', m.id, archErr);
              throw new Error('マイルストーンアーカイブ失敗: ' + archErr.message);
            }
          }
        }
        console.log('[Reject] アーカイブ完了:', { kpi: kpiArchiveCount, milestone: msArchiveCount });

        await db.updateProject(id, {
          status: 'pending_design',
          rejection_comment: comment,
          rejected_at: now,
          submitted_at: null
        });
        await db.createNotification({
          recipient_id: p.assigned_to,
          type: 'new_project',
          title: '⚠️ 課題が差し戻されました',
          message: p.title + ' - ' + comment.substring(0, 60),
          project_id: id
        });
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast('差し戻しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    }, false, { submitLabel: '↩ 差し戻す', submitClass: 'btn-danger' });
  },

  // ===== Daily Logs =====
  async renderLogs() {
    this.setupLogsTabs();
    // CEO は初期表示を「履歴」に
    if (auth.isCEO()) {
      const histTab = document.querySelector('.logs-tab[data-tab="history"]');
      const visibleActive = Array.from(document.querySelectorAll('.logs-tab.active'))
        .find(t => t.style.display !== 'none');
      if (!visibleActive && histTab) {
        document.querySelectorAll('.logs-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.logs-tab-pane').forEach(p => p.classList.remove('active'));
        histTab.classList.add('active');
        document.getElementById('logsTabHistory').classList.add('active');
      }
    }
    const active = document.querySelector('.logs-tab.active');
    const tabName = active?.dataset.tab || (auth.isCEO() ? 'history' : 'report');
    await this.dispatchLogsTab(tabName);
  },

  // ===== カレンダータブ =====
  async renderCalendarTab() {
    const pane = document.getElementById('logsTabCalendar');
    if (!this.state.calDate) {
      const t = new Date();
      this.state.calDate = { year: t.getFullYear(), month: t.getMonth() };
    }
    const { year, month } = this.state.calDate;
    const staffId = auth.currentUser.id;

    // 月初〜月末
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const dateFrom = monthStart.toISOString().slice(0, 10);
    const dateTo = monthEnd.toISOString().slice(0, 10);

    let slots = [], stickies = [];
    try {
      slots = await db.request('GET', `/timeline_slots?staff_id=eq.${staffId}&schedule_date=gte.${dateFrom}&schedule_date=lte.${dateTo}&order=schedule_date.asc,start_minutes.asc`);
      stickies = await db.getStickies(staffId);
    } catch (e) {
      pane.innerHTML = `<div style="color:var(--danger);padding:20px;">読み込みエラー: ${e.message}</div>`;
      return;
    }
    const stickyMap = {};
    stickies.forEach(s => stickyMap[s.id] = s);

    // 日付ごとに集計
    const slotsByDate = {};
    slots.forEach(s => {
      if (!slotsByDate[s.schedule_date]) slotsByDate[s.schedule_date] = [];
      slotsByDate[s.schedule_date].push(s);
    });

    const monthName = `${year}年${month + 1}月`;
    const firstDayOfWeek = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const today = new Date().toISOString().slice(0, 10);

    let cellsHtml = '';
    // 前月の空白
    for (let i = 0; i < firstDayOfWeek; i++) {
      cellsHtml += '<div class="cal-cell cal-empty"></div>';
    }
    // 月日
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySlots = slotsByDate[dateStr] || [];
      const isToday = dateStr === today;
      const totalMin = daySlots.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const isSelected = this.state.calSelectedDate === dateStr;

      cellsHtml += `<div class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${daySlots.length > 0 ? 'has-slots' : ''}" onclick="App.selectCalDate('${dateStr}')">
        <div class="cal-day-num">${d}</div>
        ${daySlots.length > 0 ? `
          <div class="cal-day-count">${daySlots.length}件</div>
          <div class="cal-day-min">${Math.floor(totalMin / 60)}h${totalMin % 60}m</div>
        ` : ''}
      </div>`;
    }

    let detailHtml = '';
    if (this.state.calSelectedDate) {
      const daySlots = slotsByDate[this.state.calSelectedDate] || [];
      detailHtml = `<div class="card" style="margin-top:14px;">
        <div class="card-header">
          <div class="card-title">📅 ${this.state.calSelectedDate} の予定（${daySlots.length}件）</div>
          <button class="btn btn-sm btn-primary" onclick="App.gotoTimelineForDate('${this.state.calSelectedDate}')">📌 タイムラインを編集</button>
        </div>
        ${daySlots.length === 0 ? '<p class="text-muted" style="font-size:12px;text-align:center;padding:14px;">この日のタイムラインは未設定です</p>' :
          daySlots.map(s => {
            const sticky = stickyMap[s.sticky_id];
            const sh = String(Math.floor(s.start_minutes / 60)).padStart(2, '0');
            const sm = String(s.start_minutes % 60).padStart(2, '0');
            const endMin = s.start_minutes + s.duration_minutes;
            const eh = String(Math.floor(endMin / 60)).padStart(2, '0');
            const em = String(endMin % 60).padStart(2, '0');
            const prio = sticky?.priority || 'medium';
            return `<div style="padding:8px 12px;background:var(--gray-50);border-left:4px solid ${prio === 'high' ? '#ef4444' : prio === 'low' ? '#3b82f6' : '#f59e0b'};border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:600;font-size:13px;">${sticky?.title || '(削除済み付箋)'}</div>
                <div style="font-size:11px;color:var(--gray-500);">${sh}:${sm} - ${eh}:${em} （${s.duration_minutes}分）</div>
              </div>
            </div>`;
          }).join('')
        }
      </div>`;
    }

    pane.innerHTML = `
      <div class="tl-toolbar">
        <button class="btn btn-sm btn-secondary" onclick="App.shiftCalMonth(-1)">← 前月</button>
        <strong style="font-size:14px;min-width:120px;text-align:center;">${monthName}</strong>
        <button class="btn btn-sm btn-secondary" onclick="App.shiftCalMonth(1)">次月 →</button>
        <button class="btn btn-sm btn-secondary" onclick="App.gotoCalToday()">今日</button>
        <span style="flex:1;"></span>
        <span class="text-muted" style="font-size:11px;">合計: ${slots.length}件 / ${Math.floor(slots.reduce((s, x) => s + (x.duration_minutes || 0), 0) / 60)}時間</span>
      </div>
      <div class="cal-grid">
        <div class="cal-weekday sun">日</div>
        <div class="cal-weekday">月</div>
        <div class="cal-weekday">火</div>
        <div class="cal-weekday">水</div>
        <div class="cal-weekday">木</div>
        <div class="cal-weekday">金</div>
        <div class="cal-weekday sat">土</div>
        ${cellsHtml}
      </div>
      ${detailHtml}
    `;
  },

  selectCalDate(dateStr) {
    this.state.calSelectedDate = dateStr;
    this.renderCalendarTab();
  },

  shiftCalMonth(delta) {
    const c = this.state.calDate;
    let y = c.year, m = c.month + delta;
    if (m < 0) { y--; m = 11; }
    else if (m > 11) { y++; m = 0; }
    this.state.calDate = { year: y, month: m };
    this.renderCalendarTab();
  },

  gotoCalToday() {
    const t = new Date();
    this.state.calDate = { year: t.getFullYear(), month: t.getMonth() };
    this.state.calSelectedDate = t.toISOString().slice(0, 10);
    this.renderCalendarTab();
  },

  gotoTimelineForDate(dateStr) {
    this.state.tlDate = dateStr;
    // タイムラインタブに切替
    document.querySelectorAll('.logs-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.logs-tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.logs-tab[data-tab="timeline"]')?.classList.add('active');
    document.getElementById('logsTabTimeline')?.classList.add('active');
    this.renderTimelineTab();
  },

  setupLogsTabs() {
    if (this._logsTabsSetup) return;
    this._logsTabsSetup = true;
    document.querySelectorAll('.logs-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.logs-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.logs-tab-pane').forEach(p => p.classList.remove('active'));
        const tabName = tab.dataset.tab;
        const paneId = 'logsTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
        document.getElementById(paneId)?.classList.add('active');
        this.dispatchLogsTab(tabName);
      });
    });
  },

  async dispatchLogsTab(tabName) {
    if (tabName === 'timeline') await this.renderTimelineTab();
    else if (tabName === 'report') await this.renderDailyReportTab();
    else if (tabName === 'calendar') await this.renderCalendarTab();
    else if (tabName === 'archive') await this.renderStickyArchiveTab();
    else if (tabName === 'history' && auth.isCEO()) await this.renderCEOLogsHistory();
    else if (tabName === 'staffview' && auth.isCEO()) await this.renderCEOStaffTimeline();
  },

  // ===== CEO 専用：スタッフのタイムライン閲覧 =====
  async renderCEOStaffTimeline() {
    const pane = document.getElementById('logsTabStaffview');
    if (!this.state.svDate) {
      this.state.svDate = new Date().toISOString().slice(0, 10);
    }
    if (!this.state.svStaffId) {
      const firstStaff = this.state.staff.find(s => s.is_active && s.role !== 'ceo');
      this.state.svStaffId = firstStaff?.id || '';
    }
    if (!this.state.svStaffId) {
      pane.innerHTML = this.emptyState('👥', 'スタッフが登録されていません', 'スタッフ管理から追加してください');
      return;
    }

    const staffOptions = this.state.staff
      .filter(s => s.is_active && s.role !== 'ceo')
      .map(s => `<option value="${s.id}" ${s.id === this.state.svStaffId ? 'selected' : ''}>${s.name} (${this.roleLabel(s.role)})</option>`)
      .join('');

    const targetStaff = this.state.staff.find(s => s.id === this.state.svStaffId);
    const date = this.state.svDate;

    pane.innerHTML = `
      <div class="tl-toolbar">
        <label>👤 スタッフ:</label>
        <select id="svStaff" class="form-select" style="max-width:220px;">
          ${staffOptions}
        </select>
        <label>📅 対象日:</label>
        <input type="date" id="svDate" class="form-input" value="${date}" style="max-width:160px;">
        <button class="btn btn-sm btn-secondary" onclick="App.svShiftDay(-1)">← 前日</button>
        <button class="btn btn-sm btn-secondary" onclick="App.svShiftDay(0)">今日</button>
        <button class="btn btn-sm btn-secondary" onclick="App.svShiftDay(1)">翌日 →</button>
        <span style="flex:1;"></span>
        <span class="text-muted" style="font-size:11px;">${targetStaff?.name || ''} の ${date}</span>
      </div>
      <div id="svContent"><div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div></div>
    `;

    document.getElementById('svStaff').addEventListener('change', e => {
      this.state.svStaffId = e.target.value;
      this.renderCEOStaffTimeline();
    });
    document.getElementById('svDate').addEventListener('change', e => {
      this.state.svDate = e.target.value;
      this.renderCEOStaffTimeline();
    });

    await this.renderStaffTimelineContent();
  },

  svShiftDay(delta) {
    if (delta === 0) {
      this.state.svDate = new Date().toISOString().slice(0, 10);
    } else {
      const d = new Date(this.state.svDate);
      d.setDate(d.getDate() + delta);
      this.state.svDate = d.toISOString().slice(0, 10);
    }
    this.renderCEOStaffTimeline();
  },

  async renderStaffTimelineContent() {
    const content = document.getElementById('svContent');
    if (!content) return;

    const staffId = this.state.svStaffId;
    const date = this.state.svDate;
    let slots = [], stickies = [];
    try {
      slots = await db.getTimelineSlots(staffId, date);
      // スタッフ全付箋（タイトル参照用）
      stickies = await db.getStickies(staffId);
    } catch (e) {
      content.innerHTML = `<div style="color:var(--danger);padding:20px;">読み込みエラー: ${e.message}</div>`;
      return;
    }

    const stickyMap = {};
    stickies.forEach(s => stickyMap[s.id] = s);

    if (slots.length === 0) {
      content.innerHTML = `<div class="card"><p class="text-muted" style="text-align:center;padding:30px;">この日のタイムラインは未設定です</p></div>`;
      return;
    }

    // AM8:00〜翌AM8:00（24時間グリッド・読み取り専用）
    const SV_START = 8 * 60;
    let rowsHtml = '';
    for (let i = 0; i < 96; i++) {
      const minutes = SV_START + i * 15;
      const dispMin = minutes % (24 * 60);
      const hh = String(Math.floor(dispMin / 60)).padStart(2, '0');
      const mm = String(dispMin % 60).padStart(2, '0');
      const isHour = mm === '00';
      const isHalf = mm === '30';
      const isMidnight = minutes >= 24 * 60 && dispMin === 0;
      const label = isHour ? (minutes >= 24 * 60 ? `翌${hh}:00` : `${hh}:00`) : '';
      rowsHtml += `<div class="tl-row ${isHour ? 'hour-marker' : isHalf ? 'half-marker' : ''} ${isMidnight ? 'midnight-marker' : ''}" data-min="${minutes}">
        <div class="tl-row-label">${label}</div>
        <div class="tl-row-slot" data-min="${minutes}"></div>
      </div>`;
    }

    // 統計
    const totalMin = slots.reduce((s, x) => s + (x.duration_minutes || 0), 0);

    content.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <span class="badge badge-info">📌 配置 ${slots.length}件</span>
        <span class="badge badge-gray">⏱ 合計 ${Math.floor(totalMin/60)}時間${totalMin%60}分</span>
      </div>
      <div class="tl-layout">
        <div class="tl-timeline" id="svTimeline">${rowsHtml}</div>
      </div>
    `;

    // 配置済みを描画（読み取り専用、× ボタンなし）
    const tl = document.getElementById('svTimeline');
    const rowH = 24;
    for (const slot of slots) {
      const sticky = stickyMap[slot.sticky_id];
      if (!sticky) continue;
      const startRow = tl.querySelector(`.tl-row[data-min="${slot.start_minutes}"]`);
      if (!startRow) continue;
      const slotEl = startRow.querySelector('.tl-row-slot');
      if (!slotEl) continue;
      const heightPx = Math.max(24, (slot.duration_minutes / 15) * rowH);
      const sh = String(Math.floor(slot.start_minutes / 60)).padStart(2, '0');
      const sm = String(slot.start_minutes % 60).padStart(2, '0');
      const endMin = slot.start_minutes + slot.duration_minutes;
      const eh = String(Math.floor(endMin / 60)).padStart(2, '0');
      const em = String(endMin % 60).padStart(2, '0');
      const timeLabel = `${sh}:${sm}-${eh}:${em}`;
      const isCompact = slot.duration_minutes <= 30;

      const div = document.createElement('div');
      div.className = `tl-placed priority-${sticky.priority || 'medium'} ${isCompact ? 'compact' : ''}`;
      div.style.height = heightPx + 'px';
      div.title = `${sticky.title}（${timeLabel} / ${slot.duration_minutes}分）`;
      if (isCompact) {
        div.innerHTML = `<span class="tl-placed-title">${sticky.title}</span><span class="tl-placed-time-inline">${timeLabel}</span>`;
      } else {
        div.innerHTML = `<div class="tl-placed-title">${sticky.title}</div><div class="tl-placed-time">${timeLabel}（${slot.duration_minutes}分）</div>`;
      }
      slotEl.appendChild(div);
    }
  },

  // ===== Timeline タブ =====
  async renderTimelineTab() {
    const pane = document.getElementById('logsTabTimeline');
    if (!this.state.tlDate) {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      this.state.tlDate = t.toISOString().slice(0, 10);
    }
    const staffId = auth.currentUser.id;
    let stickies = [];
    let slots = [];
    try {
      stickies = await db.getStickies(staffId, 'active');
      slots = await db.getTimelineSlots(staffId, this.state.tlDate);
    } catch (e) {
      pane.innerHTML = `<div class="card" style="border-color:var(--danger);"><div style="color:var(--danger);font-size:13px;">付箋テーブル未作成です。Supabase で SQL を実行してください。<br><code style="font-size:11px;">${e.message}</code></div></div>`;
      return;
    }

    const placedIds = new Set(slots.map(s => s.sticky_id));
    // ルーティン付箋は配置済みでも「未配置」扱い（何度でも配置可能）
    const isRecurring = (s) => s.recurrence_type && s.recurrence_type !== 'once';
    const unplaced = stickies.filter(s => isRecurring(s) || !placedIds.has(s.id));

    // 付箋ボード（数に応じてサイズ調整）
    const manyClass = stickies.length > 12 ? 'many' : '';

    // AM8:00〜翌AM8:00（15分単位 × 96コマ）
    const TL_START = 8 * 60;
    let rowsHtml = '';
    for (let i = 0; i < 96; i++) {
      const minutes = TL_START + i * 15;
      const dispMin = minutes % (24 * 60);
      const hh = String(Math.floor(dispMin / 60)).padStart(2, '0');
      const mm = String(dispMin % 60).padStart(2, '0');
      const isHour = mm === '00';
      const isHalf = mm === '30';
      const isMidnight = minutes >= 24 * 60 && dispMin === 0;
      const label = isHour ? (minutes >= 24 * 60 ? `翌${hh}:00` : `${hh}:00`) : '';
      rowsHtml += `<div class="tl-row ${isHour ? 'hour-marker' : isHalf ? 'half-marker' : ''} ${isMidnight ? 'midnight-marker' : ''}" data-min="${minutes}">
        <div class="tl-row-label">${label}</div>
        <div class="tl-row-slot" data-min="${minutes}"></div>
      </div>`;
    }

    // 付箋を「単発」「ルーティン」で分類
    const onceStickies = stickies.filter(s => !s.recurrence_type || s.recurrence_type === 'once');
    const recurStickies = stickies.filter(s => s.recurrence_type && s.recurrence_type !== 'once');

    // 現在の付箋ボードタブ
    if (!this.state.stickyTab) this.state.stickyTab = 'once';
    const activeBoard = this.state.stickyTab;
    const showStickies = activeBoard === 'once' ? onceStickies : recurStickies;
    const showManyClass = showStickies.length > 12 ? 'many' : '';

    pane.innerHTML = `
      <div class="tl-toolbar">
        <label>📅 対象日:</label>
        <input type="date" id="tlDate" class="form-input" value="${this.state.tlDate}" style="max-width:180px;">
        <button class="btn btn-sm btn-secondary" onclick="App.setTlDate(1)">明日</button>
        <button class="btn btn-sm btn-secondary" onclick="App.setTlDate(2)">明後日</button>
        <span style="flex:1;"></span>
        <span class="text-muted" style="font-size:11px;">配置: ${slots.length}件 / 未配置: ${unplaced.length}件</span>
        <button class="btn btn-sm btn-success" onclick="App.saveTimelineToCal()">💾 保存（カレンダー反映）</button>
        <button class="btn btn-sm btn-danger" onclick="App.clearTimeline()">🗑 配置クリア</button>
      </div>

      <div class="tl-layout">
        <div class="tl-timeline" id="tlTimeline">${rowsHtml}</div>
        <div class="tl-board">
          <div class="tl-board-header">
            <div class="tl-board-title">📌 付箋</div>
            <button class="btn btn-sm btn-primary" onclick="App.openStickyModal()">+ 付箋作成</button>
          </div>
          <div class="sticky-board-tabs">
            <button class="sticky-board-tab ${activeBoard === 'once' ? 'active' : ''}" onclick="App.setStickyBoardTab('once')">📝 単発（${onceStickies.length}）</button>
            <button class="sticky-board-tab ${activeBoard === 'recurring' ? 'active' : ''}" onclick="App.setStickyBoardTab('recurring')">🔁 ルーティン（${recurStickies.length}）</button>
          </div>
          <div class="tl-board-stickies ${showManyClass} ${showStickies.length === 0 ? 'empty' : ''}" id="tlBoard">
            ${showStickies.length === 0 ?
              (activeBoard === 'once' ? '単発付箋がありません。「+ 付箋作成」で追加' : 'ルーティン付箋がありません。「+ 付箋作成」→「🔁 ルーティン」で追加')
              : showStickies.map(s => this.stickyCardHtml(s, isRecurring(s) ? false : placedIds.has(s.id))).join('')}
          </div>
        </div>
      </div>
    `;

    // 配置済み付箋を絶対配置で描画
    for (const slot of slots) {
      const sticky = stickies.find(s => s.id === slot.sticky_id);
      if (!sticky) continue;
      this.placeStickyOnTimeline(sticky, slot);
    }

    this.state.tlSlots = slots; // drop 時の重複チェック用キャッシュ
    this.setupTimelineDnD();
    document.getElementById('tlDate').addEventListener('change', (e) => {
      this.state.tlDate = e.target.value;
      this.renderTimelineTab();
    });

    // Google カレンダー予定を灰色ブロックで重ね描き（非同期・後乗せ）
    const renderDate = this.state.tlDate;
    this.fetchGcalIcs().then(ics => {
      if (!ics || this.state.tlDate !== renderDate) return;
      const events = this.parseGcalEventsForDate(ics, renderDate);
      this.renderGcalBlocks(events);
      // 終日イベントはツールバー下にラベル表示
      const allDay = events.filter(e => e.allDay);
      if (allDay.length > 0) {
        const tl = document.getElementById('tlTimeline');
        if (tl) {
          const bar = document.createElement('div');
          bar.className = 'tl-gcal-allday';
          bar.innerHTML = '📅 終日: ' + allDay.map(e => e.title).join(' / ');
          tl.prepend(bar);
        }
      }
    }).catch(() => {});
  },

  setTlDate(daysFromToday) {
    const t = new Date();
    t.setDate(t.getDate() + daysFromToday);
    this.state.tlDate = t.toISOString().slice(0, 10);
    this.renderTimelineTab();
  },

  // 付箋カラーパレット（10色・CSS の color-* クラスと対応）
  STICKY_COLORS: [
    { key: 'amber',  label: 'アンバー', bg1: '#fef3c7', bg2: '#fde68a', border: '#f59e0b' },
    { key: 'red',    label: 'レッド',   bg1: '#fee2e2', bg2: '#fecaca', border: '#ef4444' },
    { key: 'orange', label: 'オレンジ', bg1: '#ffedd5', bg2: '#fed7aa', border: '#f97316' },
    { key: 'lime',   label: 'ライム',   bg1: '#ecfccb', bg2: '#d9f99d', border: '#84cc16' },
    { key: 'green',  label: 'グリーン', bg1: '#dcfce7', bg2: '#bbf7d0', border: '#22c55e' },
    { key: 'teal',   label: 'ティール', bg1: '#ccfbf1', bg2: '#99f6e4', border: '#14b8a6' },
    { key: 'blue',   label: 'ブルー',   bg1: '#dbeafe', bg2: '#bfdbfe', border: '#3b82f6' },
    { key: 'indigo', label: 'インディゴ', bg1: '#e0e7ff', bg2: '#c7d2fe', border: '#6366f1' },
    { key: 'purple', label: 'パープル', bg1: '#f3e8ff', bg2: '#e9d5ff', border: '#a855f7' },
    { key: 'pink',   label: 'ピンク',   bg1: '#fce7f3', bg2: '#fbcfe8', border: '#ec4899' }
  ],

  selectStickyColor(key) {
    const input = document.getElementById('st_color');
    if (input) input.value = key;
    document.querySelectorAll('.st-color-swatch').forEach(el => {
      const c = this.STICKY_COLORS.find(x => x.key === el.dataset.color);
      const on = el.dataset.color === key;
      el.classList.toggle('selected', on);
      el.style.border = `2px solid ${on ? (c?.border || '#000') : 'transparent'}`;
    });
  },

  stickyCardHtml(s, isPlaced) {
    const prio = s.priority || 'medium';
    const color = s.color || 'amber';
    const recur = s.recurrence_type && s.recurrence_type !== 'once' ? s.recurrence_type : null;
    const recurIcon = { daily: '📅 毎日', weekly: '📆 毎週', monthly: '🗓 毎月' }[recur] || '';
    const prioIcon = prio === 'high' ? '⚡' : prio === 'low' ? '●' : '✨';
    const isRecur = !!recur;
    return `<div class="sticky-card color-${color} priority-${prio} ${isPlaced ? 'placed' : ''} ${isRecur ? 'recurring' : ''}" draggable="${!isPlaced}" data-sticky-id="${s.id}" data-min="${s.estimated_minutes}" onclick="App.openStickyModal('${s.id}')" title="クリックで編集">
      <button class="sticky-card-remove" onclick="event.stopPropagation();App.deleteSticky('${s.id}')" title="削除">×</button>
      <div class="sticky-card-title">${s.title}</div>
      <div class="sticky-card-meta">
        <span>⏱ ${s.estimated_minutes}分</span>
        <span title="${prio === 'high' ? '高速点滅' : prio === 'low' ? '点灯' : '点滅'}">${prioIcon}</span>
        ${recurIcon ? `<span style="font-size:9px;">${recurIcon}</span>` : ''}
        ${s.comments && s.comments.length > 0 ? `<span style="font-size:9px;background:#e0e7ff;color:#4338ca;padding:1px 5px;border-radius:3px;">💬 ${s.comments.length}</span>` : ''}
      </div>
    </div>`;
  },

  setStickyBoardTab(tab) {
    this.state.stickyTab = tab;
    this.renderTimelineTab();
  },

  placeStickyOnTimeline(sticky, slot) {
    const tl = document.getElementById('tlTimeline');
    if (!tl) return;
    const startRow = tl.querySelector(`.tl-row[data-min="${slot.start_minutes}"]`);
    if (!startRow) return;
    const rowH = 24; // px per 15分（1h = 4コマ = 96px）
    const heightPx = Math.max(24, (slot.duration_minutes / 15) * rowH);
    const slotEl = startRow.querySelector('.tl-row-slot');
    if (!slotEl) return;

    const sh = String(Math.floor(slot.start_minutes / 60)).padStart(2, '0');
    const sm = String(slot.start_minutes % 60).padStart(2, '0');
    const endMin = slot.start_minutes + slot.duration_minutes;
    const eh = String(Math.floor(endMin / 60)).padStart(2, '0');
    const em = String(endMin % 60).padStart(2, '0');
    const timeLabel = `${sh}:${sm}-${eh}:${em}`;

    // 30分以下は1行コンパクト表示、それ以上は2行表示
    const isCompact = slot.duration_minutes <= 30;

    const div = document.createElement('div');
    div.className = `tl-placed color-${sticky.color || 'amber'} priority-${sticky.priority || 'medium'} ${isCompact ? 'compact' : ''}`;
    div.style.height = heightPx + 'px';
    div.dataset.slotId = slot.id;
    div.dataset.stickyId = sticky.id;
    div.title = `${sticky.title}（${timeLabel} / ${slot.duration_minutes}分）`;
    if (isCompact) {
      div.innerHTML = `
        <button class="tl-placed-remove" onclick="event.stopPropagation();App.removePlacedSlot('${slot.id}')">×</button>
        <span class="tl-placed-title">${sticky.title}</span>
        <span class="tl-placed-time-inline">${timeLabel}</span>
      `;
    } else {
      div.innerHTML = `
        <button class="tl-placed-remove" onclick="event.stopPropagation();App.removePlacedSlot('${slot.id}')">×</button>
        <div class="tl-placed-title">${sticky.title}</div>
        <div class="tl-placed-time">${timeLabel}（${slot.duration_minutes}分）</div>
      `;
    }
    slotEl.appendChild(div);
  },

  setupTimelineDnD() {
    document.querySelectorAll('.sticky-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/sticky-id', card.dataset.stickyId);
        e.dataTransfer.setData('text/min', card.dataset.min);
        e.dataTransfer.effectAllowed = 'move';
      });
    });
    document.querySelectorAll('.tl-row-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drag-over');
      });
      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });
      slot.addEventListener('drop', async (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        const stickyId = e.dataTransfer.getData('text/sticky-id');
        const dur = parseInt(e.dataTransfer.getData('text/min'));
        const startMin = parseInt(slot.dataset.min);
        if (!stickyId || isNaN(dur) || isNaN(startMin)) return;

        // 重複チェック
        const endMin = startMin + dur;
        const existing = (this.state.tlSlots || []).find(s => {
          const sEnd = s.start_minutes + s.duration_minutes;
          return startMin < sEnd && s.start_minutes < endMin;
        });
        if (existing) {
          const sh = String(Math.floor(existing.start_minutes / 60)).padStart(2, '0');
          const sm = String(existing.start_minutes % 60).padStart(2, '0');
          const eh = String(Math.floor((existing.start_minutes + existing.duration_minutes) / 60)).padStart(2, '0');
          const em = String((existing.start_minutes + existing.duration_minutes) % 60).padStart(2, '0');
          this.toast(`⚠️ ${sh}:${sm}〜${eh}:${em} の付箋と重なります`, 'error');
          return;
        }

        try {
          await db.createTimelineSlot({
            sticky_id: stickyId,
            staff_id: auth.currentUser.id,
            schedule_date: this.state.tlDate,
            start_minutes: startMin,
            duration_minutes: dur,
            status: 'planned'
          });
          this.renderTimelineTab();
        } catch (err) {
          this.toast('配置エラー: ' + err.message, 'error');
        }
      });
    });
  },

  async removePlacedSlot(slotId) {
    try {
      await db.deleteTimelineSlot(slotId);
      this.renderTimelineTab();
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  async clearTimeline() {
    if (!confirm(`${this.state.tlDate} の配置をすべてクリアしますか？\n（付箋は残ります）`)) return;
    try {
      await db.deleteTimelineSlotsByDate(auth.currentUser.id, this.state.tlDate);
      this.renderTimelineTab();
      this.toast('配置をクリアしました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  async saveTimelineToCal() {
    // すでにドラッグ時に DB 保存済み。確認 + カレンダーへの誘導用
    const date = this.state.tlDate;
    let count = 0;
    try {
      const slots = await db.getTimelineSlots(auth.currentUser.id, date);
      count = slots.length;
    } catch {}
    this.toast(`✅ ${date} のタイムライン（${count}件）をカレンダーに保存しました`);
  },

  // 付箋作成/編集モーダル
  async openStickyModal(id = null) {
    let existing = null;
    if (id) {
      try {
        const result = await db.request('GET', `/stickies?id=eq.${id}&limit=1`);
        existing = Array.isArray(result) ? result[0] : result;
      } catch (e) {
        this.toast('付箋取得エラー: ' + e.message, 'error');
        return;
      }
    }

    const minutesOptions = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 360, 420, 480];
    const selectedMin = existing?.estimated_minutes ?? 30;
    const selectedPrio = existing?.priority ?? 'medium';
    const selectedColor = existing?.color || 'amber';
    const colorSwatches = this.STICKY_COLORS.map(c =>
      `<button type="button" class="st-color-swatch ${c.key === selectedColor ? 'selected' : ''}" data-color="${c.key}" title="${c.label}"
        onclick="App.selectStickyColor('${c.key}')"
        style="width:30px;height:30px;border-radius:8px;cursor:pointer;background:linear-gradient(135deg,${c.bg1},${c.bg2});border:2px solid ${c.key === selectedColor ? c.border : 'transparent'};outline:1px solid var(--border);"></button>`
    ).join('');
    const initialType = existing?.recurrence_type && existing.recurrence_type !== 'once' ? 'recurring' : 'once';
    const recurType = existing?.recurrence_type && existing.recurrence_type !== 'once' ? existing.recurrence_type : 'daily';
    const recurDays = Array.isArray(existing?.recurrence_days) ? existing.recurrence_days : [];

    // 曜日チェックボックス（週次用）
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayHtml = weekdays.map((w, i) =>
      `<label style="display:flex;align-items:center;gap:4px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;">
        <input type="checkbox" class="rec_wday" value="${i}" ${recurDays.includes(i) ? 'checked' : ''}>${w}
      </label>`
    ).join('');

    this.showModal(id ? '✏️ 付箋を編集' : '+ 新規付箋', `
      <div class="sticky-type-tabs">
        <button type="button" class="sticky-type-tab ${initialType === 'once' ? 'active' : ''}" data-type="once" onclick="App.switchStickyType('once')">📝 単発タスク</button>
        <button type="button" class="sticky-type-tab ${initialType === 'recurring' ? 'active' : ''}" data-type="recurring" onclick="App.switchStickyType('recurring')">🔁 ルーティン・繰り返し</button>
      </div>

      <input type="hidden" id="st_type" value="${initialType}">

      <div class="form-group">
        <label class="form-label">タイトル *</label>
        <input type="text" id="st_title" class="form-input" placeholder="例: 山野さんに連絡" value="${(existing?.title || '').replace(/"/g, '&quot;')}">
      </div>
      <div class="form-group">
        <label class="form-label">概要・メモ</label>
        <textarea id="st_desc" class="form-textarea" rows="2" placeholder="任意">${existing?.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">想定時間 *</label>
          <select id="st_minutes" class="form-select" style="display:${initialType === 'recurring' ? 'none' : 'block'};">
            ${minutesOptions.map(m => `<option value="${m}" ${m === selectedMin ? 'selected' : ''}>${m >= 60 ? (m / 60 % 1 === 0 ? `${m/60}時間` : `${Math.floor(m/60)}時間${m%60}分`) : `${m}分`}</option>`).join('')}
          </select>
          <div id="st_minutesFreeWrap" style="display:${initialType === 'recurring' ? 'flex' : 'none'};align-items:center;gap:6px;">
            <input type="number" id="st_minutesFree" class="form-input" min="1" max="1440" step="1" value="${selectedMin}" style="max-width:110px;">
            <span style="font-size:12px;color:var(--gray-600);">分（1分刻み）</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">優先度（点滅で表現）</label>
          <select id="st_priority" class="form-select">
            <option value="high" ${selectedPrio === 'high' ? 'selected' : ''}>⚡ 高（高速点滅）</option>
            <option value="medium" ${selectedPrio === 'medium' ? 'selected' : ''}>✨ 中（点滅）</option>
            <option value="low" ${selectedPrio === 'low' ? 'selected' : ''}>● 低（点灯）</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">🎨 色（カテゴリ）</label>
        <input type="hidden" id="st_color" value="${selectedColor}">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${colorSwatches}</div>
        <p style="font-size:11px;color:var(--gray-600);margin-top:6px;">色は自由にカテゴリとして使えます（例: 青=営業／緑=制作／赤=至急 など）。点滅は優先度、色は分類です。</p>
      </div>

      <div id="st_recurringSection" style="display:${initialType === 'recurring' ? 'block' : 'none'};margin-top:8px;padding:12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:8px;border:1px solid #93c5fd;">
        <label class="form-label" style="color:var(--primary-dark);">🔁 繰り返しパターン *</label>
        <select id="st_recurType" class="form-select" onchange="App.toggleRecurOptions()">
          <option value="daily" ${recurType === 'daily' ? 'selected' : ''}>📅 毎日</option>
          <option value="weekly" ${recurType === 'weekly' ? 'selected' : ''}>📆 毎週（曜日指定）</option>
          <option value="monthly" ${recurType === 'monthly' ? 'selected' : ''}>🗓 毎月（日付指定）</option>
        </select>

        <div id="st_weeklyDays" style="margin-top:10px;display:${recurType === 'weekly' ? 'block' : 'none'};">
          <div style="font-size:11px;color:var(--gray-700);margin-bottom:6px;">繰り返す曜日（複数選択可）</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">${weekdayHtml}</div>
        </div>

        <div id="st_monthlyDay" style="margin-top:10px;display:${recurType === 'monthly' ? 'block' : 'none'};">
          <div style="font-size:11px;color:var(--gray-700);margin-bottom:6px;">繰り返す日（1〜31）</div>
          <input type="number" id="st_monthDay" class="form-input" min="1" max="31" value="${recurDays[0] || 1}" style="max-width:120px;">
        </div>

        <p style="font-size:11px;color:var(--gray-600);margin-top:10px;">💡 ルーティン付箋はタイムラインに繰り返し配置可能で、何度配置しても残り続けます。</p>
      </div>

      ${id ? `<p class="text-muted" style="font-size:11px;margin-top:8px;">想定時間を変更すると、配置済みの付箋は自動で再配置されません。一度外して再配置してください。</p>` : ''}
    `, async () => {
      const title = document.getElementById('st_title').value.trim();
      if (!title) { this.toast('タイトル必須', 'error'); return false; }

      // アクティブタブから直接タイプを判定（hidden input への依存を排除）
      const type = document.querySelector('.sticky-type-tab.active')?.dataset.type
        || document.getElementById('st_type')?.value
        || 'once';

      // ルーティンは1分刻みの自由入力、単発はセレクト
      let estMinutes;
      if (type === 'recurring') {
        estMinutes = parseInt(document.getElementById('st_minutesFree')?.value);
        if (isNaN(estMinutes) || estMinutes < 1 || estMinutes > 1440) {
          this.toast('想定時間は1〜1440分で入力してください', 'error');
          return false;
        }
      } else {
        estMinutes = parseInt(document.getElementById('st_minutes').value);
      }

      const data = {
        title,
        description: document.getElementById('st_desc').value.trim(),
        estimated_minutes: estMinutes,
        priority: document.getElementById('st_priority').value,
        color: document.getElementById('st_color').value || 'amber'
      };

      if (type === 'recurring') {
        const rt = document.getElementById('st_recurType').value;
        data.recurrence_type = rt;
        if (rt === 'weekly') {
          const days = Array.from(document.querySelectorAll('.rec_wday:checked')).map(cb => parseInt(cb.value));
          if (days.length === 0) {
            this.toast('繰り返す曜日を1つ以上選択', 'error');
            return false;
          }
          data.recurrence_days = days;
        } else if (rt === 'monthly') {
          const d = parseInt(document.getElementById('st_monthDay').value);
          if (isNaN(d) || d < 1 || d > 31) {
            this.toast('日付は1〜31で指定', 'error');
            return false;
          }
          data.recurrence_days = [d];
        } else {
          data.recurrence_days = null;
        }
      } else {
        data.recurrence_type = 'once';
        data.recurrence_days = null;
      }

      try {
        if (id) {
          await db.updateSticky(id, data);
          this.toast('付箋を更新しました');
        } else {
          await db.createSticky({
            ...data,
            staff_id: auth.currentUser.id,
            status: 'active'
          });
          this.toast('付箋を作成しました');
        }
        // ルーティン付箋の場合は対応するタブに切替
        if (data.recurrence_type !== 'once') this.state.stickyTab = 'recurring';
        else this.state.stickyTab = 'once';
        this.renderTimelineTab();
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    }, false, {
      submitLabel: id ? '💾 更新' : '➕ 作成',
      submitClass: 'btn-primary'
    });
  },

  switchStickyType(type) {
    document.getElementById('st_type').value = type;
    document.querySelectorAll('.sticky-type-tab').forEach(t => t.classList.toggle('active', t.dataset.type === type));
    const section = document.getElementById('st_recurringSection');
    if (section) section.style.display = type === 'recurring' ? 'block' : 'none';

    // 想定時間入力の切替（単発=セレクト / ルーティン=1分刻み自由入力）
    const sel = document.getElementById('st_minutes');
    const freeWrap = document.getElementById('st_minutesFreeWrap');
    const free = document.getElementById('st_minutesFree');
    if (sel && freeWrap && free) {
      if (type === 'recurring') {
        free.value = sel.value || free.value || 30;
        sel.style.display = 'none';
        freeWrap.style.display = 'flex';
      } else {
        sel.style.display = 'block';
        freeWrap.style.display = 'none';
      }
    }
  },

  toggleRecurOptions() {
    const rt = document.getElementById('st_recurType').value;
    const wkly = document.getElementById('st_weeklyDays');
    const mnth = document.getElementById('st_monthlyDay');
    if (wkly) wkly.style.display = rt === 'weekly' ? 'block' : 'none';
    if (mnth) mnth.style.display = rt === 'monthly' ? 'block' : 'none';
  },

  async deleteSticky(id) {
    if (!confirm('この付箋を削除しますか？\n（配置済みのスロットも削除されます）')) return;
    try {
      await db.deleteSticky(id);
      this.renderTimelineTab();
      this.toast('削除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // ===== Sticky Archive タブ（月別表示） =====
  async renderStickyArchiveTab() {
    const pane = document.getElementById('logsTabArchive');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';

    if (!this.state.archiveYM) {
      const t = new Date();
      this.state.archiveYM = { year: t.getFullYear(), month: t.getMonth() };
    }
    const { year, month } = this.state.archiveYM;
    const monthName = `${year}年${month + 1}月`;

    let archived = [];
    try {
      // CEO の場合は全員、それ以外は自分のみ
      if (auth.isCEO()) {
        archived = await db.request('GET', `/stickies?status=eq.archived&order=archived_at.desc&limit=500`);
      } else {
        archived = await db.getStickies(auth.currentUser.id, 'archived');
      }
    } catch (e) {
      pane.innerHTML = '<p style="color:var(--danger);">読み込みエラー: ' + e.message + '</p>';
      return;
    }

    // 月でフィルタ
    const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const inMonth = archived.filter(s => {
      if (!s.archived_at) return false;
      const d = s.archived_at.slice(0, 10);
      return d >= monthStart && d <= monthEnd;
    });

    // 月毎の集計（全期間）
    const monthCounts = {};
    archived.forEach(s => {
      if (!s.archived_at) return;
      const ym = s.archived_at.slice(0, 7); // YYYY-MM
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    });

    const totalMin = inMonth.reduce((s, x) => s + (x.actual_minutes || x.estimated_minutes || 0), 0);

    let listHtml = '';
    if (inMonth.length === 0) {
      listHtml = this.emptyState('📦', `${monthName}のアーカイブなし`, '日報送信で完了した付箋がここに残ります');
    } else {
      // 日付ごとにグループ化
      const byDate = {};
      inMonth.forEach(s => {
        const d = s.archived_at.slice(0, 10);
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(s);
      });
      const sortedDates = Object.keys(byDate).sort().reverse();
      sortedDates.forEach(d => {
        const items = byDate[d];
        listHtml += `<div style="margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:6px;border-bottom:2px solid var(--primary);padding-bottom:4px;display:flex;justify-content:space-between;">
            <span>📅 ${d}</span>
            <span class="text-muted" style="font-weight:500;font-size:11px;">${items.length}件 / ${items.reduce((sum, x) => sum + (x.actual_minutes || x.estimated_minutes || 0), 0)}分</span>
          </div>`;
        items.forEach(s => {
          const staff = this.state.staff.find(x => x.id === s.staff_id);
          listHtml += `<div class="card" style="padding:10px 14px;margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;">${s.title}</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:2px;">
                  想定 ${s.estimated_minutes}分 ${s.actual_minutes ? `→ 実績 ${s.actual_minutes}分` : ''}
                  ${auth.isCEO() && staff ? ` ・ ${staff.name}` : ''}
                </div>
                ${s.completion_note ? `<div style="font-size:11px;color:var(--gray-700);margin-top:4px;padding:6px 8px;background:var(--gray-50);border-radius:4px;">${s.completion_note}</div>` : ''}
              </div>
              <button class="btn btn-sm" style="background:none;border:none;color:var(--gray-400);" onclick="App.deleteSticky('${s.id}')">🗑</button>
            </div>
          </div>`;
        });
        listHtml += '</div>';
      });
    }

    pane.innerHTML = `
      <div class="tl-toolbar">
        <button class="btn btn-sm btn-secondary" onclick="App.shiftArchiveMonth(-1)">← 前月</button>
        <strong style="font-size:14px;min-width:120px;text-align:center;">${monthName}</strong>
        <button class="btn btn-sm btn-secondary" onclick="App.shiftArchiveMonth(1)">次月 →</button>
        <span style="flex:1;"></span>
        <span class="text-muted" style="font-size:11px;">${inMonth.length}件 / ${Math.floor(totalMin / 60)}時間${totalMin % 60}分</span>
      </div>
      ${listHtml}
    `;
  },

  shiftArchiveMonth(delta) {
    const c = this.state.archiveYM;
    let y = c.year, m = c.month + delta;
    if (m < 0) { y--; m = 11; }
    else if (m > 11) { y++; m = 0; }
    this.state.archiveYM = { year: y, month: m };
    this.renderStickyArchiveTab();
  },

  // 付箋コメント履歴 HTML（3件超でアコーディオン）
  renderStickyCommentHistory(comments) {
    if (!comments || comments.length === 0) return '';
    const actionLabel = { done: '✅ 完了', continue: '🔄 継続', skip: '⏸ 見送り' };
    const actionColor = { done: '#d1fae5', continue: '#dbeafe', skip: '#fef3c7' };
    const renderRow = (c) => {
      const dt = new Date(c.timestamp);
      const label = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      const al = actionLabel[c.action] || c.action;
      const ac = actionColor[c.action] || '#f3f4f6';
      return `<div style="display:flex;gap:6px;align-items:flex-start;padding:4px 0;border-bottom:1px solid var(--border,#e5e7eb);">
        <span style="white-space:nowrap;font-size:10px;color:#888;flex-shrink:0;">${label}</span>
        <span style="white-space:nowrap;font-size:9px;background:${ac};padding:1px 5px;border-radius:3px;flex-shrink:0;">${al}</span>
        <span style="font-size:11px;line-height:1.5;word-break:break-all;">${this.esc(c.text)}</span>
      </div>`;
    };
    const FOLD = 3;
    if (comments.length <= FOLD) {
      return `<div style="margin-top:8px;padding:6px 8px;background:#f9fafb;border-radius:6px;border:1px solid var(--border,#e5e7eb);">
        <div style="font-size:10px;font-weight:600;color:#6b7280;margin-bottom:4px;">💬 コメント履歴（${comments.length}件）</div>
        ${comments.map(renderRow).join('')}
      </div>`;
    }
    const shown = comments.slice(-FOLD);
    const hidden = comments.slice(0, -FOLD);
    const hiddenId = `cmthist_${Math.random().toString(36).slice(2)}`;
    return `<div style="margin-top:8px;padding:6px 8px;background:#f9fafb;border-radius:6px;border:1px solid var(--border,#e5e7eb);">
      <div style="font-size:10px;font-weight:600;color:#6b7280;margin-bottom:4px;">💬 コメント履歴（${comments.length}件）</div>
      <div id="${hiddenId}" style="display:none;">${hidden.map(renderRow).join('')}</div>
      ${shown.map(renderRow).join('')}
      <button type="button" onclick="const el=document.getElementById('${hiddenId}');const open=el.style.display!=='none';el.style.display=open?'none':'block';this.textContent=open?'▼ 過去${hidden.length}件をみる':'▲ 折りたたむ';"
        style="margin-top:4px;font-size:10px;color:#6b7280;background:none;border:none;cursor:pointer;padding:0;">▼ 過去${hidden.length}件をみる</button>
    </div>`;
  },

  // ===== 日報報告作成タブ =====
  async renderDailyReportTab() {
    const pane = document.getElementById('logsTabReport');
    if (!this.state.reportDate) {
      this.state.reportDate = new Date().toISOString().slice(0, 10);
    }
    const today = this.state.reportDate;
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    const tomorrow = t.toISOString().slice(0, 10);

    const staffId = auth.currentUser.id;
    let todaySlots = [], tomorrowSlots = [], stickies = [];
    try {
      todaySlots = await db.getTimelineSlots(staffId, today);
      tomorrowSlots = await db.getTimelineSlots(staffId, tomorrow);
      stickies = await db.getStickies(staffId);
    } catch (e) {
      pane.innerHTML = `<div class="card" style="border-color:var(--danger);"><div style="color:var(--danger);font-size:13px;">読み込みエラー: ${e.message}</div></div>`;
      return;
    }

    const stickyMap = {};
    stickies.forEach(s => { stickyMap[s.id] = s; });
    this.state.reportStickies = stickies; // submitDailyReport でコメント追記に使用

    // 既存の draft（同日分）を取得
    let existingDraft = null;
    try {
      const reports = await db.getDailyReports({ staff_id: staffId, report_date: today });
      existingDraft = reports.find(r => (r.status || 'submitted') !== 'submitted') || null;
    } catch {}

    const draftReport = existingDraft?.timeline_summary || [];
    const draftMap = {};
    if (Array.isArray(draftReport)) draftReport.forEach(d => { if (d.slot_id) draftMap[d.slot_id] = d; });

    let html = `
      <div class="tl-toolbar">
        <label>📅 報告対象日:</label>
        <input type="date" id="reportDate" class="form-input" value="${today}" style="max-width:180px;">
        <button class="btn btn-sm btn-secondary" onclick="App.setReportDate(0)">今日</button>
        <button class="btn btn-sm btn-secondary" onclick="App.setReportDate(-1)">昨日</button>
        <span style="flex:1;"></span>
        <span class="text-muted" style="font-size:11px;">${todaySlots.length}件の付箋</span>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:8px;">📌 ${today} のタイムライン</div>
    `;

    if (todaySlots.length === 0) {
      html += `<p class="text-muted" style="font-size:13px;text-align:center;padding:20px;">この日のタイムラインは未設定です。<br>「タイムライン作成」タブで付箋を配置してください。</p>`;
    } else {
      html += '<div id="reportSlots">';
      todaySlots.forEach(slot => {
        const s = stickyMap[slot.sticky_id];
        if (!s) return;
        const draft = draftMap[slot.id] || {};
        const sh = String(Math.floor(slot.start_minutes / 60)).padStart(2, '0');
        const sm = String(slot.start_minutes % 60).padStart(2, '0');
        const endMin = slot.start_minutes + slot.duration_minutes;
        const eh = String(Math.floor(endMin / 60)).padStart(2, '0');
        const em = String(endMin % 60).padStart(2, '0');
        const action = draft.action || 'done';
        const isRecurSticky = s.recurrence_type && s.recurrence_type !== 'once';
        html += `<div class="report-slot" data-slot-id="${slot.id}" data-sticky-id="${s.id}" data-est="${s.estimated_minutes}" data-recurrence="${s.recurrence_type || 'once'}" style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;background:var(--gray-50);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;">
              <div style="font-weight:700;font-size:14px;">${s.title}${isRecurSticky ? ' <span style="font-size:10px;background:#dbeafe;color:#2563eb;padding:1px 6px;border-radius:3px;font-weight:500;">🔁 ルーティン</span>' : ''}</div>
              <div style="font-size:11px;color:var(--gray-500);margin-top:2px;">${sh}:${sm} - ${eh}:${em} ・ 想定 ${s.estimated_minutes}分</div>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              <label class="report-action ${action === 'done' ? 'active' : ''}" style="cursor:pointer;padding:4px 10px;border-radius:14px;font-size:11px;background:${action === 'done' ? '#10b981' : 'var(--gray-200)'};color:${action === 'done' ? 'white' : 'var(--gray-700)'};">
                <input type="radio" name="act_${slot.id}" value="done" ${action === 'done' ? 'checked' : ''} style="display:none;" onchange="App.handleReportActionChange('${slot.id}','done')">✅ 完了
              </label>
              <label class="report-action" style="cursor:pointer;padding:4px 10px;border-radius:14px;font-size:11px;background:${action === 'continue' ? '#3b82f6' : 'var(--gray-200)'};color:${action === 'continue' ? 'white' : 'var(--gray-700)'};">
                <input type="radio" name="act_${slot.id}" value="continue" ${action === 'continue' ? 'checked' : ''} style="display:none;" onchange="App.handleReportActionChange('${slot.id}','continue')">🔄 継続
              </label>
              <label class="report-action" style="cursor:pointer;padding:4px 10px;border-radius:14px;font-size:11px;background:${action === 'skip' ? '#f59e0b' : 'var(--gray-200)'};color:${action === 'skip' ? 'white' : 'var(--gray-700)'};">
                <input type="radio" name="act_${slot.id}" value="skip" ${action === 'skip' ? 'checked' : ''} style="display:none;" onchange="App.handleReportActionChange('${slot.id}','skip')">⏸ 見送り
              </label>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;margin-top:10px;">
            <label style="font-size:11px;color:var(--gray-600);">実績(分)</label>
            <input type="number" class="form-input report-actual" min="0" placeholder="${s.estimated_minutes}" value="${draft.actual_minutes || ''}" style="max-width:120px;padding:6px 8px;font-size:12px;">
          </div>
          ${this.renderStickyCommentHistory(s.comments || [])}
          <div style="margin-top:6px;">
            <label style="font-size:11px;color:var(--gray-600);display:block;margin-bottom:4px;">今日のコメント</label>
            <textarea class="form-textarea report-comment" rows="2" placeholder="コメントを入力（送信時にタイムスタンプ付きで付箋に保存されます）" style="font-size:12px;">${draft.comment || ''}</textarea>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    html += '</div>';

    // 明日のスケジュール
    html += `<div class="card">
      <div class="card-title" style="margin-bottom:8px;">🌅 ${tomorrow} の予定（送信に同梱）</div>`;
    if (tomorrowSlots.length === 0) {
      html += `<p class="text-muted" style="font-size:12px;text-align:center;padding:12px;">明日のタイムラインは未設定です。「タイムライン作成」タブで配置できます（送信時に空のままでも問題ありません）。</p>`;
    } else {
      html += '<div>';
      tomorrowSlots.forEach(slot => {
        const s = stickyMap[slot.sticky_id];
        if (!s) return;
        const sh = String(Math.floor(slot.start_minutes / 60)).padStart(2, '0');
        const sm = String(slot.start_minutes % 60).padStart(2, '0');
        html += `<div style="padding:6px 10px;background:var(--gray-50);border-radius:6px;margin-bottom:4px;font-size:12px;display:flex;justify-content:space-between;">
          <span>${sh}:${sm} - <strong>${s.title}</strong></span>
          <span class="text-muted">${slot.duration_minutes}分</span>
        </div>`;
      });
      html += '</div>';
    }
    html += '</div>';

    // プロジェクト進捗
    const myProjects = this.state.projects.filter(p =>
      p.status === 'active' && p.assigned_to === staffId
    );
    const existingPj = Array.isArray(existingDraft?.projects) ? existingDraft.projects : [];
    const pjMap = {};
    existingPj.forEach(p => { pjMap[p.project_id] = p; });

    html += `<div class="card">
      <div class="card-title" style="margin-bottom:8px;">📊 プロジェクト進捗</div>`;
    if (myProjects.length === 0) {
      html += `<p class="text-muted" style="font-size:12px;text-align:center;padding:12px;">担当中のアクティブなプロジェクトはありません。</p>`;
    } else {
      html += '<p class="text-muted" style="font-size:11px;margin-bottom:10px;">Lv.3 KPI の現在値を入力してください。送信時に進捗率が自動計算されます。</p>';
      myProjects.forEach(p => {
        const draft = pjMap[p.id] || {};
        const unit = this.state.businessUnits.find(u => u.id === p.business_unit_id);
        const progressColor = (p.progress_percent || 0) >= 75 ? 'var(--success)' : (p.progress_percent || 0) >= 40 ? 'var(--primary)' : 'var(--warning)';
        html += `<div class="report-pj-row" data-project-id="${p.id}" style="padding:10px 12px;background:var(--gray-50);border-radius:8px;margin-bottom:8px;border-left:3px solid var(--primary);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
            <div style="flex:1;min-width:200px;">
              <div style="font-weight:600;font-size:13px;">${this.esc(p.title)}</div>
              <div style="font-size:10px;color:var(--gray-500);margin-top:2px;">${this.esc(unit?.name || '?')} ・ <span style="color:${progressColor};font-weight:600;">${p.progress_percent || 0}%</span></div>
            </div>
          </div>
          <div class="pj-kpi-inputs" data-solution="${p.solution_type}">
            <div style="font-size:11px;color:var(--gray-400);padding:6px 0;">⏳ KPI 読み込み中...</div>
          </div>
          <textarea class="form-textarea report-pj-comment" rows="2" placeholder="進めた内容・気づき（任意）" style="margin-top:8px;font-size:12px;">${this.esc(draft.comment || '')}</textarea>
        </div>`;
      });
    }
    html += '</div>';

    // 所感
    html += `<div class="card">
      <div class="card-title" style="margin-bottom:8px;">💬 今日の所感</div>
      <textarea id="reportComment" class="form-textarea" rows="2" placeholder="気づき・課題・明日に向けて等">${existingDraft?.comment || ''}</textarea>
    </div>`;

    // 送信ボタン
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
      <button class="btn btn-secondary" onclick="App.saveReportDraft()">💾 下書き保存</button>
      <button class="btn btn-success" onclick="App.submitDailyReport()" ${todaySlots.length === 0 ? 'disabled' : ''}>📤 確定して送信</button>
    </div>`;

    pane.innerHTML = html;

    document.getElementById('reportDate').addEventListener('change', (e) => {
      this.state.reportDate = e.target.value;
      this.renderDailyReportTab();
    });

    // KPI 入力欄を非同期で各プロジェクト行に注入
    this.loadReportKpiInputs(existingPj);
  },

  async loadReportKpiInputs(existingPj = []) {
    const pjMap = {};
    existingPj.forEach(p => { pjMap[p.project_id] = p; });

    for (const row of document.querySelectorAll('.report-pj-row')) {
      const projectId = row.dataset.projectId;
      const area = row.querySelector('.pj-kpi-inputs');
      if (!area) continue;

      const project = this.state.projects.find(p => p.id === projectId);
      if (!project) { area.innerHTML = ''; continue; }

      if (project.solution_type !== 'kpi') {
        area.innerHTML = `<div style="font-size:11px;color:var(--gray-400);padding:4px 0;">📌 マイルストーン型：完了報告により進捗が自動更新されます</div>`;
        continue;
      }

      const kpis = await db.getKPIs(projectId).catch(() => []);
      const lv3 = kpis.filter(k => (k.level || 1) === 3 && !k.archived);
      if (lv3.length === 0) {
        area.innerHTML = `<div style="font-size:11px;color:var(--warning);padding:4px 0;">⚠️ Lv.3 KPI が未設定です。KPI設計で追加してください。</div>`;
        continue;
      }

      const savedKpis = pjMap[projectId]?.kpi_values || {};
      let kpiHtml = `<div style="font-size:11px;font-weight:600;color:var(--primary-dark);margin-bottom:6px;">📊 Lv.3 KPI 現在値を入力（必須）</div>`;
      lv3.forEach(k => {
        const saved = savedKpis[k.id] !== undefined ? savedKpis[k.id] : '';
        const progressPct = k.target_value !== k.start_value
          ? Math.round(Math.max(0, Math.min(100, ((k.current_value - k.start_value) / (k.target_value - k.start_value)) * 100)))
          : 0;
        kpiHtml += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap;">
          <div style="flex:1;min-width:140px;">
            <div style="font-size:12px;font-weight:500;">${this.esc(k.name)}</div>
            <div style="font-size:10px;color:var(--gray-500);">現在 ${k.current_value}${k.unit ? ' '+k.unit : ''} ／ 目標 ${k.target_value}${k.unit ? ' '+k.unit : ''} <span style="color:var(--primary);">(${progressPct}%)</span></div>
          </div>
          <input type="number" class="form-input report-kpi-input" data-kpi-id="${k.id}"
            placeholder="${k.current_value}" value="${saved}"
            style="width:90px;padding:5px 8px;font-size:12px;"
            oninput="App.previewKpiProgress(this)">
          <span style="font-size:11px;color:var(--gray-500);">${this.esc(k.unit || '')}</span>
        </div>`;
      });
      area.innerHTML = kpiHtml;
    }
  },

  previewKpiProgress(inputEl) {
    const row = inputEl.closest('.report-pj-row');
    if (!row) return;
    const projectId = row.dataset.projectId;
    const project = this.state.projects.find(p => p.id === projectId);
    if (!project) return;
    // 全 Lv.3 KPI の入力値を集めてプレビュー進捗を計算
    let total = 0, count = 0;
    row.querySelectorAll('.report-kpi-input').forEach(inp => {
      const kpiId = inp.dataset.kpiId;
      const val = parseFloat(inp.value);
      if (!kpiId || isNaN(val)) return;
      // state から KPI の start/target を探す
      const kpi = (this._reportKpiCache || {})[kpiId];
      if (!kpi) return;
      const range = kpi.target_value - kpi.start_value;
      if (range === 0) return;
      total += Math.max(0, Math.min(100, ((val - kpi.start_value) / range) * 100));
      count++;
    });
    if (count > 0) {
      const preview = Math.round(total / count);
      const display = row.querySelector('.pj-progress-preview');
      if (display) display.textContent = `→ 送信後: ${preview}%`;
    }
  },

  setReportDate(daysFromToday) {
    const t = new Date();
    t.setDate(t.getDate() + daysFromToday);
    this.state.reportDate = t.toISOString().slice(0, 10);
    this.renderDailyReportTab();
  },

  handleReportActionChange(slotId, action) {
    // UI のラベル背景色を更新
    const slot = document.querySelector(`.report-slot[data-slot-id="${slotId}"]`);
    if (!slot) return;
    slot.querySelectorAll('.report-action').forEach(lbl => {
      const radio = lbl.querySelector('input');
      const isActive = radio.value === action;
      const bg = isActive ?
        (action === 'done' ? '#10b981' : action === 'continue' ? '#3b82f6' : '#f59e0b')
        : 'var(--gray-200)';
      const color = isActive ? 'white' : 'var(--gray-700)';
      lbl.style.background = bg;
      lbl.style.color = color;
    });
  },

  collectReportData() {
    const slots = [];
    document.querySelectorAll('.report-slot').forEach(slotEl => {
      const slotId = slotEl.dataset.slotId;
      const stickyId = slotEl.dataset.stickyId;
      const est = parseInt(slotEl.dataset.est);
      const action = slotEl.querySelector('input[type="radio"]:checked')?.value || 'done';
      const actual = parseInt(slotEl.querySelector('.report-actual').value);
      const comment = slotEl.querySelector('.report-comment').value.trim();
      const recurrenceType = slotEl.dataset.recurrence || 'once';
      slots.push({
        slot_id: slotId,
        sticky_id: stickyId,
        action,
        actual_minutes: isNaN(actual) ? est : actual,
        comment,
        recurrence_type: recurrenceType
      });
    });
    return slots;
  },

  collectReportProjects() {
    const pjs = [];
    document.querySelectorAll('.report-pj-row').forEach(row => {
      const projectId = row.dataset.projectId;
      if (!projectId) return;
      const comment = row.querySelector('.report-pj-comment')?.value.trim() || '';
      const kpi_values = {};
      row.querySelectorAll('.report-kpi-input').forEach(inp => {
        const kpiId = inp.dataset.kpiId;
        const val = parseFloat(inp.value);
        if (kpiId && !isNaN(val)) kpi_values[kpiId] = val;
      });
      // KPI値 or コメントがある行のみ収集
      if (Object.keys(kpi_values).length > 0 || comment) {
        pjs.push({ project_id: projectId, comment, kpi_values });
      }
    });
    return pjs;
  },

  async saveReportDraft() {
    try {
      const summary = this.collectReportData();
      const projects = this.collectReportProjects();
      const comment = document.getElementById('reportComment')?.value.trim() || '';
      const staffId = auth.currentUser.id;
      const today = this.state.reportDate;
      const existing = (await db.getDailyReports({ staff_id: staffId, report_date: today }))
        .find(r => (r.status || 'submitted') !== 'submitted');
      const payload = {
        staff_id: staffId,
        report_date: today,
        timeline_summary: summary,
        projects,
        comment,
        status: 'draft'
      };
      if (existing) {
        await db.updateDailyReport(existing.id, payload);
      } else {
        await db.createDailyReport(payload);
      }
      this.toast('下書きを保存しました');
    } catch (e) {
      this.toast('保存エラー: ' + e.message, 'error');
    }
  },

  async submitDailyReport() {
    try {
      const summary = this.collectReportData();
      const projects = this.collectReportProjects();
      if (summary.length === 0 && projects.length === 0) {
        this.toast('送信する内容がありません', 'error');
        return;
      }
      const ok = await this.confirmSubmit(
        '日報を送信しますか？',
        `✅完了: ${summary.filter(s => s.action === 'done').length}件 / 🔄継続: ${summary.filter(s => s.action === 'continue').length}件 / ⏸見送り: ${summary.filter(s => s.action === 'skip').length}件${projects.length ? ` / 📊プロジェクト進捗: ${projects.length}件` : ''} を送信します。`
      );
      if (!ok) return;

      const staffId = auth.currentUser.id;
      const today = this.state.reportDate;
      const t = new Date(today);
      t.setDate(t.getDate() + 1);
      const tomorrow = t.toISOString().slice(0, 10);
      const comment = document.getElementById('reportComment')?.value.trim() || '';

      // 翌日のタイムライン取得
      const tomorrowSlots = await db.getTimelineSlots(staffId, tomorrow).catch(() => []);

      // 各付箋の状態を更新
      const now = new Date().toISOString();
      for (const s of summary) {
        const isRoutine = s.recurrence_type && s.recurrence_type !== 'once';
        const updateData = {};

        // アクション別の付箋状態更新
        if (s.action === 'done') {
          if (isRoutine) {
            updateData.actual_minutes = s.actual_minutes;
          } else {
            updateData.status = 'archived';
            updateData.actual_minutes = s.actual_minutes;
            updateData.completion_note = s.comment || '完了';
            updateData.archived_at = now;
          }
        } else if (s.action === 'skip') {
          updateData.priority = 'low';
        }

        // コメントがあればタイムスタンプ付きで付箋の comments 配列に追記
        if (s.comment) {
          const cachedSticky = (this.state.reportStickies || []).find(st => st.id === s.sticky_id);
          const existing = Array.isArray(cachedSticky?.comments) ? cachedSticky.comments : [];
          updateData.comments = [...existing, {
            text: s.comment,
            timestamp: now,
            action: s.action,
            report_date: today
          }];
        }

        if (Object.keys(updateData).length > 0) {
          await db.updateSticky(s.sticky_id, updateData).catch(() => {});
        }

        // continue: 翌日に再配置（重複しない場合のみ）
        if (s.action === 'continue') {
          const exists = tomorrowSlots.some(ts => ts.sticky_id === s.sticky_id);
          if (!exists) {
            await db.createTimelineSlot({
              sticky_id: s.sticky_id,
              staff_id: staffId,
              schedule_date: tomorrow,
              start_minutes: 9 * 60,
              duration_minutes: parseInt(document.querySelector(`.report-slot[data-sticky-id="${s.sticky_id}"]`)?.dataset.est) || 30,
              status: 'planned'
            }).catch(() => {});
          }
        }
      }

      // プロジェクト進捗を KPI 数値から再計算（手動 % は使わない）
      for (const pj of projects) {
        if (pj.kpi_values && Object.keys(pj.kpi_values).length > 0) {
          for (const [kid, val] of Object.entries(pj.kpi_values)) {
            await db.updateKPI(kid, { current_value: val }).catch(() => {});
          }
          await this.recalculateProgress(pj.project_id);
        }
        // KPI値なし（コメントのみ）の場合は進捗を変えない
      }

      // 翌日スケジュールを再取得（継続を含めた状態）
      const finalTomorrow = await db.getTimelineSlots(staffId, tomorrow).catch(() => []);

      // 日報を提出
      const existing = (await db.getDailyReports({ staff_id: staffId, report_date: today }))
        .find(r => (r.status || 'submitted') !== 'submitted');
      const payload = {
        staff_id: staffId,
        report_date: today,
        timeline_summary: summary,
        projects,
        tomorrow_schedule: finalTomorrow.map(ts => ({
          slot_id: ts.id,
          sticky_id: ts.sticky_id,
          start_minutes: ts.start_minutes,
          duration_minutes: ts.duration_minutes
        })),
        comment,
        status: 'submitted',
        submitted_at: now
      };
      if (existing) {
        await db.updateDailyReport(existing.id, payload);
      } else {
        await db.createDailyReport(payload);
      }

      // CEO に通知
      const ceos = this.state.staff.filter(s => s.role === 'ceo');
      for (const ceo of ceos) {
        await db.createNotification({
          recipient_id: ceo.id,
          type: 'daily_log_added',
          title: `📝 ${auth.currentUser.name} の日報`,
          message: `${today} の日報が提出されました`
        }).catch(() => {});
      }

      this.toast('日報を送信しました');
      // タイムラインタブに移動
      const tlTab = document.querySelector('.logs-tab[data-tab="timeline"]');
      if (tlTab) tlTab.click();
    } catch (e) {
      this.toast('送信エラー: ' + e.message, 'error');
    }
  },

  // ===== CEO 履歴タブ（カレンダー表示） =====
  async renderCEOLogsHistory() {
    const pane = document.getElementById('logsTabHistory');
    pane.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center;">読み込み中...</div>';

    let reports = [];
    try {
      const all = await db.getDailyReports();
      reports = all.filter(r => (r.status || 'submitted') === 'submitted');
    } catch (e) {
      pane.innerHTML = `<div style="color:var(--danger);padding:20px;">読み込みエラー: ${e.message}</div>`;
      return;
    }

    if (!this.state.histYM) {
      const t = new Date();
      this.state.histYM = { year: t.getFullYear(), month: t.getMonth() };
    }
    if (!this.state.histStaffFilter) this.state.histStaffFilter = '';

    const { year, month } = this.state.histYM;
    const flt = this.state.histStaffFilter;

    // 月内 + フィルター適用
    const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    let monthReports = reports.filter(r => r.report_date >= monthStart && r.report_date <= monthEnd);
    if (flt) monthReports = monthReports.filter(r => r.staff_id === flt);

    // 日付別グループ化
    const byDate = {};
    monthReports.forEach(r => {
      if (!byDate[r.report_date]) byDate[r.report_date] = [];
      byDate[r.report_date].push(r);
    });

    // 未提出スタッフ警告（今日基準）
    const today = new Date().toISOString().slice(0, 10);
    const submittedToday = new Set(reports.filter(r => r.report_date === today).map(r => r.staff_id));
    const notSubmitted = this.state.staff.filter(s => s.is_active && s.role !== 'ceo' && !submittedToday.has(s.id));

    const staffOptions = this.state.staff
      .filter(s => s.role !== 'ceo')
      .map(s => `<option value="${s.id}" ${flt === s.id ? 'selected' : ''}>${s.name}</option>`)
      .join('');

    // カレンダー作成
    const monthStartDate = new Date(year, month, 1);
    const monthEndDate = new Date(year, month + 1, 0);
    const firstDow = monthStartDate.getDay();
    const daysInMonth = monthEndDate.getDate();
    const monthName = `${year}年${month + 1}月`;

    let cellsHtml = '';
    for (let i = 0; i < firstDow; i++) cellsHtml += '<div class="cal-cell cal-empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayReports = byDate[dateStr] || [];
      const isToday = dateStr === today;
      const isSelected = this.state.histSelectedDate === dateStr;
      cellsHtml += `<div class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayReports.length > 0 ? 'has-slots' : ''}" onclick="App.selectHistDate('${dateStr}')">
        <div class="cal-day-num">${d}</div>
        ${dayReports.length > 0 ? `<div class="cal-day-count">${dayReports.length}件</div>` : ''}
      </div>`;
    }

    // 選択日の詳細
    let detailHtml = '';
    if (this.state.histSelectedDate) {
      const dayReports = byDate[this.state.histSelectedDate] || [];
      detailHtml = `<div style="margin-top:16px;">
        <h3 style="font-size:15px;margin-bottom:10px;">📅 ${this.state.histSelectedDate} の日報（${dayReports.length}件）</h3>
        ${dayReports.length === 0 ? '<p class="text-muted" style="text-align:center;padding:20px;font-size:13px;">この日の日報はありません</p>'
          : dayReports.map(r => this.renderHistoryReportCard(r)).join('')}
      </div>`;
    }

    let html = '';

    if (notSubmitted.length > 0) {
      html += `<div class="card" style="background:#fef3c7;border-color:#fbbf24;margin-bottom:14px;padding:12px 14px;">
        <div style="font-weight:700;font-size:13px;color:#92400e;margin-bottom:6px;">⚠️ 本日 (${today}) 未提出: ${notSubmitted.length}名</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${notSubmitted.map(s => `<span class="badge badge-warning">${s.name}</span>`).join('')}
        </div>
      </div>`;
    }

    html += `<div class="tl-toolbar">
      <button class="btn btn-sm btn-secondary" onclick="App.shiftHistMonth(-1)">← 前月</button>
      <strong style="font-size:14px;min-width:120px;text-align:center;">${monthName}</strong>
      <button class="btn btn-sm btn-secondary" onclick="App.shiftHistMonth(1)">次月 →</button>
      <button class="btn btn-sm btn-secondary" onclick="App.gotoHistToday()">今日</button>
      <label style="margin-left:10px;">スタッフ:</label>
      <select id="histStaff" class="form-select" style="max-width:180px;">
        <option value="">-- 全員 --</option>
        ${staffOptions}
      </select>
      <span style="flex:1;"></span>
      <span class="text-muted" style="font-size:11px;">${monthName}: ${monthReports.length}件</span>
    </div>
    <div class="cal-grid">
      <div class="cal-weekday sun">日</div>
      <div class="cal-weekday">月</div>
      <div class="cal-weekday">火</div>
      <div class="cal-weekday">水</div>
      <div class="cal-weekday">木</div>
      <div class="cal-weekday">金</div>
      <div class="cal-weekday sat">土</div>
      ${cellsHtml}
    </div>
    ${detailHtml}`;

    pane.innerHTML = html;

    document.getElementById('histStaff').addEventListener('change', (e) => {
      this.state.histStaffFilter = e.target.value;
      this.renderCEOLogsHistory();
    });
  },

  selectHistDate(dateStr) {
    this.state.histSelectedDate = dateStr;
    this.renderCEOLogsHistory();
  },

  shiftHistMonth(delta) {
    const c = this.state.histYM;
    let y = c.year, m = c.month + delta;
    if (m < 0) { y--; m = 11; }
    else if (m > 11) { y++; m = 0; }
    this.state.histYM = { year: y, month: m };
    this.renderCEOLogsHistory();
  },

  gotoHistToday() {
    const t = new Date();
    this.state.histYM = { year: t.getFullYear(), month: t.getMonth() };
    this.state.histSelectedDate = t.toISOString().slice(0, 10);
    this.renderCEOLogsHistory();
  },

  renderHistoryReportCard(r) {
    const staff = this.state.staff.find(s => s.id === r.staff_id);
    const summary = Array.isArray(r.timeline_summary) ? r.timeline_summary : [];
    const tomorrow = Array.isArray(r.tomorrow_schedule) ? r.tomorrow_schedule : [];

    const done = summary.filter(s => s.action === 'done').length;
    const cont = summary.filter(s => s.action === 'continue').length;
    const skip = summary.filter(s => s.action === 'skip').length;

    // 想定 vs 実績差分
    const totalEst = summary.reduce((sum, s) => {
      // 該当付箋を探して想定時間取得は無理（stickyMap がここにない）
      // 簡易：summary に actual_minutes だけある
      return sum + (s.actual_minutes || 0);
    }, 0);

    let summaryHtml = '';
    if (summary.length === 0) {
      summaryHtml = '<p class="text-muted" style="font-size:12px;">タイムライン情報なし（旧形式の日報）</p>';
    } else {
      summaryHtml = summary.map(s => {
        const actionLabel = { done: '✅ 完了', continue: '🔄 継続', skip: '⏸ 見送り' }[s.action] || s.action;
        const actionColor = { done: '#10b981', continue: '#3b82f6', skip: '#f59e0b' }[s.action] || '#6b7280';
        return `<div style="padding:8px 10px;background:var(--gray-50);border-left:3px solid ${actionColor};border-radius:6px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:600;font-size:12px;">${this.stickyTitle(s.sticky_id) || '(削除済み付箋)'}</span>
            <span style="font-size:10px;font-weight:600;color:${actionColor};">${actionLabel} ・ ${s.actual_minutes || 0}分</span>
          </div>
          ${s.comment ? `<div style="font-size:11px;color:var(--gray-700);margin-top:4px;">${s.comment}</div>` : ''}
        </div>`;
      }).join('');
    }

    let tomorrowHtml = '';
    if (tomorrow.length > 0) {
      tomorrowHtml = `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:6px;">🌅 翌日の予定（${tomorrow.length}件）</div>
        ${tomorrow.map(ts => {
          const sh = String(Math.floor(ts.start_minutes / 60)).padStart(2, '0');
          const sm = String(ts.start_minutes % 60).padStart(2, '0');
          return `<div style="font-size:11px;color:var(--gray-700);padding:2px 0;">${sh}:${sm} - ${this.stickyTitle(ts.sticky_id) || '?'}（${ts.duration_minutes}分）</div>`;
        }).join('')}
      </div>`;
    }

    // プロジェクト進捗
    const pjList = Array.isArray(r.projects) ? r.projects : [];
    let projectsHtml = '';
    if (pjList.length > 0) {
      projectsHtml = `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:6px;">📊 プロジェクト進捗（${pjList.length}件）</div>
        ${pjList.map(pj => {
          const project = this.state.projects.find(p => p.id === pj.project_id);
          return `<div style="padding:6px 10px;background:var(--gray-50);border-left:3px solid var(--primary);border-radius:0 6px 6px 0;margin-bottom:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span style="font-weight:600;font-size:12px;">${project?.title || '(削除済みプロジェクト)'}</span>
              <span class="badge badge-info" style="font-size:10px;">${pj.progress}%</span>
            </div>
            ${pj.comment ? `<div style="font-size:11px;color:var(--gray-700);margin-top:2px;">${pj.comment}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    }

    return `<div class="card" style="margin-bottom:10px;">
      <div class="card-header">
        <div>
          <div class="card-title">${r.report_date} ${staff?.name ? `・ ${staff.name}` : ''}</div>
          <div class="text-muted" style="font-size:11px;margin-top:2px;">提出 ${r.submitted_at ? this.formatDate(r.submitted_at) : '-'}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <span class="badge badge-success">✅${done}</span>
          ${cont > 0 ? `<span class="badge badge-info">🔄${cont}</span>` : ''}
          ${skip > 0 ? `<span class="badge badge-warning">⏸${skip}</span>` : ''}
          ${pjList.length > 0 ? `<span class="badge badge-info">📊${pjList.length}</span>` : ''}
          <span class="badge badge-gray">⏱${totalEst}分</span>
        </div>
      </div>
      ${summaryHtml}
      ${projectsHtml}
      ${r.comment ? `<div style="margin-top:10px;padding:10px 12px;background:var(--primary-light);border-radius:6px;font-size:12px;color:var(--gray-800);">
        <strong>💬 所感:</strong> ${r.comment}
      </div>` : ''}
      ${tomorrowHtml}
    </div>`;
  },

  // sticky_id からタイトルを取得（キャッシュ）
  stickyTitle(stickyId) {
    if (!stickyId) return null;
    if (!this._stickyTitleCache) this._stickyTitleCache = {};
    if (this._stickyTitleCache[stickyId]) return this._stickyTitleCache[stickyId];
    // 非同期取得は履歴表示時に難しいので fetch して内部キャッシュ更新
    db.request('GET', `/stickies?id=eq.${stickyId}&select=title`).then(arr => {
      if (arr && arr[0]) {
        this._stickyTitleCache[stickyId] = arr[0].title;
        // 再描画
        if (this.state.currentPage === 'logs') {
          const histTab = document.querySelector('.logs-tab.active');
          if (histTab?.dataset.tab === 'history') {
            // タイトル要素を find して書き換えるのではなく再レンダ
            this.renderCEOLogsHistory();
          }
        }
      }
    }).catch(() => {});
    return null;
  },

  // ===== 旧 renderLogs の中身（互換用に残置 - 未使用） =====
  async _renderLogsLegacy() {
    const container = document.getElementById('logsContent');
    const isCEO = auth.isCEO();

    // CEO は全員の「提出済み」日報、それ以外は自分の全て（下書き含む）
    const allReports = isCEO
      ? await db.getDailyReports()
      : await db.getDailyReports({ staff_id: auth.currentUser.id });
    const reports = isCEO
      ? allReports.filter(r => (r.status || 'submitted') === 'submitted')
      : allReports;

    // 表示中の年月 state
    if (!this.state.calendarYM) {
      const t = new Date();
      this.state.calendarYM = { year: t.getFullYear(), month: t.getMonth() };
    }
    const { year, month } = this.state.calendarYM;

    let html = '';

    // 未提出スタッフ警告（CEO のみ）
    if (isCEO) {
      const today = new Date().toISOString().slice(0, 10);
      const submittedToday = new Set(
        allReports
          .filter(r => r.report_date === today && (r.status || 'submitted') === 'submitted')
          .map(r => r.staff_id)
      );
      const notSubmitted = this.state.staff.filter(s =>
        s.is_active && s.role !== 'ceo' && !submittedToday.has(s.id)
      );
      if (notSubmitted.length > 0) {
        html += `<div class="card" style="background:#fef3c7;border-color:#fbbf24;margin-bottom:14px;">
          <div class="card-header">
            <div class="card-title" style="color:#92400e;">⚠️ 今日の日報未提出: ${notSubmitted.length}名</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${notSubmitted.map(s => `<span class="badge badge-warning">${s.name}</span>`).join('')}
          </div>
        </div>`;
      }
    }

    // カレンダーヘッダー（年月選択）
    const yearOpts = [];
    const nowYear = new Date().getFullYear();
    for (let y = nowYear + 1; y >= nowYear - 5; y--) {
      yearOpts.push(`<option value="${y}" ${y === year ? 'selected' : ''}>${y}年</option>`);
    }
    const monthOpts = [];
    for (let m = 0; m < 12; m++) {
      monthOpts.push(`<option value="${m}" ${m === month ? 'selected' : ''}>${m + 1}月</option>`);
    }
    html += `
      <div class="calendar-header">
        <button class="btn btn-sm btn-secondary" onclick="App.changeCalendarMonth(-1)">◀ 前月</button>
        <div class="calendar-title">
          <select onchange="App.setCalendarYear(this.value)" class="form-select calendar-select">${yearOpts.join('')}</select>
          <select onchange="App.setCalendarMonth(this.value)" class="form-select calendar-select">${monthOpts.join('')}</select>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="App.changeCalendarMonth(1)">翌月 ▶</button>
      </div>
    `;

    // カレンダー本体
    html += this.renderCalendar(year, month, reports);

    container.innerHTML = html;
  },

  renderCalendar(year, month, reports) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    // 日付ごとに日報をグループ化
    const byDate = {};
    reports.forEach(r => {
      if (!byDate[r.report_date]) byDate[r.report_date] = [];
      byDate[r.report_date].push(r);
    });

    let html = '<div class="calendar-grid">';
    const dows = ['日', '月', '火', '水', '木', '金', '土'];
    dows.forEach((d, i) => {
      html += `<div class="cal-day-header ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}">${d}</div>`;
    });
    for (let i = 0; i < startDow; i++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayReports = byDate[dateStr] || [];
      const dow = (startDow + d - 1) % 7;
      const isSun = dow === 0;
      const isSat = dow === 6;
      const isToday = dateStr === todayStr;
      const hasReports = dayReports.length > 0;

      const marks = dayReports.slice(0, 4).map(r => {
        const s = this.state.staff.find(x => x.id === r.staff_id);
        const initial = (s?.name || '?').slice(0, 1);
        const color = r.status === 'draft' ? 'var(--warning)' : 'var(--primary)';
        return `<div class="cal-mark" style="background:${color};" title="${s?.name || ''}">${initial}</div>`;
      }).join('');
      const moreCount = dayReports.length > 4 ? dayReports.length - 4 : 0;

      html += `<div class="cal-cell ${isSun ? 'sun' : ''} ${isSat ? 'sat' : ''} ${isToday ? 'today' : ''} ${hasReports ? 'has-reports' : ''}"
        ${hasReports ? `onclick="App.openDayReports('${dateStr}')"` : ''}>
        <div class="cal-date">${d}</div>
        ${hasReports ? `<div class="cal-marks">${marks}${moreCount > 0 ? `<div class="cal-mark cal-mark-more">+${moreCount}</div>` : ''}</div>` : ''}
      </div>`;
    }
    html += '</div>';
    return html;
  },

  changeCalendarMonth(delta) {
    let { year, month } = this.state.calendarYM;
    month += delta;
    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }
    this.state.calendarYM = { year, month };
    this.renderLogs();
  },

  setCalendarYear(y) {
    this.state.calendarYM.year = parseInt(y);
    this.renderLogs();
  },

  setCalendarMonth(m) {
    this.state.calendarYM.month = parseInt(m);
    this.renderLogs();
  },

  async openDayReports(dateStr) {
    const isCEO = auth.isCEO();
    const allReports = isCEO
      ? await db.getDailyReports({ report_date: dateStr })
      : await db.getDailyReports({ staff_id: auth.currentUser.id, report_date: dateStr });
    const reports = isCEO
      ? allReports.filter(r => (r.status || 'submitted') === 'submitted')
      : allReports;

    let body = `<p class="text-muted" style="font-size:12px;margin-bottom:14px;">${dateStr} の日報 ${reports.length}件</p>`;
    if (reports.length === 0) {
      body += '<p class="text-muted">なし</p>';
    } else {
      reports.forEach(r => {
        body += this.renderDailyReportCard(r);
      });
    }
    this.showModal(`📅 ${dateStr}`, body, null, true);
  },

  renderDailyReportCard(r) {
    const s = this.state.staff.find(x => x.id === r.staff_id);
    const isMine = r.staff_id === auth.currentUser.id;
    const projects = r.projects || [];
    const issues = r.issues || [];
    const completedTasks = r.completed_tasks || [];
    const routines = r.routines || [];

    const status = r.status || 'submitted';
    const isDraft = status === 'draft';

    return `<div class="card" style="${isDraft ? 'border-left:4px solid var(--warning);background:#fffbeb;' : ''}">
      <div class="card-header">
        <div>
          <div class="card-title">
            ${r.report_date} の日報
            ${isDraft
              ? '<span class="badge badge-warning" style="margin-left:8px;">💾 下書き</span>'
              : '<span class="badge badge-success" style="margin-left:8px;">✅ 提出済</span>'}
          </div>
          <div class="text-muted" style="font-size:11px;margin-top:2px;">
            作成: ${s?.name || '-'} (${this.roleLabel(s?.role)})
            ${r.submitted_at ? ` ・ 提出 ${this.formatDate(r.submitted_at)}` : ''}
          </div>
        </div>
        <div class="flex gap-1">
          ${isMine ? `<button class="btn btn-sm btn-secondary" onclick="App.openReportModal('${r.id}')">${isDraft ? '続きを書く' : '編集'}</button>` : ''}
          ${isMine || auth.isCEO() ? `<button class="btn btn-sm btn-danger" onclick="App.deleteReport('${r.id}')">削除</button>` : ''}
        </div>
      </div>

      ${projects.length > 0 ? `
        <div class="mb-2">
          <div style="font-size:12px;font-weight:600;color:var(--gray-700);margin-bottom:6px;">📊 プロジェクト進捗</div>
          ${projects.map(p => {
            const proj = this.state.projects.find(x => x.id === p.project_id);
            return `<div style="padding:8px 12px;background:var(--gray-50);border-radius:6px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px;">
                <strong>${proj?.title || '?'}</strong>
                <span class="badge badge-info">${p.progress || 0}%</span>
              </div>
              <div style="font-size:12px;color:var(--gray-700);">${p.action || ''}</div>
            </div>`;
          }).join('')}
        </div>
      ` : ''}

      ${issues.length > 0 ? `
        <div class="mb-2">
          <div style="font-size:12px;font-weight:600;color:var(--gray-700);margin-bottom:6px;">⚠️ 課題・壁</div>
          ${issues.map(i => `<div style="padding:8px 12px;background:#fee2e2;border-radius:6px;margin-bottom:6px;border-left:3px solid var(--danger);">
            <div style="font-size:12px;font-weight:600;color:#991b1b;">${i.title}</div>
            ${i.description ? `<div style="font-size:11px;color:var(--gray-700);margin-top:2px;">${i.description}</div>` : ''}
          </div>`).join('')}
        </div>
      ` : ''}

      ${completedTasks.length > 0 ? `
        <div class="mb-2">
          <div style="font-size:12px;font-weight:600;color:var(--gray-700);margin-bottom:6px;">✅ 完了したタスク指示</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${completedTasks.map(tid => {
              const t = this.state.taskInstructions.find(x => x.id === tid);
              return `<span class="badge badge-success">${t?.title || '?'}</span>`;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${routines.length > 0 ? `
        <div class="mb-2">
          <div style="font-size:12px;font-weight:600;color:var(--gray-700);margin-bottom:6px;">🔄 ルーティン報告</div>
          ${routines.map(rt => {
            const r = this.state.routineTasks.find(x => x.id === rt.routine_task_id);
            return `<div style="padding:6px 10px;background:${rt.has_issue ? '#fef3c7' : 'var(--gray-50)'};border-radius:6px;margin-bottom:4px;font-size:12px;">
              ${rt.has_issue ? '⚠️ ' : '✅ '}<strong>${r?.title || '?'}</strong>
              ${rt.issue_note ? `<div style="font-size:11px;color:var(--gray-700);margin-top:2px;">${rt.issue_note}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      ` : ''}

      ${r.tomorrow_plan ? `
        <div class="mb-2">
          <div style="font-size:12px;font-weight:600;color:var(--gray-700);margin-bottom:4px;">📅 明日の予定</div>
          <div style="font-size:12px;color:var(--gray-700);padding:8px 12px;background:var(--gray-50);border-radius:6px;">${r.tomorrow_plan}</div>
        </div>
      ` : ''}

      ${r.comment ? `
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--gray-700);margin-bottom:4px;">💬 一言</div>
          <div style="font-size:12px;color:var(--gray-700);padding:8px 12px;background:var(--primary-light);border-radius:6px;">${r.comment}</div>
        </div>
      ` : ''}
    </div>`;
  },

  async openLogModal() {
    if (auth.isCEO()) {
      this.toast('CEOは閲覧専用です', 'warning');
      return;
    }
    this.openReportModal();
  },

  async openReportModal(reportId = null) {
    const existing = reportId ? (await db.getDailyReports()).find(r => r.id === reportId) : null;

    // 自分が担当のプロジェクト
    const myProjects = this.state.projects.filter(p =>
      p.status === 'active' && p.assigned_to === auth.currentUser.id
    );

    // 自分宛の未完了タスク指示
    const myTasks = this.state.taskInstructions.filter(t =>
      t.assigned_to === auth.currentUser.id && t.status !== 'completed'
    );

    // 自分の今日のルーティン
    const myRoutines = this.state.routineTasks.filter(t =>
      t.assigned_to === auth.currentUser.id && t.is_active
    );

    const existingProjects = existing?.projects || [];
    const existingIssues = existing?.issues || [];
    const existingCompletedTasks = new Set(existing?.completed_tasks || []);
    const existingRoutines = existing?.routines || [];

    const bodyHtml = `
      <p class="text-muted mb-2" style="font-size:12px;">本日の業務報告を記入してください。</p>

      <div class="form-group">
        <label class="form-label">日付</label>
        <input type="date" id="r_date" class="form-input" value="${existing?.report_date || new Date().toISOString().slice(0,10)}">
      </div>

      <!-- 1. プロジェクト進捗 -->
      <div class="report-section">
        <div class="report-section-title">📊 プロジェクト進捗 <span class="text-muted" style="font-size:11px;">プロジェクト + 行動 + 進捗率</span></div>
        <div id="r_projectsList"></div>
        ${myProjects.length > 0 ? `<button type="button" class="btn btn-sm btn-secondary" onclick="App.addReportProjectRow()">+ プロジェクト追加</button>` : '<p class="text-muted" style="font-size:11px;">担当プロジェクトなし</p>'}
      </div>

      <!-- 2. 課題抽出 -->
      <div class="report-section">
        <div class="report-section-title">⚠️ 課題抽出 <span class="text-muted" style="font-size:11px;">ぶち当たった壁・エラー</span></div>
        <div id="r_issuesList"></div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="App.addReportIssueRow()">+ 課題追加</button>
      </div>

      <!-- 3. タスク完了 -->
      <div class="report-section">
        <div class="report-section-title">✅ タスク完了報告</div>
        ${myTasks.length === 0 ? '<p class="text-muted" style="font-size:11px;">未完了の指示なし</p>' :
          myTasks.map(t => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;">
            <input type="checkbox" class="r_task" value="${t.id}" ${existingCompletedTasks.has(t.id) ? 'checked' : ''}>
            <span>${t.title}</span>
            <span class="text-muted" style="font-size:10px;">${t.deadline || ''}</span>
          </label>`).join('')}
      </div>

      <!-- 4. ルーティン -->
      <div class="report-section">
        <div class="report-section-title">🔄 ルーティン報告</div>
        ${myRoutines.length === 0 ? '<p class="text-muted" style="font-size:11px;">担当ルーティンなし</p>' :
          myRoutines.map(r => {
            const existingR = existingRoutines.find(x => x.routine_task_id === r.id);
            return `<div style="padding:8px 0;border-bottom:1px solid var(--gray-100);">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
                <input type="checkbox" class="r_routine_done" data-id="${r.id}" ${existingR ? 'checked' : ''}>
                <span>${r.title}</span>
                <span class="text-muted" style="font-size:10px;">${{daily:'毎日',weekly:'毎週',monthly:'毎月'}[r.cycle]}</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:11px;margin-left:24px;">
                <input type="checkbox" class="r_routine_issue" data-id="${r.id}" ${existingR?.has_issue ? 'checked' : ''}>
                <span>問題あり</span>
              </label>
              <textarea class="form-textarea r_routine_note" data-id="${r.id}" style="margin-top:4px;margin-left:24px;width:calc(100% - 24px);font-size:12px;min-height:40px;" placeholder="問題の詳細（任意）">${existingR?.issue_note || ''}</textarea>
            </div>`;
          }).join('')}
      </div>

      <!-- 5. 明日の予定 -->
      <div class="form-group">
        <label class="form-label">📅 明日の予定</label>
        <textarea id="r_tomorrow" class="form-textarea" rows="2" placeholder="明日取り組む内容">${existing?.tomorrow_plan || ''}</textarea>
      </div>

      <!-- 6. 一言意見 -->
      <div class="form-group">
        <label class="form-label">💬 一言・感想・意見</label>
        <textarea id="r_comment" class="form-textarea" rows="2" placeholder="所感・気づき・提案など">${existing?.comment || ''}</textarea>
      </div>
    `;

    // 日報を「draft / submitted」で保存する共通処理
    const collectAndSave = async (targetStatus) => {
      // プロジェクト進捗を収集
      const projects = [];
      document.querySelectorAll('.r_project_row').forEach(row => {
        const pid = row.querySelector('.r_p_id').value;
        const action = row.querySelector('.r_p_action').value.trim();
        const progress = parseInt(row.querySelector('.r_p_progress').value) || 0;
        // KPI 値も収集
        const kpi_values = {};
        row.querySelectorAll('.report-kpi-card').forEach(card => {
          const kid = card.dataset.kpiId;
          const val = parseFloat(card.querySelector('.r_kpi_value').value);
          if (kid && !isNaN(val)) kpi_values[kid] = val;
        });
        if (pid && action) projects.push({ project_id: pid, action, progress, kpi_values });
      });

      const issues = [];
      document.querySelectorAll('.r_issue_row').forEach(row => {
        const title = row.querySelector('.r_i_title').value.trim();
        const description = row.querySelector('.r_i_desc').value.trim();
        if (title) issues.push({ title, description });
      });

      const completed_tasks = Array.from(document.querySelectorAll('.r_task:checked')).map(cb => cb.value);

      const routines = [];
      document.querySelectorAll('.r_routine_done:checked').forEach(cb => {
        const id = cb.dataset.id;
        const issueCheckbox = document.querySelector(`.r_routine_issue[data-id="${id}"]`);
        const noteEl = document.querySelector(`.r_routine_note[data-id="${id}"]`);
        routines.push({
          routine_task_id: id,
          has_issue: issueCheckbox?.checked || false,
          issue_note: noteEl?.value.trim() || ''
        });
      });

      const data = {
        staff_id: auth.currentUser.id,
        report_date: document.getElementById('r_date').value,
        projects,
        issues,
        completed_tasks,
        routines,
        tomorrow_plan: document.getElementById('r_tomorrow').value.trim(),
        comment: document.getElementById('r_comment').value.trim(),
        status: targetStatus,
        submitted_at: targetStatus === 'submitted' ? new Date().toISOString() : null
      };

      // submitted の場合は必須項目チェック
      if (targetStatus === 'submitted') {
        if (projects.length === 0 && completed_tasks.length === 0 && routines.length === 0) {
          this.toast('提出には プロジェクト進捗 / タスク完了 / ルーティン のいずれかが必要です', 'error');
          return false;
        }
      }

      try {
        if (existing) {
          await db.updateDailyReport(existing.id, data);
        } else {
          await db.createDailyReport(data);
        }

        if (targetStatus === 'submitted') {
          // タスク指示を完了状態に更新
          for (const tid of completed_tasks) {
            const task = this.state.taskInstructions.find(t => t.id === tid);
            if (task && task.status !== 'completed') {
              await db.updateTaskInstruction(tid, {
                status: 'completed',
                completed_at: new Date().toISOString()
              });
            }
          }

          // ルーティンログを登録（submit 時のみ）
          for (const rt of routines) {
            await db.createRoutineLog({
              routine_task_id: rt.routine_task_id,
              staff_id: auth.currentUser.id,
              log_date: data.report_date,
              content: rt.has_issue ? `[問題あり] ${rt.issue_note}` : '完了'
            }).catch(() => {});
          }

          // プロジェクト進捗を更新（Lv.3 KPI 値を反映）
          for (const p of projects) {
            // Lv.3 KPI 値を Supabase に保存
            if (p.kpi_values && Object.keys(p.kpi_values).length > 0) {
              for (const [kid, val] of Object.entries(p.kpi_values)) {
                await db.updateKPI(kid, { current_value: val }).catch(() => {});
              }
              await this.recalculateProgress(p.project_id);
            }
            // KPI値なしの場合は進捗を変えない
          }

          // CEO に通知
          const ceos = this.state.staff.filter(s => s.role === 'ceo');
          for (const ceo of ceos) {
            await db.createNotification({
              recipient_id: ceo.id,
              type: 'daily_log_added',
              title: `${auth.currentUser.name} の日報`,
              message: `${data.report_date} の日報が提出されました`
            }).catch(() => {});
          }
        }

        await this.loadAllData();
        this.renderCurrentPage();
        this.toast(targetStatus === 'submitted'
          ? '日報を提出しました（CEO に通知）'
          : '一時保存しました（あとで編集・提出できます）');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    };

    this.showModal(
      existing
        ? (existing.status === 'submitted' ? '日報を編集（提出済み）' : '日報を編集（下書き）')
        : '本日の日報を作成',
      bodyHtml,
      () => collectAndSave('submitted'),
      false,
      {
        submitLabel: '✅ 確定提出',
        submitClass: 'btn-primary',
        extraButton: {
          label: '💾 一時保存',
          class: 'btn-warning',
          onClick: () => collectAndSave('draft')
        }
      }
    );

    // 既存のプロジェクト/課題を復元、または初期1行
    setTimeout(() => {
      if (existingProjects.length > 0) {
        existingProjects.forEach(p => this.addReportProjectRow(p));
      }
      if (existingIssues.length > 0) {
        existingIssues.forEach(i => this.addReportIssueRow(i));
      }
    }, 50);
  },

  addReportProjectRow(existing = null) {
    const list = document.getElementById('r_projectsList');
    const myProjects = this.state.projects.filter(p =>
      p.status === 'active' && p.assigned_to === auth.currentUser.id
    );
    if (myProjects.length === 0) return;
    const projOpts = myProjects.map(p =>
      `<option value="${p.id}" ${existing?.project_id === p.id ? 'selected' : ''}>${p.title} (現在 ${p.progress_percent || 0}%) - ${p.solution_type === 'kpi' ? 'KPI' : 'マイルストーン'}</option>`
    ).join('');

    const row = document.createElement('div');
    row.className = 'r_project_row';
    row.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:8px;position:relative;';
    row.innerHTML = `
      <button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:6px;right:6px;background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;">×</button>
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">プロジェクト</label>
        <select class="form-select r_p_id" onchange="App.onReportProjectChange(this)"><option value="">-- 選択 --</option>${projOpts}</select>
      </div>
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">行動ログ</label>
        <textarea class="form-textarea r_p_action" rows="2" placeholder="今日このプロジェクトに対して行ったこと">${existing?.action || ''}</textarea>
      </div>
      <div class="r_p_kpi_area" style="margin-bottom:8px;"></div>
      <div class="form-group r_p_progress_wrap" style="margin-bottom:0;">
        <label class="form-label">進捗率 (%) <span class="text-muted" style="font-size:10px;">プロジェクト全体</span></label>
        <input type="number" class="form-input r_p_progress" min="0" max="100" value="${existing?.progress ?? ''}" placeholder="0-100" readonly style="background:var(--gray-50);">
      </div>
    `;
    list.appendChild(row);

    // 既存復元時は KPI UI を再描画
    if (existing?.project_id) {
      const select = row.querySelector('.r_p_id');
      select.value = existing.project_id;
      this.onReportProjectChange(select, existing);
    }
  },

  async onReportProjectChange(selectEl, existing = null) {
    const row = selectEl.closest('.r_project_row');
    const projectId = selectEl.value;
    const kpiArea = row.querySelector('.r_p_kpi_area');
    const progressInput = row.querySelector('.r_p_progress');
    const progressWrap = row.querySelector('.r_p_progress_wrap');
    kpiArea.innerHTML = '';
    if (!projectId) {
      progressInput.value = '';
      progressInput.readOnly = false;
      progressInput.style.background = '';
      progressWrap.style.display = 'block';
      return;
    }

    const project = this.state.projects.find(p => p.id === projectId);
    if (!project) return;

    if (project.solution_type === 'kpi') {
      // Lv.3 KPI の数値入力 UI
      const kpis = await db.getKPIs(projectId);
      const lv3 = kpis.filter(k => (k.level || 1) === 3 && !k.archived);
      if (lv3.length === 0) {
        kpiArea.innerHTML = '<p class="text-muted" style="font-size:11px;">Lv.3 KPI 未設定。プロジェクト全体の進捗率を直接入力してください。</p>';
        progressInput.readOnly = false;
        progressInput.style.background = '';
        return;
      }

      progressInput.readOnly = true;
      progressInput.style.background = 'var(--gray-50)';

      const existingKpis = existing?.kpi_values || {};
      let html = `
        <div style="background:var(--primary-light);padding:10px 12px;border-radius:8px;border-left:4px solid var(--primary);">
          <div style="font-size:12px;font-weight:600;color:var(--primary-dark);margin-bottom:8px;">📊 Lv.3 実行KPI の現在値を入力</div>
          <div class="report-kpi-grid">
      `;
      lv3.forEach(k => {
        const currentVal = existingKpis[k.id] !== undefined ? existingKpis[k.id] : k.current_value;
        html += `<div class="report-kpi-card" data-kpi-id="${k.id}" data-start="${k.start_value}" data-target="${k.target_value}">
          <div style="font-size:12px;font-weight:600;color:var(--gray-900);">${k.name}</div>
          <div style="font-size:10px;color:var(--gray-500);margin-top:2px;">目標 ${k.target_value} ${k.unit || ''}（開始 ${k.start_value}）</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
            <input type="number" class="form-input r_kpi_value" step="any" value="${currentVal}" style="font-size:13px;padding:6px 8px;flex:1;" oninput="App.recalcReportRow(this)">
            <span style="font-size:11px;color:var(--gray-500);min-width:30px;">${k.unit || ''}</span>
          </div>
          <div class="kpi-card-progress">
            <div class="progress-bar" style="flex:1;height:5px;"><div class="progress-fill kpi-fill" style="width:0%;"></div></div>
            <span class="kpi-percent" style="font-size:10px;color:var(--gray-500);min-width:36px;text-align:right;">0%</span>
          </div>
        </div>`;
      });
      html += `</div>
          <div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(37, 99, 235, 0.3);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;color:var(--primary-dark);font-weight:600;">プロジェクト全体（Lv.3 平均）</span>
            <span class="r_total_progress" style="font-size:14px;font-weight:700;color:var(--primary);">0%</span>
          </div>
        </div>
      `;
      kpiArea.innerHTML = html;
      this.recalcReportRow(row.querySelector('.r_kpi_value'));
    } else {
      // マイルストーン型は従来通り直接入力
      progressInput.readOnly = false;
      progressInput.style.background = '';
      kpiArea.innerHTML = '<p class="text-muted" style="font-size:11px;">マイルストーン型: 完了済みフェーズ数から自動算出するため、進捗率は手動入力でも OK。</p>';
    }
  },

  recalcReportRow(input) {
    const row = input.closest('.r_project_row');
    if (!row) return;
    const cards = row.querySelectorAll('.report-kpi-card');
    let totalPercent = 0;
    cards.forEach(card => {
      const start = parseFloat(card.dataset.start);
      const target = parseFloat(card.dataset.target);
      const val = parseFloat(card.querySelector('.r_kpi_value').value);
      const range = target - start;
      const p = (range !== 0 && !isNaN(val)) ? Math.max(0, Math.min(100, ((val - start) / range) * 100)) : 0;
      card.querySelector('.kpi-fill').style.width = p + '%';
      const progressColor = p >= 100 ? '#10b981' : (p >= 50 ? '#3b82f6' : (p >= 25 ? '#f59e0b' : '#ef4444'));
      card.querySelector('.kpi-fill').style.background = progressColor;
      card.querySelector('.kpi-percent').textContent = Math.round(p) + '%';
      totalPercent += p;
    });
    const avg = cards.length > 0 ? Math.round(totalPercent / cards.length) : 0;
    row.querySelector('.r_p_progress').value = avg;
    const totalEl = row.querySelector('.r_total_progress');
    if (totalEl) totalEl.textContent = avg + '%';
  },

  addReportIssueRow(existing = null) {
    const list = document.getElementById('r_issuesList');
    const row = document.createElement('div');
    row.className = 'r_issue_row';
    row.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:8px;position:relative;background:#fef9e7;';
    row.innerHTML = `
      <button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:6px;right:6px;background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;">×</button>
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">課題タイトル</label>
        <input type="text" class="form-input r_i_title" placeholder="例: 〇〇システムの認証エラー" value="${existing?.title || ''}">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">詳細</label>
        <textarea class="form-textarea r_i_desc" rows="2" placeholder="状況・原因・対応案など">${existing?.description || ''}</textarea>
      </div>
    `;
    list.appendChild(row);
  },

  async deleteReport(id) {
    if (!confirm('この日報を削除しますか？')) return;
    try {
      await db.deleteDailyReport(id);
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('日報を削除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  async onLogProjectChange() {
    const projectId = document.getElementById('l_project').value;
    const kpiArea = document.getElementById('l_kpiArea');
    const msArea = document.getElementById('l_msArea');
    kpiArea.innerHTML = '';
    msArea.innerHTML = '';
    if (!projectId) return;

    const project = this.state.projects.find(p => p.id === projectId);
    if (project.solution_type === 'kpi') {
      const kpis = await db.getKPIs(projectId);
      if (kpis.length > 0) {
        const opts = kpis.map(k => `<option value="${k.id}">${k.name} (現在 ${k.current_value} ${k.unit || ''})</option>`).join('');
        kpiArea.innerHTML = `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">影響したKPI</label>
              <select id="l_kpi" class="form-select"><option value="">-- なし --</option>${opts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">変化量 (+/-)</label>
              <input type="number" id="l_kpi_change" class="form-input" step="any" placeholder="例: +5">
            </div>
          </div>`;
      }
    } else {
      const milestones = await db.getMilestones(projectId);
      const pending = milestones.filter(m => m.status !== 'completed');
      if (pending.length > 0) {
        const opts = pending.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
        msArea.innerHTML = `
          <div class="form-group">
            <label class="form-label">関連マイルストーン</label>
            <select id="l_ms" class="form-select"><option value="">-- なし --</option>${opts}</select>
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
              <input type="checkbox" id="l_ms_done">
              このマイルストーンを完了とする
            </label>
          </div>`;
      }
    }
  },

  // KPI 単体の進捗率（0-100）
  kpiProgress(k) {
    const range = (k.target_value || 0) - (k.start_value || 0);
    if (range === 0) return 0;
    // current_value が未更新（== start_value）なら 0%
    if (k.current_value === null || k.current_value === undefined || k.current_value === k.start_value) return 0;
    const p = ((k.current_value - k.start_value) / range) * 100;
    return Math.max(0, Math.min(100, p));
  },

  // Lv.2 KPI の進捗率＝配下の Lv.3 の平均
  async rollupKpiParents(projectId) {
    const kpis = await db.getKPIs(projectId);
    const visible = kpis.filter(k => !k.archived);
    const lv1 = visible.find(k => (k.level || 1) === 1);
    const lv2s = visible.filter(k => (k.level || 1) === 2);
    const lv3s = visible.filter(k => (k.level || 1) === 3);

    // Lv.2 ごとに配下の Lv.3 平均値を current_value に反映（パーセンテージ表示用）
    for (const l2 of lv2s) {
      const children = lv3s.filter(c => c.parent_kpi_id === l2.id);
      if (children.length === 0) continue;
      const avgP = children.reduce((s, c) => s + this.kpiProgress(c), 0) / children.length;
      // current_value = start_value + (target - start) * (avgP/100)
      const range = (l2.target_value || 0) - (l2.start_value || 0);
      const newVal = (l2.start_value || 0) + range * (avgP / 100);
      await db.updateKPI(l2.id, { current_value: newVal }).catch(() => {});
    }

    // Lv.1 は Lv.2 の平均
    if (lv1) {
      if (lv2s.length > 0) {
        const updated = await db.getKPIs(projectId);
        const newLv2s = updated.filter(k => (k.level || 1) === 2 && !k.archived);
        const avgP = newLv2s.reduce((s, c) => s + this.kpiProgress(c), 0) / newLv2s.length;
        const range = (lv1.target_value || 0) - (lv1.start_value || 0);
        const newVal = (lv1.start_value || 0) + range * (avgP / 100);
        await db.updateKPI(lv1.id, { current_value: newVal }).catch(() => {});
      }
    }
  },

  async recalculateProgress(projectId) {
    const project = this.state.projects.find(p => p.id === projectId);
    if (!project) return;
    let progress = 0;

    if (project.solution_type === 'kpi') {
      // Lv.3 KPI を集計（Lv.3 がなければフォールバックで全KPI）
      const kpis = await db.getKPIs(projectId);
      const visible = kpis.filter(k => !k.archived);
      const lv3 = visible.filter(k => (k.level || 1) === 3);
      const target = lv3.length > 0 ? lv3 : visible;
      if (target.length > 0) {
        const sum = target.reduce((s, k) => s + this.kpiProgress(k), 0);
        progress = Math.round(sum / target.length);
      }
      // Lv.2 / Lv.1 を再計算して反映
      await this.rollupKpiParents(projectId);
    } else {
      // マイルストーン: 完了報告済み（archived + completion_note あり）のみ進捗にカウント
      // 差し戻し履歴・解決方法変更履歴は除外
      const rawMs = await db.getMilestones(projectId);
      const current = rawMs.filter(m => {
        if (m.archived && m.completion_note &&
            (m.completion_note.includes('差し戻しによる履歴化') ||
             m.completion_note.includes('解決方法変更により履歴化'))) {
          return false;
        }
        return true;
      });
      const total = current.length;
      if (total > 0) {
        const done = current.filter(m =>
          m.archived === true && m.completion_note && m.completion_note.trim().length > 0
        ).length;
        progress = Math.round((done / total) * 100);
      }
    }

    await db.updateProject(projectId, {
      progress_percent: progress,
      status: progress >= 100 ? 'completed' : 'active'
    });
  },

  // ===== Staff Management =====
  renderStaff() {
    const container = document.getElementById('staffContent');
    if (!auth.isCEO()) {
      container.innerHTML = '<p class="text-muted">この画面は CEO のみ利用可能です</p>';
      return;
    }
    if (this.state.staff.length === 0) {
      container.innerHTML = this.emptyState('👥', 'スタッフ未登録', '');
      return;
    }
    let html = '<div class="card"><table class="table"><thead><tr><th>名前</th><th>メール</th><th>権限</th><th>初回ログイン</th><th>状態</th><th></th></tr></thead><tbody>';
    this.state.staff.forEach(s => {
      html += `<tr>
        <td><strong>${s.name}</strong></td>
        <td class="text-muted">${s.email}</td>
        <td><span class="badge ${s.role === 'ceo' ? 'badge-warning' : s.role === 'manager' ? 'badge-info' : 'badge-gray'}">${this.roleLabel(s.role)}</span></td>
        <td>${s.is_first_login ? '<span class="badge badge-warning">未変更</span>' : '✅'}</td>
        <td>${s.is_active ? '<span class="badge badge-success">有効</span>' : '<span class="badge badge-danger">無効</span>'}</td>
        <td>
          ${s.id !== auth.currentUser.id ? `
            <button class="btn btn-sm btn-secondary" onclick="App.openStaffModal('${s.id}')">編集</button>
            <button class="btn btn-sm btn-danger" onclick="App.deleteStaff('${s.id}')">削除</button>
          ` : '<span class="text-muted">自分</span>'}
        </td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  openStaffModal(id = null) {
    const s = id ? this.state.staff.find(x => x.id === id) : null;
    this.showModal(s ? 'スタッフを編集' : '新規スタッフを登録', `
      <div class="form-group">
        <label class="form-label">氏名 *</label>
        <input type="text" id="s_name" class="form-input" value="${s?.name || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">メールアドレス *</label>
        <input type="email" id="s_email" class="form-input" value="${s?.email || ''}" ${s ? 'readonly' : ''}>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">権限 *</label>
          <select id="s_role" class="form-select">
            <option value="staff" ${s?.role === 'staff' ? 'selected' : ''}>スタッフ</option>
            <option value="manager" ${s?.role === 'manager' ? 'selected' : ''}>マネージャー</option>
            <option value="ceo" ${s?.role === 'ceo' ? 'selected' : ''}>CEO</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">状態</label>
          <select id="s_active" class="form-select">
            <option value="true" ${s?.is_active !== false ? 'selected' : ''}>有効</option>
            <option value="false" ${s?.is_active === false ? 'selected' : ''}>無効</option>
          </select>
        </div>
      </div>
      ${!s ? `
        <div class="form-group">
          <label class="form-label">仮パスワード *</label>
          <input type="text" id="s_pass" class="form-input" placeholder="本人が初回ログイン時に変更します">
        </div>
      ` : `
        <div class="form-group">
          <label class="form-label">パスワードをリセット（空白なら変更しない）</label>
          <input type="text" id="s_pass" class="form-input" placeholder="新しい仮パスワード">
        </div>
      `}
    `, async () => {
      const data = {
        name: document.getElementById('s_name').value.trim(),
        email: document.getElementById('s_email').value.trim(),
        role: document.getElementById('s_role').value,
        is_active: document.getElementById('s_active').value === 'true'
      };
      const pass = document.getElementById('s_pass').value;
      if (!data.name || !data.email) { this.toast('氏名とメールは必須', 'error'); return false; }
      try {
        if (id) {
          const updates = { name: data.name, role: data.role, is_active: data.is_active };
          if (pass) {
            updates.password_hash = pass;
            updates.is_first_login = true;
          }
          await db.updateStaff(id, updates);
        } else {
          if (!pass) { this.toast('仮パスワードを入力', 'error'); return false; }
          await db.createStaff({
            ...data,
            password_hash: pass,
            is_first_login: true
          });
        }
        await this.loadAllData();
        this.renderCurrentPage();
        this.toast(id ? 'スタッフを更新しました' : 'スタッフを登録しました');
        return true;
      } catch (e) {
        this.toast('エラー: ' + e.message, 'error');
        return false;
      }
    });
  },

  async deleteStaff(id) {
    const s = this.state.staff.find(x => x.id === id);
    if (!confirm(`「${s.name}」を削除しますか？`)) return;
    try {
      await db.deleteStaff(id);
      await this.loadAllData();
      this.renderCurrentPage();
      this.toast('スタッフを削除しました');
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    }
  },

  // ===== Notifications =====
  async renderNotifications() {
    const container = document.getElementById('notificationsContent');
    if (this.state.notifications.length === 0) {
      container.innerHTML = this.emptyState('🔔', '通知なし', '');
      return;
    }
    let html = '<div class="card">';
    this.state.notifications.forEach(n => {
      const p = this.state.projects.find(x => x.id === n.project_id);
      html += `<div style="padding:14px 0;border-bottom:1px solid var(--gray-100);cursor:pointer;${n.is_read ? '' : 'background:var(--primary-light);margin:0 -20px;padding:14px 20px;'}"
        onclick="App.handleNotificationClick('${n.id}', '${n.project_id || ''}')">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <div><strong>${n.title}</strong> ${!n.is_read ? '<span class="badge badge-info">新着</span>' : ''}</div>
          <div style="font-size:11px;color:var(--gray-500);">${this.formatDate(n.created_at)}</div>
        </div>
        <div style="font-size:13px;color:var(--gray-700);">${n.message || ''}</div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  async handleNotificationClick(notificationId, projectId) {
    await db.markNotificationRead(notificationId);
    await this.loadAllData();
    if (projectId) {
      this.openProjectDetail(projectId);
    }
    this.renderCurrentPage();
  },

  // ===== Modal Helper =====
  showModal(title, bodyHtml, onSubmit, hideSubmit = false, options = {}) {
    const container = document.getElementById('modalContainer');
    const submitLabel = options.submitLabel || '保存';
    const submitClass = options.submitClass || 'btn-primary';
    const extraButton = options.extraButton; // {label, class, onClick}

    container.innerHTML = `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">${title}</div>
            <button class="modal-close" onclick="App.closeModal()">×</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="App.closeModal()">${hideSubmit ? '閉じる' : 'キャンセル'}</button>
            ${extraButton ? `<button class="btn ${extraButton.class || 'btn-warning'}" id="modalExtra">${extraButton.label}</button>` : ''}
            ${!hideSubmit ? `<button class="btn ${submitClass}" id="modalSubmit">${submitLabel}</button>` : ''}
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') this.closeModal();
    });
    if (onSubmit) {
      document.getElementById('modalSubmit').addEventListener('click', async () => {
        const result = await onSubmit();
        if (result !== false) this.closeModal();
      });
    }
    if (extraButton && extraButton.onClick) {
      document.getElementById('modalExtra').addEventListener('click', async () => {
        const result = await extraButton.onClick();
        if (result !== false) this.closeModal();
      });
    }
  },

  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  },

  // ===== Toast =====
  toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // ===== Helpers =====
  unitTypeLabel(t) {
    return { store: '🏪 店舗', product: '📦 プロダクト', department: '🏢 部署', service: '💼 サービス' }[t] || t;
  },
  roleLabel(r) {
    return { ceo: 'CEO', manager: 'マネージャー', staff: 'スタッフ' }[r] || r;
  },
  statusLabel(s) {
    return {
      pending_design: '設計待ち',
      pending_approval: '承認待ち',
      active: '進行中',
      completed: '完了',
      paused: '停止中'
    }[s] || s;
  },
  esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },

  emptyState(icon, title, desc) {
    return `<div class="empty-state"><div class="icon">${icon}</div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div>`;
  },
  daysSince(dateStr) {
    const d = new Date(dateStr);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  },
  daysUntilDeadline(deadline) {
    if (!deadline) return null;
    const d = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  },
  deadlineClass(deadline) {
    const days = this.daysUntilDeadline(deadline);
    if (days === null) return '';
    if (days < 0) return 'deadline-overdue';
    if (days <= 10) return 'deadline-warning';
    return '';
  },
  deadlineTagHtml(deadline) {
    const days = this.daysUntilDeadline(deadline);
    if (days === null) return '';
    if (days < 0) return `<span class="deadline-tag overdue">🚨 期限超過${Math.abs(days)}日</span>`;
    if (days === 0) return `<span class="deadline-tag overdue">🚨 本日締切</span>`;
    if (days <= 10) return `<span class="deadline-tag warning">⏰ あと${days}日</span>`;
    return '';
  },
  formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

window.App = App;
