/**
 * CEO Dashboard App
 * Sidebar navigation and page switching logic
 */

class CEODashboard {
  constructor() {
    this.currentPage = 'dashboard';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadInitialData();
    this.showPage('dashboard');
  }

  setupEventListeners() {
    // Sidebar navigation
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageName = item.getAttribute('data-page');
        this.showPage(pageName);
      });
    });

    // Form submissions
    this.setupFormHandlers();
  }

  showPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.classList.remove('active');
    });

    // Remove active class from all sidebar items
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      item.classList.remove('active');
    });

    // Show selected page
    const selectedPage = document.getElementById(pageName);
    if (selectedPage) {
      selectedPage.classList.add('active');
    }

    // Set active sidebar item
    const activeItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    this.currentPage = pageName;

    // Load page-specific data or logic
    this.onPageChanged(pageName);
  }

  setupFormHandlers() {
    // Store Settings Form
    const storeSettingsForm = document.getElementById('storeSettingsForm');
    if (storeSettingsForm) {
      storeSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleStoreSubmit();
      });
    }

    // Project Creation Form
    const projectCreationForm = document.getElementById('projectCreationForm');
    if (projectCreationForm) {
      projectCreationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleProjectSubmit();
      });
    }

    // Routine Task Form
    const routineTaskForm = document.getElementById('routineTaskForm');
    if (routineTaskForm) {
      routineTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRoutineTaskSubmit();
      });
    }

    // Task Panel Form
    const taskPanelForm = document.getElementById('taskPanelForm');
    if (taskPanelForm) {
      taskPanelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTaskPanelSubmit();
      });
    }
  }

  onPageChanged(pageName) {
    // Page-specific logic when changing pages
    switch (pageName) {
      case 'store-management':
        this.loadStoreManagement();
        break;
      case 'kgi-management':
        this.loadKGIManagement();
        break;
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'project-creation':
        this.loadProjectCreation();
        break;
      case 'task-panel':
        this.loadTaskPanel();
        break;
      case 'schedule':
        this.loadSchedule();
        break;
      case 'routine-tasks':
        this.loadRoutineTasks();
        break;
      case 'daily-report':
        this.loadDailyReport();
        break;
      case 'store-settings':
        this.loadStoreSettings();
        break;
    }
  }

  loadInitialData() {
    // Load initial data from localStorage or API
    this.stores = JSON.parse(localStorage.getItem('stores')) || [];
    this.projects = JSON.parse(localStorage.getItem('projects')) || [];
    this.routines = JSON.parse(localStorage.getItem('routines')) || [];
    this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    this.kgis = JSON.parse(localStorage.getItem('kgis')) || [];
  }

  // ==================== Dashboard ====================
  loadDashboard() {
    const dashboardContent = document.getElementById('dashboardContent');
    if (this.kgis.length === 0) {
      dashboardContent.innerHTML = `
        <p style="color: #999; text-align: center; padding: 32px;">
          KGI が登録されると、ここに進捗が表示されます
        </p>
      `;
      return;
    }

    let html = '<div style="display: grid; gap: 16px;">';
    this.kgis.forEach(kgi => {
      const progressPercent = ((kgi.current - kgi.start) / (kgi.target - kgi.start)) * 100;
      const progressClamped = Math.max(0, Math.min(100, progressPercent));

      html += `
        <div style="border: 1px solid #e0e0e0; padding: 16px; border-radius: 8px; background: #f9f9f9;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 16px; color: #333;">${kgi.name}</h4>
            <span style="font-size: 12px; color: #999;">${progressClamped.toFixed(1)}%</span>
          </div>
          <div style="height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <div style="height: 100%; background: #667eea; width: ${progressClamped}%; transition: width 0.3s ease;"></div>
          </div>
          <div style="font-size: 12px; color: #666;">
            ${kgi.current} / ${kgi.target} (期間: ${kgi.duration}日)
          </div>
        </div>
      `;
    });
    html += '</div>';
    dashboardContent.innerHTML = html;
  }

  // ==================== KGI Management ====================
  loadKGIManagement() {
    const kgiContent = document.getElementById('kgiContent');
    if (this.kgis.length === 0) {
      kgiContent.innerHTML = `
        <p style="color: #999; text-align: center; padding: 32px;">
          KGI が登録されると、ここに表示されます
        </p>
      `;
      return;
    }

    let html = '<div style="display: grid; gap: 16px;">';
    this.kgis.forEach((kgi, index) => {
      html += `
        <div style="border: 1px solid #e0e0e0; padding: 16px; border-radius: 8px; background: #f9f9f9; cursor: pointer; transition: all 0.2s;">
          <h4 style="margin: 0 0 8px 0; color: #333;">${kgi.name}</h4>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${kgi.description}</p>
          <div style="display: flex; gap: 16px; font-size: 12px; color: #999;">
            <span>目標: ${kgi.target}</span>
            <span>現在: ${kgi.current}</span>
            <span>期間: ${kgi.duration}日</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    kgiContent.innerHTML = html;
  }

  // ==================== Store Management ====================
  loadStoreManagement() {
    const storeTabs = document.getElementById('storeTabs');
    const storeContent = document.getElementById('storeContent');

    if (this.stores.length === 0) {
      storeTabs.innerHTML = `
        <p style="color: #999; text-align: center; padding: 32px;">
          店舗が登録されると、ここにタブが表示されます
        </p>
      `;
      storeContent.innerHTML = '';
      return;
    }

    // Create store tabs
    let tabsHtml = '<div style="display: flex; gap: 8px; border-bottom: 1px solid #e0e0e0; margin-bottom: 16px;">';
    this.stores.forEach((store, index) => {
      const isActive = index === 0 ? 'active' : '';
      tabsHtml += `
        <button class="store-tab ${isActive}" data-store-id="${store.id}"
          style="padding: 8px 16px; background: ${isActive ? '#667eea' : '#f0f0f0'};
          color: ${isActive ? 'white' : '#333'}; border: none; border-radius: 4px;
          cursor: pointer; transition: all 0.2s;">
          ${store.name}
        </button>
      `;
    });
    tabsHtml += '</div>';
    storeTabs.innerHTML = tabsHtml;

    // Attach tab click handlers
    document.querySelectorAll('.store-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchStoreTab(tab.getAttribute('data-store-id')));
    });

    // Load first store's content
    this.switchStoreTab(this.stores[0].id);
  }

  switchStoreTab(storeId) {
    const storeContent = document.getElementById('storeContent');
    const store = this.stores.find(s => s.id === storeId);

    if (!store) return;

    // Update active tab
    document.querySelectorAll('.store-tab').forEach(tab => {
      const isActive = tab.getAttribute('data-store-id') === storeId;
      tab.style.background = isActive ? '#667eea' : '#f0f0f0';
      tab.style.color = isActive ? 'white' : '#333';
    });

    // Load store content
    const storeProjects = this.projects.filter(p => p.storeId === storeId);
    let html = `
      <h3>${store.name}</h3>
      <p style="color: #666; margin-bottom: 16px;">${store.location}</p>
      <h4>プロジェクト一覧</h4>
    `;

    if (storeProjects.length === 0) {
      html += '<p style="color: #999;">このお店にはプロジェクトがまだありません</p>';
    } else {
      html += '<div style="display: grid; gap: 12px;">';
      storeProjects.forEach(project => {
        html += `
          <div style="border-left: 4px solid #667eea; padding: 12px; background: #f9f9f9; border-radius: 4px;">
            <h5 style="margin: 0 0 4px 0;">${project.name}</h5>
            <p style="margin: 0; font-size: 12px; color: #666;">${project.description}</p>
          </div>
        `;
      });
      html += '</div>';
    }

    storeContent.innerHTML = html;
  }

  // ==================== Project Creation ====================
  loadProjectCreation() {
    const pcStore = document.getElementById('pcStore');
    pcStore.innerHTML = '<option value="">-- 店舗を選択 --</option>';
    this.stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store.id;
      option.textContent = store.name;
      pcStore.appendChild(option);
    });
  }

  handleProjectSubmit() {
    const storeId = document.getElementById('pcStore').value;
    const projectName = document.getElementById('pcProjectName').value;
    const projectDesc = document.getElementById('pcProjectDesc').value;
    const useMilestone = document.getElementById('useMilestone').checked;
    const useKpiTree = document.getElementById('useKpiTree').checked;
    const deadline = document.getElementById('pcDeadline').value;

    if (!storeId || !projectName) {
      alert('店舗とプロジェクト名を入力してください');
      return;
    }

    if (!useMilestone && !useKpiTree) {
      alert('進捗管理方法を選択してください');
      return;
    }

    const project = {
      id: 'proj_' + Date.now(),
      storeId,
      name: projectName,
      description: projectDesc,
      milestone: useMilestone,
      kpiTree: useKpiTree,
      deadline,
      createdAt: new Date().toISOString(),
    };

    this.projects.push(project);
    localStorage.setItem('projects', JSON.stringify(this.projects));

    alert('プロジェクトを作成しました！');
    document.getElementById('projectCreationForm').reset();
  }

  // ==================== Store Settings ====================
  loadStoreSettings() {
    this.renderRegisteredStores();
  }

  renderRegisteredStores() {
    const registeredStores = document.getElementById('registeredStores');
    if (this.stores.length === 0) {
      registeredStores.innerHTML = '<p style="color: #999;">まだ店舗が登録されていません</p>';
      return;
    }

    let html = '<div style="display: grid; gap: 12px;">';
    this.stores.forEach((store, index) => {
      html += `
        <div style="border: 1px solid #e0e0e0; padding: 12px; border-radius: 4px; background: #f9f9f9; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h5 style="margin: 0 0 4px 0;">${store.name}</h5>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${store.location}</p>
            <p style="margin: 0; font-size: 12px; color: #999;">${store.specs}</p>
          </div>
          <button onclick="window.ceoDashboard.deleteStore('${store.id}')"
            style="padding: 6px 12px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">
            削除
          </button>
        </div>
      `;
    });
    html += '</div>';
    registeredStores.innerHTML = html;
  }

  handleStoreSubmit() {
    const storeName = document.getElementById('storeName').value;
    const storeLocation = document.getElementById('storeLocation').value;
    const storeSpecs = document.getElementById('storeSpecs').value;

    if (!storeName) {
      alert('店舗名を入力してください');
      return;
    }

    const store = {
      id: 'store_' + Date.now(),
      name: storeName,
      location: storeLocation,
      specs: storeSpecs,
      createdAt: new Date().toISOString(),
    };

    this.stores.push(store);
    localStorage.setItem('stores', JSON.stringify(this.stores));

    alert('店舗を追加しました！');
    document.getElementById('storeSettingsForm').reset();
    this.renderRegisteredStores();
  }

  deleteStore(storeId) {
    if (confirm('この店舗を削除しますか？')) {
      this.stores = this.stores.filter(s => s.id !== storeId);
      localStorage.setItem('stores', JSON.stringify(this.stores));
      this.renderRegisteredStores();
    }
  }

  // ==================== Schedule ====================
  loadSchedule() {
    const scheduleContent = document.getElementById('scheduleContent');
    scheduleContent.innerHTML = `
      <p style="color: #999; text-align: center; padding: 32px;">
        スケジュールデータが登録されると表示されます
      </p>
    `;
  }

  // ==================== Routine Tasks ====================
  loadRoutineTasks() {
    this.renderRegisteredRoutines();
  }

  handleRoutineTaskSubmit() {
    const taskName = document.getElementById('routineTaskName').value;
    const taskDesc = document.getElementById('routineTaskDesc').value;
    const taskFreq = document.getElementById('routineTaskFreq').value;

    if (!taskName) {
      alert('タスク名を入力してください');
      return;
    }

    const routine = {
      id: 'routine_' + Date.now(),
      name: taskName,
      description: taskDesc,
      frequency: taskFreq,
      createdAt: new Date().toISOString(),
    };

    this.routines.push(routine);
    localStorage.setItem('routines', JSON.stringify(this.routines));

    alert('ルーティンを追加しました！');
    document.getElementById('routineTaskForm').reset();
    this.renderRegisteredRoutines();
  }

  renderRegisteredRoutines() {
    const registeredRoutines = document.getElementById('registeredRoutines');
    if (this.routines.length === 0) {
      registeredRoutines.innerHTML = '<p style="color: #999;">まだルーティンが登録されていません</p>';
      return;
    }

    let html = '<div style="display: grid; gap: 12px;">';
    this.routines.forEach((routine) => {
      const freqLabel = {
        daily: '毎日',
        weekly: '毎週',
        monthly: '毎月',
      }[routine.frequency] || routine.frequency;

      html += `
        <div style="border: 1px solid #e0e0e0; padding: 12px; border-radius: 4px; background: #f9f9f9; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h5 style="margin: 0 0 4px 0;">${routine.name}</h5>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${routine.description}</p>
            <p style="margin: 0; font-size: 12px; color: #999;">頻度: ${freqLabel}</p>
          </div>
          <button onclick="window.ceoDashboard.deleteRoutine('${routine.id}')"
            style="padding: 6px 12px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">
            削除
          </button>
        </div>
      `;
    });
    html += '</div>';
    registeredRoutines.innerHTML = html;
  }

  deleteRoutine(routineId) {
    if (confirm('このルーティンを削除しますか？')) {
      this.routines = this.routines.filter(r => r.id !== routineId);
      localStorage.setItem('routines', JSON.stringify(this.routines));
      this.renderRegisteredRoutines();
    }
  }

  // ==================== Daily Report ====================
  loadDailyReport() {
    const dailyReportContent = document.getElementById('dailyReportContent');
    dailyReportContent.innerHTML = `
      <p style="color: #999; text-align: center; padding: 32px;">
        日報が登録されると、ここに表示されます
      </p>
    `;
  }

  // ==================== Task Panel ====================
  loadTaskPanel() {
    this.renderIssuedTasks();
  }

  handleTaskPanelSubmit() {
    const tpTitle = document.getElementById('tpTitle').value;
    const tpDesc = document.getElementById('tpDesc').value;
    const tpDeliverables = document.getElementById('tpDeliverables').value;
    const tpDeadline = document.getElementById('tpDeadline').value;
    const tpAssignee = document.getElementById('tpAssignee').value;

    if (!tpTitle || !tpDeadline || !tpAssignee) {
      alert('必須項目を入力してください');
      return;
    }

    const task = {
      id: 'task_' + Date.now(),
      title: tpTitle,
      description: tpDesc,
      deliverables: tpDeliverables,
      deadline: tpDeadline,
      assignee: tpAssignee,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(this.tasks));

    alert('タスクを発行しました！');
    document.getElementById('taskPanelForm').reset();
    this.renderIssuedTasks();
  }

  renderIssuedTasks() {
    const issuedTasks = document.getElementById('issuedTasks');
    if (this.tasks.length === 0) {
      issuedTasks.innerHTML = '<p style="color: #999;">まだタスクが発行されていません</p>';
      return;
    }

    let html = '<div style="display: grid; gap: 12px;">';
    this.tasks.forEach((task) => {
      const assigneeLabel = {
        manager1: '部長A',
        manager2: 'マネージャーB',
      }[task.assignee] || task.assignee;

      const isOverdue = new Date(task.deadline) < new Date();
      const borderColor = isOverdue ? '#ff6b6b' : '#667eea';

      html += `
        <div style="border-left: 4px solid ${borderColor}; padding: 12px; border-radius: 4px; background: #f9f9f9; position: relative;">
          ${isOverdue ? '<span style="position: absolute; top: 8px; right: 8px; background: #ff6b6b; color: white; padding: 2px 8px; border-radius: 2px; font-size: 11px;">期限超過</span>' : ''}
          <h5 style="margin: 0 0 4px 0;">${task.title}</h5>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${task.description}</p>
          <div style="display: flex; gap: 16px; font-size: 12px; color: #999; margin-bottom: 8px;">
            <span>成果物: ${task.deliverables}</span>
            <span>期限: ${task.deadline}</span>
            <span>担当: ${assigneeLabel}</span>
          </div>
          <button onclick="window.ceoDashboard.completeTask('${task.id}')"
            style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            完了する
          </button>
        </div>
      `;
    });
    html += '</div>';
    issuedTasks.innerHTML = html;
  }

  completeTask(taskId) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      this.tasks.splice(taskIndex, 1);
      localStorage.setItem('tasks', JSON.stringify(this.tasks));
      this.renderIssuedTasks();
    }
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ceoDashboard = new CEODashboard();
});
