/**
 * メインアプリケーション統制
 */

const App = {
  currentProject: null,

  init() {
    // 既存プロジェクトをチェック
    this.currentProject = Storage.getProject();

    // タブ切り替えイベント
    this.setupTabListeners();

    // トップページの処理
    this.setupTopPage();

    // 初期ページを表示
    if (this.currentProject) {
      this.showPage('thought-page');
      this.updateProjectDisplay();
    } else {
      this.showPage('top-page');
    }
  },

  // タブ切り替えのセットアップ
  setupTabListeners() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = button.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });
  },

  // タブを切り替える
  switchTab(tabId) {
    // すべてのページを非表示
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.classList.remove('active');
    });

    // 指定のページを表示
    const targetPage = document.getElementById(tabId);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // タブボタンのアクティブ状態を更新
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      button.classList.remove('active');
      if (button.getAttribute('data-tab') === tabId) {
        button.classList.add('active');
      }
    });

    // ページ固有の初期化処理
    this.initializePage(tabId);
  },

  // ページを表示
  showPage(pageId) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      if (button.getAttribute('data-tab') === pageId) {
        button.click();
      }
    });
  },

  // ページ固有の初期化
  initializePage(pageId) {
    switch (pageId) {
      case 'thought-page':
        ThoughtPage.init();
        break;
      case 'summary-page':
        SummaryPage.render();
        break;
      case 'issues-page':
        IssuesPage.render();
        break;
      case 'analysis-page':
        AnalysisPage.render();
        break;
      case 'meeting-page':
        MeetingPage.render();
        break;
    }
  },

  // トップページの処理
  setupTopPage() {
    const form = document.getElementById('topPageForm');
    const projectInfo = document.getElementById('projectInfo');
    const startBtn = document.getElementById('startThinkingBtn');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('projectTitle').value.trim();
      const description = document.getElementById('projectDescription').value.trim();

      if (!title) {
        alert('プロジェクトのタイトルを入力してください');
        return;
      }

      // プロジェクトを保存
      const project = {
        id: Date.now().toString(),
        title: title,
        description: description,
        createdAt: new Date().toISOString()
      };

      Storage.saveProject(project);
      this.currentProject = project;

      // 表示を更新
      this.updateProjectDisplay();

      // フォームをリセット
      form.reset();

      // 独り言ページへ
      this.showPage('thought-page');
    });

    startBtn.addEventListener('click', () => {
      this.showPage('thought-page');
    });

    // 既存プロジェクトがあれば表示
    if (this.currentProject) {
      document.getElementById('projectTitle').value = this.currentProject.title;
      document.getElementById('projectDescription').value = this.currentProject.description;
      this.updateProjectDisplay();
    }
  },

  // プロジェクト表示を更新
  updateProjectDisplay() {
    if (!this.currentProject) return;

    const headerProject = document.getElementById('currentProject');
    headerProject.textContent = this.currentProject.title;

    const displayTitle = document.getElementById('displayProjectTitle');
    const displayDesc = document.getElementById('displayProjectDescription');
    const projectInfo = document.getElementById('projectInfo');

    displayTitle.textContent = this.currentProject.title;
    displayDesc.textContent = this.currentProject.description;
    projectInfo.style.display = 'block';
  }
};

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
