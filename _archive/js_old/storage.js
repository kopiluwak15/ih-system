/**
 * ローカルストレージ管理モジュール
 */

const Storage = {
  // キー定義
  KEYS: {
    PROJECT: 'thinking_project',
    THOUGHTS: 'thinking_thoughts',
    SUMMARIES: 'thinking_summaries',
    ISSUES: 'thinking_issues',
    MEETINGS: 'thinking_meetings'
  },

  // プロジェクト管理
  getProject() {
    const data = localStorage.getItem(this.KEYS.PROJECT);
    return data ? JSON.parse(data) : null;
  },

  saveProject(project) {
    localStorage.setItem(this.KEYS.PROJECT, JSON.stringify(project));
  },

  // 独り言管理
  getThoughts() {
    const data = localStorage.getItem(this.KEYS.THOUGHTS);
    return data ? JSON.parse(data) : [];
  },

  addThought(content) {
    const thoughts = this.getThoughts();
    const thought = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      content: content,
      length: content.length
    };
    thoughts.push(thought);
    localStorage.setItem(this.KEYS.THOUGHTS, JSON.stringify(thoughts));
    return thought;
  },

  updateThought(id, content) {
    const thoughts = this.getThoughts();
    const index = thoughts.findIndex(t => t.id === id);
    if (index >= 0) {
      thoughts[index].content = content;
      thoughts[index].length = content.length;
      thoughts[index].updatedAt = new Date().toISOString();
      localStorage.setItem(this.KEYS.THOUGHTS, JSON.stringify(thoughts));
    }
  },

  // 要約管理
  getSummaries() {
    const data = localStorage.getItem(this.KEYS.SUMMARIES);
    return data ? JSON.parse(data) : [];
  },

  addSummary(summary) {
    const summaries = this.getSummaries();
    const newSummary = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...summary
    };
    summaries.push(newSummary);
    localStorage.setItem(this.KEYS.SUMMARIES, JSON.stringify(summaries));
    return newSummary;
  },

  // 課題管理
  getIssues() {
    const data = localStorage.getItem(this.KEYS.ISSUES);
    return data ? JSON.parse(data) : [];
  },

  addIssue(issue) {
    const issues = this.getIssues();
    const newIssue = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      parentId: null,
      ...issue
    };
    issues.push(newIssue);
    localStorage.setItem(this.KEYS.ISSUES, JSON.stringify(issues));
    return newIssue;
  },

  updateIssue(id, updateData) {
    const issues = this.getIssues();
    const index = issues.findIndex(i => i.id === id);
    if (index >= 0) {
      issues[index] = {
        ...issues[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.KEYS.ISSUES, JSON.stringify(issues));
    }
  },

  deleteIssue(id) {
    let issues = this.getIssues();
    issues = issues.filter(i => i.id !== id);
    localStorage.setItem(this.KEYS.ISSUES, JSON.stringify(issues));
  },

  // ミーティング管理
  getMeetings() {
    const data = localStorage.getItem(this.KEYS.MEETINGS);
    return data ? JSON.parse(data) : [];
  },

  addMeeting(meeting) {
    const meetings = this.getMeetings();
    const newMeeting = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...meeting
    };
    meetings.push(newMeeting);
    localStorage.setItem(this.KEYS.MEETINGS, JSON.stringify(meetings));
    return newMeeting;
  },

  updateMeeting(id, updateData) {
    const meetings = this.getMeetings();
    const index = meetings.findIndex(m => m.id === id);
    if (index >= 0) {
      meetings[index] = {
        ...meetings[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.KEYS.MEETINGS, JSON.stringify(meetings));
    }
  },

  // ユーティリティ
  clearAll() {
    localStorage.clear();
  },

  // デバッグ：全データをコンソール出力
  logAll() {
    console.log('=== 全データ ===');
    console.log('Project:', this.getProject());
    console.log('Thoughts:', this.getThoughts());
    console.log('Summaries:', this.getSummaries());
    console.log('Issues:', this.getIssues());
    console.log('Meetings:', this.getMeetings());
  }
};
