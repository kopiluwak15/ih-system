/**
 * CEO Dashboard App - Supabase Integration
 * Sidebar navigation and page switching logic with backend persistence
 */

class CEODashboard {
  constructor() {
    this.currentPage = 'dashboard';
    this.organizationId = localStorage.getItem('organizationId') || window.CURRENT_ORG_ID;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadInitialData();
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

    // Project Preview Button
    const previewProjectBtn = document.getElementById('previewProjectBtn');
    if (previewProjectBtn) {
      previewProjectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.previewProject();
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

    // Business Management Form
    const businessManagementForm = document.getElementById('businessManagementForm');
    if (businessManagementForm) {
      businessManagementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleBusinessSubmit();
      });
    }

    // Staff Management Form
    const staffManagementForm = document.getElementById('staffManagementForm');
    if (staffManagementForm) {
      staffManagementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleStaffSubmit();
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
      case 'staff-management':
        this.loadStaffManagement();
        break;
      case 'business-management':
        this.loadBusinessManagement();
        break;
      case 'kgi-settings':
        this.loadKGISettings();
        break;
      case 'routine-tasks':
        this.loadRoutineTasks();
        break;
      case 'daily-report':
        this.loadDailyReport();
        break;
      case 'schedule':
        this.loadSchedule();
        break;
    }
  }

  async loadInitialData() {
    try {
      // Try to load from Supabase
      if (typeof supabase !== 'undefined' && this.organizationId) {
        this.stores = await supabase.getStores(this.organizationId) || [];
        this.projects = await supabase.getProjects(this.organizationId) || [];
        this.tasks = await supabase.getTasks(this.organizationId) || [];
        this.routines = await supabase.getRoutineTasks(this.organizationId) || [];
        this.businessChannels = await supabase.getBusinessChannels(this.organizationId) || [];

        console.log('✅ Data loaded from Supabase');
      } else {
        // Fallback to localStorage
        this.stores = JSON.parse(localStorage.getItem('stores')) || [];
        this.projects = JSON.parse(localStorage.getItem('projects')) || [];
        this.routines = JSON.parse(localStorage.getItem('routines')) || [];
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.businessChannels = JSON.parse(localStorage.getItem('businessChannels')) || [];
        console.log('⚠️ Using localStorage (Supabase not available)');
      }

      this.kgis = JSON.parse(localStorage.getItem('kgis')) || [];
      this.staff = JSON.parse(localStorage.getItem('staff')) || [];
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Fallback to localStorage
      this.stores = JSON.parse(localStorage.getItem('stores')) || [];
      this.projects = JSON.parse(localStorage.getItem('projects')) || [];
      this.routines = JSON.parse(localStorage.getItem('routines')) || [];
      this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
      this.kgis = JSON.parse(localStorage.getItem('kgis')) || [];
      this.businessChannels = JSON.parse(localStorage.getItem('businessChannels')) || [];
    }
  }

  // ==================== Dashboard ====================
  loadDashboard() {
    const dashboardContent = document.getElementById('dashboardContent');

    // Load projects with KPI data
    const projects = JSON.parse(localStorage.getItem('projects')) || [];

    if (projects.length === 0) {
      dashboardContent.innerHTML = `
        <div style="padding: 32px; text-align: center; color: #999;">
          <p style="margin: 16px 0;">プロジェクトが登録されると、ここに階層的なKGI進捗が表示されます</p>
          <p style="font-size: 12px;">ホールディングス → 事業セグメント → プロジェクト → KGIツリー</p>
        </div>
      `;
      return;
    }

    let html = '<div style="display: grid; gap: 24px;">';

    // Group projects by organization level
    const hierarchyMap = {};
    projects.forEach(project => {
      const level = project.level || 'プロジェクト';
      if (!hierarchyMap[level]) hierarchyMap[level] = [];
      hierarchyMap[level].push(project);
    });

    // Display hierarchical view
    ['ホールディングス', '事業セグメント', 'プロジェクト'].forEach(level => {
      if (hierarchyMap[level]) {
        html += `
          <div style="border-left: 4px solid #667eea; padding: 16px; background: #f5f7ff; border-radius: 4px;">
            <h3 style="margin: 0 0 12px 0; color: #667eea; font-size: 16px;">📊 ${level}</h3>
            <div style="display: grid; gap: 12px;">
        `;

        hierarchyMap[level].forEach(project => {
          const kgiData = project.kpiTreeData || project.milestones || [];
          const progressPercent = this.calculateProjectProgress(kgiData);

          html += `
            <div style="background: white; padding: 12px; border-radius: 4px; border: 1px solid #e8ebf0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 500; color: #333;">${project.name}</span>
                <span style="font-size: 12px; color: #667eea; font-weight: bold;">${progressPercent.toFixed(0)}%</span>
              </div>
              <div style="height: 6px; background: #e8ebf0; border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); width: ${progressPercent}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="font-size: 11px; color: #999; margin-top: 6px;">
                期限: ${project.deadline || '未設定'} | タイプ: ${project.type === 'course' ? 'KPI設計' : 'マイルストーン'}
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      }
    });

    // Overall status summary
    const totalProjects = projects.length;
    const avgProgress = projects.reduce((sum, p) => sum + this.calculateProjectProgress(p.kpiTreeData || p.milestones || []), 0) / totalProjects;

    html += `
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0;">全体進捗サマリー</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <div style="font-size: 24px; font-weight: bold;">${totalProjects}</div>
            <div style="font-size: 12px; opacity: 0.9;">総プロジェクト数</div>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: bold;">${avgProgress.toFixed(0)}%</div>
            <div style="font-size: 12px; opacity: 0.9;">平均進捗率</div>
          </div>
        </div>
      </div>
    `;

    html += '</div>';
    dashboardContent.innerHTML = html;
  }

  calculateProjectProgress(data) {
    if (!data || data.length === 0) return 0;

    // For KPI tree: calculate as average of target achievement
    if (data[0] && data[0].title) {
      // KPI tree node structure
      const completedCount = data.filter(d => (d.current_value / d.target_value) >= 1).length;
      return (completedCount / data.length) * 100;
    }

    // For milestones: count completed milestones
    const completedCount = data.filter(m => m.completed).length;
    return (completedCount / data.length) * 100;
  }

  // ==================== KGI Management ====================
  async loadKGIManagement() {
    const kgiContent = document.getElementById('kgiContent');

    try {
      // Try to load KPI nodes from Supabase
      let kpiNodes = [];
      if (typeof supabase !== 'undefined' && this.projects.length > 0) {
        for (const project of this.projects) {
          if (project.management_type === 'kpi_tree') {
            try {
              const nodes = await supabase.getKPITreeNodes(project.id);
              kpiNodes = kpiNodes.concat(nodes.map(n => ({ ...n, projectId: project.id, projectName: project.name })));
            } catch (e) {
              console.warn('Failed to load KPI nodes for project:', project.id, e);
            }
          }
        }
      }

      // Load from localStorage as fallback
      const savedKpiNodes = JSON.parse(localStorage.getItem('kpiNodes')) || [];
      if (kpiNodes.length === 0 && savedKpiNodes.length === 0) {
        kgiContent.innerHTML = `
          <p style="color: #999; text-align: center; padding: 32px;">
            KPI ツリーが登録されると、ここに表示されます
          </p>
        `;
        return;
      }

      // Merge Supabase and localStorage data
      const allNodes = kpiNodes.length > 0 ? kpiNodes : savedKpiNodes;

      // Group by project
      const nodesByProject = {};
      allNodes.forEach(node => {
        const projectId = node.projectId || node.project_id;
        if (!nodesByProject[projectId]) {
          nodesByProject[projectId] = [];
        }
        nodesByProject[projectId].push(node);
      });

      // Render KPI trees for each project
      let html = '<div style="display: grid; gap: 24px;">';

      for (const [projectId, nodes] of Object.entries(nodesByProject)) {
        const project = this.projects.find(p => p.id === projectId);
        const projectName = project?.name || 'プロジェクト';

        html += `
          <div style="border: 1px solid var(--border); border-radius: 12px; padding: 24px; background: var(--bg-secondary);">
            <h3 style="margin: 0 0 16px 0; color: var(--text-primary);">${projectName}</h3>
            <div class="kpi-tree" data-project-id="${projectId}">
        `;

        // Build and render tree
        const tree = this.buildKPITree(nodes);
        html += this.renderKPITree(tree, 0);

        html += `
            </div>
          </div>
        `;
      }

      html += '</div>';
      kgiContent.innerHTML = html;

      // Setup interactions
      this.setupKPITreeInteraction();

    } catch (error) {
      console.error('Error loading KGI management:', error);
      kgiContent.innerHTML = `
        <p style="color: #ff6b6b; text-align: center; padding: 32px;">
          KPI ツリーの読み込みに失敗しました
        </p>
      `;
    }
  }

  buildKPITree(nodes) {
    // Build hierarchical structure from flat array
    const nodeMap = {};
    const rootNodes = [];

    // Create map
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
    });

    // Build relationships
    nodes.forEach(node => {
      const parentId = node.parent_node_id || node.parentNodeId;
      if (parentId && nodeMap[parentId]) {
        nodeMap[parentId].children.push(nodeMap[node.id]);
      } else {
        rootNodes.push(nodeMap[node.id]);
      }
    });

    return rootNodes;
  }

  renderKPITree(nodes, level = 0) {
    let html = '';

    nodes.forEach((node, index) => {
      const isExpandable = node.children && node.children.length > 0;
      const nodeId = `kpi-${node.id}`;
      const toggleId = `toggle-${node.id}`;
      const currentValue = node.current_value || 0;
      const targetValue = node.target_value || node.target || 0;
      const progressPercent = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

      html += `
        <div class="kpi-node" data-level="${level}" style="margin-left: ${level * 24}px; margin-top: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${isExpandable ? `
              <button class="kpi-toggle" id="${toggleId}" style="
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px 8px;
                color: var(--primary);
                font-size: 14px;
              ">▶</button>
            ` : `<span style="width: 32px;"></span>`}
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; color: var(--text-primary); font-size: 14px; font-weight: 600;">
                  ${node.title || node.name}
                </h4>
                <span style="color: var(--text-secondary); font-size: 12px;">
                  ${currentValue} / ${targetValue} ${node.unit || ''}
                </span>
              </div>
              <div style="
                height: 6px;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
              ">
                <div style="
                  height: 100%;
                  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
                  width: ${Math.min(progressPercent, 100)}%;
                  transition: width 0.3s ease;
                "></div>
              </div>
              ${node.description ? `
                <p style="margin: 0; color: var(--text-secondary); font-size: 12px;">
                  ${node.description}
                </p>
              ` : ''}
            </div>
          </div>
      `;

      // Render children
      if (isExpandable) {
        html += `
          <div class="kpi-children" id="${nodeId}" style="display: none;">
            ${this.renderKPITree(node.children, level + 1)}
          </div>
        `;
      }

      html += `</div>`;
    });

    return html;
  }

  setupKPITreeInteraction() {
    // Setup expand/collapse functionality
    document.querySelectorAll('.kpi-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const toggleId = e.target.id;
        const nodeId = `kpi-${toggleId.replace('toggle-', '')}`;
        const childrenEl = document.getElementById(nodeId);

        if (childrenEl) {
          const isVisible = childrenEl.style.display !== 'none';
          childrenEl.style.display = isVisible ? 'none' : 'block';
          e.target.textContent = isVisible ? '▶' : '▼';
        }
      });
    });
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
    const storeProjects = this.projects.filter(p => p.store_id === storeId);
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
    // Populate business channels
    const pcBusinessChannel = document.getElementById('pcBusinessChannel');
    pcBusinessChannel.innerHTML = '<option value="">-- 事業チャネルを選択 --</option>';
    if (this.businessChannels && this.businessChannels.length > 0) {
      this.businessChannels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        const label = channel.product_name ? `${channel.product_name} (${channel.company_name})` : `${channel.company_name}`;
        option.textContent = label;
        pcBusinessChannel.appendChild(option);
      });
    }

    // Populate stores
    const pcStore = document.getElementById('pcStore');
    pcStore.innerHTML = '<option value="">-- 店舗を選択 --</option>';
    this.stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store.id;
      option.textContent = store.name;
      pcStore.appendChild(option);
    });

    // Setup project type toggle and interface
    this.setupProjectTypeToggle();
    this.setupKPITreeDesigner();
    this.setupMilestoneDesigner();
  }

  setupProjectTypeToggle() {
    const radios = document.querySelectorAll('.projectTypeRadio');
    const kpiTreeSection = document.getElementById('kpiTreeSection');
    const milestoneSection = document.getElementById('milestoneSection');

    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'course') {
          kpiTreeSection.style.display = 'block';
          milestoneSection.style.display = 'none';
        } else if (e.target.value === 'task') {
          kpiTreeSection.style.display = 'none';
          milestoneSection.style.display = 'block';
        }
      });
    });
  }

  setupKPITreeDesigner() {
    const addChildKPIBtn = document.getElementById('addChildKPIBtn');
    if (addChildKPIBtn) {
      addChildKPIBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.addChildKPIRow();
      });
    }

    // Setup remove buttons for child KPIs
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('removeChildKPI')) {
        e.preventDefault();
        e.target.closest('.child-kpi-row').remove();
      }
    });
  }

  addChildKPIRow() {
    const container = document.getElementById('childKPIsContainer');
    if (!container) return;

    const rowCount = container.querySelectorAll('.child-kpi-row').length + 1;
    const newRow = document.createElement('div');
    newRow.className = 'child-kpi-row';
    newRow.style.cssText = 'margin-bottom: 12px; padding: 12px; background: white; border: 1px solid #ddd; border-radius: 4px;';
    newRow.innerHTML = `
      <input type="text" class="form-input childKPITitle" placeholder="子KPIタイトル（例：既存客単価向上）" style="margin-bottom: 8px;">
      <div style="display: flex; gap: 8px;">
        <input type="text" class="form-input childKPITarget" placeholder="目標値" style="flex: 1;">
        <input type="text" class="form-input childKPIUnit" placeholder="単位" style="flex: 0.5;">
        <button type="button" class="removeChildKPI btn" style="padding: 8px 12px;">削除</button>
      </div>
    `;
    container.appendChild(newRow);
  }

  setupMilestoneDesigner() {
    const addMilestoneBtn = document.getElementById('addMilestoneBtn');
    if (addMilestoneBtn) {
      addMilestoneBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.addMilestoneRow();
      });
    }
  }

  addMilestoneRow() {
    const container = document.getElementById('milestonesContainer');
    if (!container) return;

    const rowCount = container.querySelectorAll('.milestone-row').length + 1;
    const newRow = document.createElement('div');
    newRow.className = 'milestone-row';
    newRow.style.cssText = 'margin-bottom: 16px; padding: 16px; background: #f0f7ff; border-left: 4px solid #2196F3; border-radius: 4px;';
    newRow.innerHTML = `
      <div class="form-group">
        <label class="milestoneName">マイルストーン${rowCount}</label>
        <input type="text" class="form-input milestoneTitle" placeholder="例：要件定義完了" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>期限</label>
          <input type="date" class="form-input milestoneDate" required>
        </div>
        <div class="form-group">
          <label>説明</label>
          <input type="text" class="form-input milestoneDesc" placeholder="詳細説明">
        </div>
        <button type="button" class="removeMilestone btn" style="align-self: flex-end; padding: 8px 12px; margin-bottom: 0;">削除</button>
      </div>
    `;
    container.appendChild(newRow);

    // Setup remove button
    newRow.querySelector('.removeMilestone').addEventListener('click', (e) => {
      e.preventDefault();
      newRow.remove();
    });
  }

  async handleProjectSubmit() {
    const businessChannelId = document.getElementById('pcBusinessChannel').value;
    const projectName = document.getElementById('pcProjectName').value;
    const projectDesc = document.getElementById('pcProjectDesc').value;
    const deadline = document.getElementById('pcDeadline').value;

    const projectType = document.querySelector('input[name="projectType"]:checked')?.value;

    if (!businessChannelId || !projectName || !deadline) {
      alert('事業チャネル、プロジェクト名、期限を入力してください');
      return;
    }

    if (!projectType) {
      alert('プロジェクトタイプ（課題またはタスク）を選択してください');
      return;
    }

    try {
      let projectData = {
        id: 'proj_' + Date.now(),
        business_channel_id: businessChannelId,
        store_id: document.getElementById('pcStore').value || null,
        name: projectName,
        description: projectDesc,
        type: projectType,
        deadline,
        createdAt: new Date().toISOString(),
      };

      // Collect KPI tree data (if course)
      if (projectType === 'course') {
        const kpiRootTitle = document.getElementById('kpiRootTitle').value;
        const kpiRootTarget = document.getElementById('kpiRootTarget').value;
        const kpiRootUnit = document.getElementById('kpiRootUnit').value;

        if (!kpiRootTitle || !kpiRootTarget || !kpiRootUnit) {
          alert('KPI ツリーの最上位 KPI を入力してください');
          return;
        }

        const childKPIs = [];
        document.querySelectorAll('.child-kpi-row').forEach(row => {
          const title = row.querySelector('.childKPITitle').value;
          const target = row.querySelector('.childKPITarget').value;
          const unit = row.querySelector('.childKPIUnit').value;
          if (title && target && unit) {
            childKPIs.push({ title, target, unit });
          }
        });

        projectData.kpiTree = {
          root: {
            title: kpiRootTitle,
            target: kpiRootTarget,
            unit: kpiRootUnit,
          },
          children: childKPIs,
        };
      }

      // Collect milestone data (if task)
      if (projectType === 'task') {
        const milestones = [];
        document.querySelectorAll('.milestone-row').forEach((row, index) => {
          const title = row.querySelector('.milestoneTitle').value;
          const date = row.querySelector('.milestoneDate').value;
          const desc = row.querySelector('.milestoneDesc').value;
          if (title && date) {
            milestones.push({
              order: index + 1,
              title,
              date,
              description: desc
            });
          }
        });

        if (milestones.length === 0) {
          alert('マイルストーンを最低1つ入力してください');
          return;
        }

        projectData.milestones = milestones;
      }

      // Try Supabase first
      if (typeof supabase !== 'undefined' && this.organizationId) {
        await supabase.createProject(
          this.organizationId,
          projectData.store_id,
          projectName,
          projectDesc,
          projectType,
          deadline
        );
        console.log('✅ Project created in Supabase');
      }

      this.projects.push(projectData);
      localStorage.setItem('projects', JSON.stringify(this.projects));

      alert('プロジェクトを作成しました！');
      document.getElementById('projectCreationForm').reset();
      document.getElementById('projectPreview').style.display = 'none';

      // Hide design sections
      document.getElementById('kpiTreeSection').style.display = 'none';
      document.getElementById('milestoneSection').style.display = 'none';
    } catch (error) {
      console.error('Error creating project:', error);
      alert('プロジェクト作成に失敗しました: ' + error.message);
    }
  }

  previewProject() {
    const projectName = document.getElementById('pcProjectName').value;
    const projectDesc = document.getElementById('pcProjectDesc').value;
    const projectType = document.querySelector('input[name="projectType"]:checked')?.value;
    const deadline = document.getElementById('pcDeadline').value;
    const businessChannelId = document.getElementById('pcBusinessChannel').value;

    if (!projectName || !projectType || !deadline) {
      alert('プロジェクト名、タイプ、期限を入力してください');
      return;
    }

    const businessChannel = this.businessChannels.find(ch => ch.id === businessChannelId);
    const channelName = businessChannel?.product_name || businessChannel?.company_name || 'Unknown';

    let previewHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
        <h4>📌 プロジェクト情報</h4>
        <div style="display: grid; gap: 12px; margin-bottom: 20px;">
          <div><strong>名前:</strong> ${projectName}</div>
          <div><strong>タイプ:</strong> ${projectType === 'course' ? '📊 課題（KPI ツリー）' : '📅 タスク（マイルストーン）'}</div>
          <div><strong>事業チャネル:</strong> ${channelName}</div>
          <div><strong>期限:</strong> ${deadline}</div>
          ${projectDesc ? `<div><strong>説明:</strong> ${projectDesc}</div>` : ''}
        </div>
    `;

    // Show KPI tree preview
    if (projectType === 'course') {
      const kpiRootTitle = document.getElementById('kpiRootTitle').value;
      const kpiRootTarget = document.getElementById('kpiRootTarget').value;
      const kpiRootUnit = document.getElementById('kpiRootUnit').value;

      previewHTML += `
        <h4>📊 KPI ツリー</h4>
        <div style="background: #f0f7ff; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <div style="font-weight: 600; color: #2196F3; margin-bottom: 12px;">
            ▶ ${kpiRootTitle}
          </div>
          <div style="margin-left: 24px; font-size: 13px; color: #666;">
            目標: ${kpiRootTarget} ${kpiRootUnit}
          </div>
      `;

      const childKPIs = [];
      document.querySelectorAll('.child-kpi-row').forEach(row => {
        const title = row.querySelector('.childKPITitle').value;
        const target = row.querySelector('.childKPITarget').value;
        const unit = row.querySelector('.childKPIUnit').value;
        if (title && target && unit) {
          childKPIs.push({ title, target, unit });
        }
      });

      if (childKPIs.length > 0) {
        previewHTML += '<div style="margin-top: 12px;">';
        childKPIs.forEach(kpi => {
          previewHTML += `
            <div style="margin-left: 24px; margin-bottom: 8px; font-size: 12px; color: #333;">
              └ ${kpi.title}: ${kpi.target} ${kpi.unit}
            </div>
          `;
        });
        previewHTML += '</div>';
      }

      previewHTML += `</div>`;
    }

    // Show milestone preview
    if (projectType === 'task') {
      previewHTML += `
        <h4>📅 マイルストーン</h4>
        <div style="display: grid; gap: 8px; margin-bottom: 20px;">
      `;

      const milestones = [];
      document.querySelectorAll('.milestone-row').forEach((row, index) => {
        const title = row.querySelector('.milestoneTitle').value;
        const date = row.querySelector('.milestoneDate').value;
        const desc = row.querySelector('.milestoneDesc').value;
        if (title && date) {
          milestones.push({ order: index + 1, title, date, desc });
        }
      });

      if (milestones.length > 0) {
        milestones.forEach((m, idx) => {
          previewHTML += `
            <div style="padding: 12px; background: #f0f7ff; border-left: 3px solid #2196F3; border-radius: 4px;">
              <div style="font-weight: 600; color: #2196F3;">Step ${m.order}: ${m.title}</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">
                期限: ${m.date}
                ${m.desc ? `<br/>説明: ${m.desc}` : ''}
              </div>
            </div>
          `;
        });
      }

      previewHTML += `</div>`;
    }

    previewHTML += `</div>`;

    const previewDiv = document.getElementById('projectPreview');
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = previewHTML;
    previewDiv.style.display = 'block';

    // Scroll to preview
    previewDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  async handleStoreSubmit() {
    const storeName = document.getElementById('storeName').value;
    const storeLocation = document.getElementById('storeLocation').value;
    const storeSpecs = document.getElementById('storeSpecs').value;

    if (!storeName) {
      alert('店舗名を入力してください');
      return;
    }

    try {
      const store = {
        id: 'store_' + Date.now(),
        name: storeName,
        location: storeLocation,
        specs: storeSpecs,
        createdAt: new Date().toISOString(),
      };

      // Try Supabase first
      if (typeof supabase !== 'undefined' && this.organizationId) {
        await supabase.createStore(this.organizationId, storeName, storeLocation, storeSpecs);
      }

      this.stores.push(store);
      localStorage.setItem('stores', JSON.stringify(this.stores));

      alert('店舗を追加しました！');
      document.getElementById('storeSettingsForm').reset();
      this.renderRegisteredStores();
    } catch (error) {
      console.error('Error creating store:', error);
      alert('店舗作成に失敗しました');
    }
  }

  async deleteStore(storeId) {
    if (confirm('この店舗を削除しますか？')) {
      try {
        // Try Supabase first
        if (typeof supabase !== 'undefined') {
          await supabase.deleteStore(storeId);
        }

        this.stores = this.stores.filter(s => s.id !== storeId);
        localStorage.setItem('stores', JSON.stringify(this.stores));
        this.renderRegisteredStores();
      } catch (error) {
        console.error('Error deleting store:', error);
        alert('店舗削除に失敗しました');
      }
    }
  }

  // ==================== Staff Management ====================
  loadStaffManagement() {
    // Populate store dropdown
    const staffStore = document.getElementById('staffStore');
    staffStore.innerHTML = '<option value="">-- 店舗を選択 --</option>';
    this.stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store.id;
      option.textContent = store.name;
      staffStore.appendChild(option);
    });

    this.renderRegisteredStaff();
  }

  renderRegisteredStaff() {
    const registeredStaff = document.getElementById('registeredStaff');
    if (this.staff.length === 0) {
      registeredStaff.innerHTML = '<p style="color: #999;">まだスタッフが登録されていません</p>';
      return;
    }

    let html = '<div style="display: grid; gap: 12px;">';
    this.staff.forEach((member) => {
      const store = this.stores.find(s => s.id === member.storeId);
      const roleLabel = { manager: 'マネージャー', staff: 'スタッフ' }[member.role] || member.role;

      html += `
        <div style="border: 1px solid #e0e0e0; padding: 12px; border-radius: 4px; background: #f9f9f9; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h5 style="margin: 0 0 4px 0;">${member.name}</h5>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${member.email}</p>
            <div style="display: flex; gap: 12px; font-size: 12px; color: #999;">
              <span>ロール: ${roleLabel}</span>
              ${store ? `<span>配属: ${store.name}</span>` : ''}
            </div>
          </div>
          <button onclick="window.ceoDashboard.deleteStaff('${member.id}')"
            style="padding: 6px 12px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">
            削除
          </button>
        </div>
      `;
    });
    html += '</div>';
    registeredStaff.innerHTML = html;
  }

  async handleStaffSubmit() {
    const staffName = document.getElementById('staffName').value;
    const staffEmail = document.getElementById('staffEmail').value;
    const staffRole = document.getElementById('staffRole').value;
    const staffStore = document.getElementById('staffStore').value;

    if (!staffName || !staffEmail || !staffRole) {
      alert('必須項目を入力してください');
      return;
    }

    try {
      const member = {
        id: 'staff_' + Date.now(),
        name: staffName,
        email: staffEmail,
        role: staffRole,
        storeId: staffStore || null,
        createdAt: new Date().toISOString(),
      };

      // Try Supabase first
      if (typeof supabase !== 'undefined' && this.organizationId) {
        await supabase.createUser(this.organizationId, staffName, staffEmail, staffRole);
      }

      this.staff.push(member);
      localStorage.setItem('staff', JSON.stringify(this.staff));

      alert('スタッフを追加しました！');
      document.getElementById('staffManagementForm').reset();
      this.renderRegisteredStaff();
    } catch (error) {
      console.error('Error creating staff member:', error);
      alert('スタッフ作成に失敗しました: ' + error.message);
    }
  }

  async deleteStaff(staffId) {
    if (confirm('このスタッフを削除しますか？')) {
      try {
        this.staff = this.staff.filter(s => s.id !== staffId);
        localStorage.setItem('staff', JSON.stringify(this.staff));
        this.renderRegisteredStaff();
      } catch (error) {
        console.error('Error deleting staff member:', error);
        alert('スタッフ削除に失敗しました');
      }
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

  async handleRoutineTaskSubmit() {
    const taskName = document.getElementById('routineTaskName').value;
    const taskDesc = document.getElementById('routineTaskDesc').value;
    const taskFreq = document.getElementById('routineTaskFreq').value;

    if (!taskName) {
      alert('タスク名を入力してください');
      return;
    }

    try {
      const routine = {
        id: 'routine_' + Date.now(),
        name: taskName,
        description: taskDesc,
        frequency: taskFreq,
        createdAt: new Date().toISOString(),
      };

      // Try Supabase first
      if (typeof supabase !== 'undefined' && this.organizationId) {
        await supabase.createRoutineTask(this.organizationId, taskName, taskDesc, taskFreq);
      }

      this.routines.push(routine);
      localStorage.setItem('routines', JSON.stringify(this.routines));

      alert('ルーティンを追加しました！');
      document.getElementById('routineTaskForm').reset();
      this.renderRegisteredRoutines();
    } catch (error) {
      console.error('Error creating routine task:', error);
      alert('ルーティン作成に失敗しました');
    }
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

  async deleteRoutine(routineId) {
    if (confirm('このルーティンを削除しますか？')) {
      try {
        // Try Supabase first
        if (typeof supabase !== 'undefined') {
          await supabase.deleteRoutineTask(routineId);
        }

        this.routines = this.routines.filter(r => r.id !== routineId);
        localStorage.setItem('routines', JSON.stringify(this.routines));
        this.renderRegisteredRoutines();
      } catch (error) {
        console.error('Error deleting routine:', error);
        alert('ルーティン削除に失敗しました');
      }
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

  async handleTaskPanelSubmit() {
    const tpTitle = document.getElementById('tpTitle').value;
    const tpDesc = document.getElementById('tpDesc').value;
    const tpDeliverables = document.getElementById('tpDeliverables').value;
    const tpDeadline = document.getElementById('tpDeadline').value;
    const tpAssignee = document.getElementById('tpAssignee').value;

    if (!tpTitle || !tpDeadline || !tpAssignee) {
      alert('必須項目を入力してください');
      return;
    }

    try {
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

      // Try Supabase first
      if (typeof supabase !== 'undefined' && this.organizationId) {
        await supabase.createTask(this.organizationId, tpTitle, tpDesc, tpDeliverables, tpDeadline, null);
      }

      this.tasks.push(task);
      localStorage.setItem('tasks', JSON.stringify(this.tasks));

      alert('タスクを発行しました！');
      document.getElementById('taskPanelForm').reset();
      this.renderIssuedTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('タスク作成に失敗しました');
    }
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

  async completeTask(taskId) {
    try {
      // Try Supabase first
      if (typeof supabase !== 'undefined') {
        await supabase.deleteTask(taskId);
      }

      const taskIndex = this.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        this.tasks.splice(taskIndex, 1);
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.renderIssuedTasks();
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('タスク完了に失敗しました');
    }
  }

  // ==================== Business Management ====================
  async loadBusinessManagement() {
    try {
      await this.loadBusinessChannels();
      this.setupBusinessManagementForm();
      this.renderBusinessChannels();
    } catch (error) {
      console.error('Error loading business management:', error);
    }
  }

  async loadBusinessChannels() {
    try {
      if (typeof supabase !== 'undefined' && this.organizationId) {
        this.businessChannels = await supabase.getBusinessChannels(this.organizationId) || [];
        localStorage.setItem('businessChannels', JSON.stringify(this.businessChannels));
      } else {
        this.businessChannels = JSON.parse(localStorage.getItem('businessChannels')) || [];
      }
    } catch (error) {
      console.error('Error loading business channels:', error);
      this.businessChannels = JSON.parse(localStorage.getItem('businessChannels')) || [];
    }
  }

  setupBusinessManagementForm() {
    const form = document.getElementById('businessManagementForm');
    if (!form) return;

    const storeSelect = document.getElementById('bmStoreId');
    if (storeSelect) {
      storeSelect.innerHTML = '<option value="">-- 店舗を選択 --</option>';
      this.stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id || store.name;
        option.textContent = store.name;
        storeSelect.appendChild(option);
      });
    }
  }

  async handleBusinessSubmit() {
    try {
      const form = document.getElementById('businessManagementForm');
      const formData = new FormData(form);

      const businessChannel = {
        id: 'bc_' + Date.now(),
        organization_id: this.organizationId,
        channel_type: document.getElementById('bmChannelType').value,
        company_name: document.getElementById('bmCompanyName').value,
        department_name: document.getElementById('bmDepartmentName').value,
        product_name: document.getElementById('bmProductName').value,
        concept: document.getElementById('bmConcept').value,
        business_hours: document.getElementById('bmBusinessHours').value,
        phone: document.getElementById('bmPhone').value,
        email: document.getElementById('bmEmail').value,
        website_url: document.getElementById('bmWebsite').value,
        instagram_url: document.getElementById('bmInstagram').value,
        address: document.getElementById('bmAddress').value,
        notes: document.getElementById('bmNotes').value,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // Try Supabase first
      if (typeof supabase !== 'undefined') {
        try {
          const result = await supabase.createBusinessChannel(
            this.organizationId,
            businessChannel.channel_type,
            businessChannel.company_name,
            businessChannel.department_name,
            businessChannel.product_name,
            businessChannel.concept,
            businessChannel.business_hours,
            businessChannel.phone,
            businessChannel.email,
            businessChannel.website_url,
            businessChannel.instagram_url,
            businessChannel.address,
            businessChannel.notes
          );
          if (result && result[0]) {
            businessChannel.id = result[0].id;
          }
        } catch (error) {
          console.warn('Supabase insert failed, using localStorage:', error);
        }
      }

      this.businessChannels.push(businessChannel);
      localStorage.setItem('businessChannels', JSON.stringify(this.businessChannels));

      form.reset();
      this.renderBusinessChannels();
    } catch (error) {
      console.error('Error submitting business:', error);
      alert('事業登録に失敗しました');
    }
  }

  renderBusinessChannels() {
    const container = document.getElementById('registeredBusinessChannels');
    if (!container) return;

    if (this.businessChannels.length === 0) {
      container.innerHTML = '<p style="color: #999;">まだ事業が登録されていません</p>';
      return;
    }

    // Group by channel type
    const grouped = {};
    this.businessChannels.forEach(bc => {
      if (!grouped[bc.channel_type]) {
        grouped[bc.channel_type] = [];
      }
      grouped[bc.channel_type].push(bc);
    });

    const typeLabels = {
      'physical_store': '実店舗',
      'product': 'プロダクト',
      'brand': 'ブランド'
    };

    let html = '';
    Object.keys(grouped).forEach(type => {
      html += `<div style="margin-bottom: 24px;">
        <h4 style="color: var(--primary); margin-bottom: 12px;">${typeLabels[type] || type}</h4>`;

      grouped[type].forEach(bc => {
        html += `
          <div style="border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 8px; background: var(--bg-secondary);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div>
                <h5 style="margin: 0 0 4px 0; font-size: 16px; color: var(--text-primary);">${bc.product_name}</h5>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: var(--text-secondary);">${bc.company_name}${bc.department_name ? ' / ' + bc.department_name : ''}</p>
              </div>
              <button onclick="window.ceoDashboard.deleteBusinessChannel('${bc.id}')" style="padding: 4px 12px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
            </div>
            ${bc.concept ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: var(--text-secondary);"><strong>コンセプト:</strong> ${bc.concept}</p>` : ''}
            ${bc.business_hours ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: var(--text-secondary);"><strong>営業時間:</strong> ${bc.business_hours}</p>` : ''}
            ${bc.phone ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: var(--text-secondary);">📞 ${bc.phone}</p>` : ''}
            ${bc.email ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: var(--text-secondary);">✉️ ${bc.email}</p>` : ''}
            ${bc.website_url ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: var(--text-secondary);">🌐 ${bc.website_url}</p>` : ''}
          </div>
        `;
      });

      html += '</div>';
    });

    container.innerHTML = html;
  }

  async deleteBusinessChannel(channelId) {
    if (!confirm('この事業を削除してもよろしいですか？')) {
      return;
    }

    try {
      if (typeof supabase !== 'undefined') {
        try {
          await supabase.deleteBusinessChannel(channelId);
        } catch (error) {
          console.warn('Supabase delete failed, using localStorage:', error);
        }
      }

      this.businessChannels = this.businessChannels.filter(bc => bc.id !== channelId);
      localStorage.setItem('businessChannels', JSON.stringify(this.businessChannels));
      this.renderBusinessChannels();
    } catch (error) {
      console.error('Error deleting business channel:', error);
      alert('削除に失敗しました');
    }
  }

  // KGI Settings Methods
  loadKGISettings() {
    // Populate business channels dropdown
    const kgiBusinessChannel = document.getElementById('kgiBusinessChannel');
    kgiBusinessChannel.innerHTML = '<option value="">-- 事業チャネルを選択 --</option>';
    if (this.businessChannels && this.businessChannels.length > 0) {
      this.businessChannels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        const label = channel.product_name ? `${channel.product_name} (${channel.company_name})` : `${channel.company_name}`;
        option.textContent = label;
        kgiBusinessChannel.appendChild(option);
      });
    }

    // Load KGIs from localStorage
    const kgis = JSON.parse(localStorage.getItem('kgis')) || [];
    const selectedChannelId = kgiBusinessChannel.value;

    if (selectedChannelId) {
      const channelKgi = kgis.find(k => k.businessChannelId === selectedChannelId);
      if (channelKgi) {
        document.getElementById('kgiTitle').value = channelKgi.title || '';
        document.getElementById('kgiDescription').value = channelKgi.description || '';
        document.getElementById('kgiStartDate').value = channelKgi.startDate || '';
        document.getElementById('kgiEndDate').value = channelKgi.endDate || '';

        if (channelKgi.nextKgi) {
          document.getElementById('nextKgiTitle').value = channelKgi.nextKgi.title || '';
          document.getElementById('nextKgiDescription').value = channelKgi.nextKgi.description || '';
          document.getElementById('nextKgiStartDate').value = channelKgi.nextKgi.startDate || '';
          document.getElementById('nextKgiEndDate').value = channelKgi.nextKgi.endDate || '';
        }
      }
    }

    // Setup event handlers
    document.getElementById('kgiBusinessChannel').addEventListener('change', () => this.loadKGISettings());
    document.getElementById('updateKGIBtn').addEventListener('click', () => this.handleKGIUpdate());
    document.getElementById('updateNextKGIBtn').addEventListener('click', () => this.handleNextKGIUpdate());
  }

  handleKGIUpdate() {
    const businessChannelId = document.getElementById('kgiBusinessChannel').value;
    if (!businessChannelId) {
      alert('事業チャネルを選択してください');
      return;
    }

    const kgis = JSON.parse(localStorage.getItem('kgis')) || [];
    let channelKgi = kgis.find(k => k.businessChannelId === businessChannelId);

    if (!channelKgi) {
      channelKgi = { businessChannelId, nextKgi: {} };
      kgis.push(channelKgi);
    }

    channelKgi.title = document.getElementById('kgiTitle').value;
    channelKgi.description = document.getElementById('kgiDescription').value;
    channelKgi.startDate = document.getElementById('kgiStartDate').value;
    channelKgi.endDate = document.getElementById('kgiEndDate').value;
    channelKgi.updatedAt = new Date().toISOString();

    localStorage.setItem('kgis', JSON.stringify(kgis));
    alert('KGIを更新しました！');
  }

  handleNextKGIUpdate() {
    const businessChannelId = document.getElementById('kgiBusinessChannel').value;
    if (!businessChannelId) {
      alert('事業チャネルを選択してください');
      return;
    }

    const kgis = JSON.parse(localStorage.getItem('kgis')) || [];
    let channelKgi = kgis.find(k => k.businessChannelId === businessChannelId);

    if (!channelKgi) {
      channelKgi = { businessChannelId };
      kgis.push(channelKgi);
    }

    if (!channelKgi.nextKgi) {
      channelKgi.nextKgi = {};
    }

    channelKgi.nextKgi.title = document.getElementById('nextKgiTitle').value;
    channelKgi.nextKgi.description = document.getElementById('nextKgiDescription').value;
    channelKgi.nextKgi.startDate = document.getElementById('nextKgiStartDate').value;
    channelKgi.nextKgi.endDate = document.getElementById('nextKgiEndDate').value;
    channelKgi.updatedAt = new Date().toISOString();

    localStorage.setItem('kgis', JSON.stringify(kgis));
    alert('ネクストKGIを更新しました！');
  }

  // Routine Tasks Methods
  loadRoutineTasks() {
    const form = document.getElementById('routineTaskForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRoutineTaskSubmit();
      });
    }
    this.renderRoutineTasks();
  }

  handleRoutineTaskSubmit() {
    const title = document.getElementById('rtTitle').value;
    const description = document.getElementById('rtDescription').value;
    const frequency = document.getElementById('rtFrequency').value;
    const day = document.getElementById('rtDay').value;
    const time = document.getElementById('rtTime').value;

    if (!title || !frequency) {
      alert('タスク名と実施頻度を入力してください');
      return;
    }

    const routines = JSON.parse(localStorage.getItem('routines')) || [];
    const routine = {
      id: 'rt_' + Date.now(),
      title,
      description,
      frequency,
      day,
      time,
      createdAt: new Date().toISOString()
    };

    routines.push(routine);
    localStorage.setItem('routines', JSON.stringify(routines));
    alert('ルーティンを登録しました！');
    document.getElementById('routineTaskForm').reset();
    this.renderRoutineTasks();
  }

  renderRoutineTasks() {
    const routines = JSON.parse(localStorage.getItem('routines')) || [];
    const container = document.getElementById('routinesList');

    if (!container) return;

    if (routines.length === 0) {
      container.innerHTML = '<p style="color: #999;">ルーティンが登録されると表示されます</p>';
      return;
    }

    let html = '<div style="display: grid; gap: 16px;">';
    routines.forEach(routine => {
      html += `
        <div style="padding: 16px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #4a90e2;">
          <h4 style="margin: 0 0 8px 0;">${routine.title}</h4>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${routine.description || ''}</p>
          <div style="display: flex; gap: 16px; font-size: 12px; color: #999;">
            <span>📅 ${routine.frequency}${routine.day ? ' (' + routine.day + ')' : ''}</span>
            ${routine.time ? `<span>🕐 ${routine.time}</span>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // Daily Report Methods
  loadDailyReport() {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    const drDate = document.getElementById('drDate');
    if (drDate) drDate.value = today;

    // Populate project dropdown
    const drProject = document.getElementById('drProject');
    if (drProject) {
      drProject.innerHTML = '<option value="">-- プロジェクトを選択 --</option>';
      if (this.projects && this.projects.length > 0) {
        this.projects.forEach(project => {
          const option = document.createElement('option');
          option.value = project.id;
          option.textContent = project.name;
          drProject.appendChild(option);
        });
      }
    }

    const form = document.getElementById('dailyReportForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDailyReportSubmit();
      });
    }
    this.renderDailyReports();
  }

  handleDailyReportSubmit() {
    const date = document.getElementById('drDate').value;
    const projectId = document.getElementById('drProject').value;
    const kgiProgress = parseInt(document.getElementById('drKgiProgress').value) || 0;
    const milestoneProgress = parseInt(document.getElementById('drMilestoneProgress').value) || 0;
    const kpiProgress = parseInt(document.getElementById('drKpiProgress').value) || 0;
    const notes = document.getElementById('drNotes').value;

    if (!date || !projectId) {
      alert('報告日とプロジェクトを選択してください');
      return;
    }

    const reports = JSON.parse(localStorage.getItem('dailyReports')) || [];
    const report = {
      id: 'dr_' + Date.now(),
      date,
      projectId,
      kgiProgress,
      milestoneProgress,
      kpiProgress,
      notes,
      createdAt: new Date().toISOString()
    };

    reports.push(report);
    localStorage.setItem('dailyReports', JSON.stringify(reports));
    alert('日報を報告しました！');
    document.getElementById('dailyReportForm').reset();
    this.loadDailyReport();
  }

  renderDailyReports() {
    const reports = JSON.parse(localStorage.getItem('dailyReports')) || [];
    const container = document.getElementById('reportsList');

    if (!container) return;

    if (reports.length === 0) {
      container.innerHTML = '<p style="color: #999;">日報が登録されると表示されます</p>';
      return;
    }

    // Show last 5 reports
    const recentReports = reports.slice(-5).reverse();
    let html = '<div style="display: grid; gap: 12px;">';
    recentReports.forEach(report => {
      const project = this.projects?.find(p => p.id === report.projectId);
      html += `
        <div style="padding: 12px; background: #f9f9f9; border-radius: 6px; border-left: 3px solid #4a90e2; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${project?.name || 'プロジェクト'}</strong>
            <span style="color: #999;">${report.date}</span>
          </div>
          <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 12px;">
            <span>KGI: ${report.kgiProgress}%</span>
            <span>MS: ${report.milestoneProgress}%</span>
            <span>KPI: ${report.kpiProgress}%</span>
          </div>
          ${report.notes ? `<p style="margin: 8px 0 0 0; color: #666;">${report.notes}</p>` : ''}
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // ==================== Schedule Management ====================
  loadSchedule() {
    const scheduleContent = document.getElementById('scheduleContent');
    const staff = JSON.parse(localStorage.getItem('staff')) || [];
    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];

    if (staff.length === 0) {
      scheduleContent.innerHTML = `
        <div style="padding: 32px; text-align: center; color: #999;">
          <p>スタッフ管理ページでスタッフを登録してください</p>
        </div>
      `;
      return;
    }

    // Create schedule UI
    let html = `
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">スケジュール期間</label>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <input type="date" id="scheduleStartDate" class="form-input" style="flex: 1;" value="${new Date().toISOString().split('T')[0]}">
          <input type="date" id="scheduleEndDate" class="form-input" style="flex: 1;" value="${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}">
          <button id="scheduleFilterBtn" class="btn btn-primary">表示</button>
        </div>
      </div>

      <div style="overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
          <thead>
            <tr style="background: #f5f7ff; border-bottom: 2px solid #667eea;">
              <th style="padding: 12px; text-align: left; border-right: 1px solid #e0e0e0;">スタッフ</th>
              <th style="padding: 12px; text-align: center; border-right: 1px solid #e0e0e0; min-width: 100px;">ステータス</th>
              <th style="padding: 12px; text-align: left;">スケジュール</th>
            </tr>
          </thead>
          <tbody>
    `;

    const today = new Date();
    const startDate = new Date(document.getElementById('scheduleStartDate')?.value || today);
    const endDate = new Date(document.getElementById('scheduleEndDate')?.value || new Date(today.getTime() + 7*24*60*60*1000));

    staff.forEach((person, idx) => {
      const personSchedules = schedules.filter(s => s.staffId === person.id);
      const statusColor = this.getScheduleStatusColor(personSchedules, startDate, endDate);

      let scheduleText = '未登録';
      if (personSchedules.length > 0) {
        const upcoming = personSchedules.filter(s => new Date(s.date) >= startDate && new Date(s.date) <= endDate);
        if (upcoming.length > 0) {
          scheduleText = upcoming.map(s => `${s.date}: ${s.note || 'スケジュール'}`).join(' | ');
        }
      }

      html += `
        <tr style="border-bottom: 1px solid #e0e0e0; ${idx % 2 === 0 ? 'background: #fafbfc;' : ''}">
          <td style="padding: 12px; border-right: 1px solid #e0e0e0;">
            <div style="font-weight: 500; color: #333;">${person.name}</div>
            <div style="font-size: 12px; color: #999;">${person.role || ''}${person.store ? ' - ' + person.store : ''}</div>
          </td>
          <td style="padding: 12px; text-align: center; border-right: 1px solid #e0e0e0;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; background: ${statusColor.bg}; color: ${statusColor.text}; font-weight: 500;">
              ${statusColor.label}
            </span>
          </td>
          <td style="padding: 12px; color: #666; font-size: 12px;">
            ${scheduleText}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f5f7ff; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #667eea;">スケジュール登録</h3>
        <form id="scheduleAddForm" style="display: grid; gap: 12px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500;">スタッフ</label>
              <select id="scheduleStaffSelect" class="form-input" required>
                <option value="">-- スタッフを選択 --</option>
                ${staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500;">日付</label>
              <input type="date" id="scheduleDate" class="form-input" required>
            </div>
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500;">内容・メモ</label>
            <input type="text" id="scheduleNote" class="form-input" placeholder="例：マネージャー会議、出張、休暇">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">スケジュール追加</button>
        </form>
      </div>
    `;

    scheduleContent.innerHTML = html;

    // Set up event listeners
    document.getElementById('scheduleAddForm')?.addEventListener('submit', (e) => this.handleScheduleSubmit(e));
    document.getElementById('scheduleFilterBtn')?.addEventListener('click', () => this.loadSchedule());
  }

  getScheduleStatusColor(schedules, startDate, endDate) {
    if (schedules.length === 0) {
      return { label: '未登録', bg: '#f0f0f0', text: '#999' };
    }

    const upcoming = schedules.filter(s => new Date(s.date) >= startDate && new Date(s.date) <= endDate);
    if (upcoming.length > 0) {
      return { label: '予定あり', bg: '#e8f5e9', text: '#2e7d32' };
    }

    return { label: '予定なし', bg: '#fff3e0', text: '#f57f17' };
  }

  handleScheduleSubmit(e) {
    e.preventDefault();
    const staffId = document.getElementById('scheduleStaffSelect').value;
    const date = document.getElementById('scheduleDate').value;
    const note = document.getElementById('scheduleNote').value;

    if (!staffId || !date) {
      alert('スタッフと日付を選択してください');
      return;
    }

    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    schedules.push({
      id: Date.now().toString(),
      staffId,
      date,
      note,
      createdAt: new Date().toISOString()
    });

    localStorage.setItem('schedules', JSON.stringify(schedules));
    e.target.reset();
    this.loadSchedule();
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ceoDashboard = new CEODashboard();
});
