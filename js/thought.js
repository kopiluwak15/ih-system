/**
 * 独り言ページ
 */

const ThoughtPage = {
  currentThoughtDraft: null,
  autoSaveInterval: null,

  init() {
    const input = document.getElementById('thoughtInput');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const issueifyBtn = document.getElementById('issueifyBtn');
    const emergencyBtn = document.getElementById('emergencyMeetingBtn');

    // リアルタイム自動保存
    input.addEventListener('input', () => {
      this.updateCharCount();
      this.autoSaveDraft(input.value);
    });

    // 文字数の初期化
    this.updateCharCount();

    // ボタンイベント
    summarizeBtn.addEventListener('click', () => {
      const content = input.value.trim();
      if (!content) {
        alert('まず独り言を入力してください');
        return;
      }
      this.openSummaryModal(content);
    });

    issueifyBtn.addEventListener('click', () => {
      const content = input.value.trim();
      if (!content) {
        alert('まず独り言を入力してください');
        return;
      }
      this.createIssueFromThought(content);
    });

    emergencyBtn.addEventListener('click', () => {
      const content = input.value.trim();
      if (!content) {
        alert('まず独り言を入力してください');
        return;
      }
      this.openEmergencyMeeting(content);
    });

    // ドラフトをロード
    this.loadDraft();

    // 入力履歴を表示
    this.renderHistory();
  },

  updateCharCount() {
    const input = document.getElementById('thoughtInput');
    const count = document.getElementById('thoughtCount');
    count.textContent = input.value.length;
  },

  autoSaveDraft(content) {
    // 自動保存のロジック（ここでは localStorage に保存）
    sessionStorage.setItem('thoughtDraft', content);
  },

  loadDraft() {
    const input = document.getElementById('thoughtInput');
    const draft = sessionStorage.getItem('thoughtDraft');
    if (draft) {
      input.value = draft;
      this.updateCharCount();
    }
  },

  renderHistory() {
    const thoughts = Storage.getThoughts();
    const historyList = document.getElementById('historyList');

    if (thoughts.length === 0) {
      historyList.innerHTML = '<p style="color: #999;">まだ入力がありません</p>';
      return;
    }

    historyList.innerHTML = thoughts
      .slice()
      .reverse()
      .map(thought => {
        const date = new Date(thought.timestamp);
        const timeStr = date.toLocaleString('ja-JP');
        const preview = thought.content.substring(0, 60) + (thought.content.length > 60 ? '...' : '');
        return `
          <div class="history-item">
            <div class="history-time">${timeStr}</div>
            <div>${preview}</div>
            <div style="color: #999; font-size: 11px; margin-top: 4px;">${thought.length} 文字</div>
          </div>
        `;
      })
      .join('');
  },

  openSummaryModal(thoughtContent) {
    const modal = document.getElementById('summaryModal');
    const saveBtn = document.getElementById('saveSummaryBtn');
    const cancelBtn = document.getElementById('cancelSummaryBtn');
    const closeBtn = document.getElementById('closeSummaryModal');

    // 独り言を記録（削除不可）
    const thought = Storage.addThought(thoughtContent);

    // モーダルを開く
    modal.style.display = 'flex';

    // 保存ボタン
    const handleSave = () => {
      const summary = {
        definition: document.getElementById('summaryDefinition').value.trim(),
        hypothesis: document.getElementById('summaryHypothesis').value.trim(),
        solutions: document.getElementById('summarySolutions').value.trim(),
        roadmap: document.getElementById('summaryRoadmap').value.trim()
      };

      if (!summary.definition) {
        alert('課題定義を入力してください');
        return;
      }

      // 要約を保存
      Storage.addSummary(summary);

      // モーダルを閉じる
      modal.style.display = 'none';

      // フォームをリセット
      document.getElementById('summaryDefinition').value = '';
      document.getElementById('summaryHypothesis').value = '';
      document.getElementById('summarySolutions').value = '';
      document.getElementById('summaryRoadmap').value = '';

      // 独り言入力をクリア
      document.getElementById('thoughtInput').value = '';
      sessionStorage.removeItem('thoughtDraft');

      // 入力履歴を更新
      this.renderHistory();

      // 要約ページへ
      App.showPage('summary-page');
    };

    const handleClose = () => {
      modal.style.display = 'none';
      // フォームをリセット
      document.getElementById('summaryDefinition').value = '';
      document.getElementById('summaryHypothesis').value = '';
      document.getElementById('summarySolutions').value = '';
      document.getElementById('summaryRoadmap').value = '';
    };

    saveBtn.onclick = handleSave;
    cancelBtn.onclick = handleClose;
    closeBtn.onclick = handleClose;
  },

  createIssueFromThought(thoughtContent) {
    // 独り言を記録
    Storage.addThought(thoughtContent);

    // テキストから課題を抽出（簡易版：最初の1行を課題タイトルに）
    const lines = thoughtContent.split('\n');
    const firstLine = lines[0].trim();

    if (!firstLine) {
      alert('課題を抽出できませんでした');
      return;
    }

    // 課題を追加
    const issue = Storage.addIssue({
      title: firstLine,
      solution: '',
      duration: 90,
      progress: 0
    });

    // フィードバック
    alert(`課題を追加しました: "${firstLine}"`);

    // 独り言入力をクリア
    document.getElementById('thoughtInput').value = '';
    sessionStorage.removeItem('thoughtDraft');

    // 入力履歴を更新
    this.renderHistory();

    // 課題ページへ
    App.showPage('issues-page');
  },

  openEmergencyMeeting(thoughtContent) {
    // 独り言を記録
    Storage.addThought(thoughtContent);

    // ミーティングを作成
    const meeting = Storage.addMeeting({
      title: '緊急ミーティング',
      description: thoughtContent.substring(0, 100),
      materials: [],
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    });

    alert('緊急ミーティングを作成しました');

    // 独り言入力をクリア
    document.getElementById('thoughtInput').value = '';
    sessionStorage.removeItem('thoughtDraft');

    // 入力履歴を更新
    this.renderHistory();

    // ミーティングページへ
    App.showPage('meeting-page');
  }
};
