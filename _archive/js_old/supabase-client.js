/**
 * Supabase Client Configuration
 * CEO Dashboard - Multi-tenant Database Integration
 */

const SUPABASE_URL = 'https://rhlsimhxmrxpgnafldze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobHNpbWh4bXJ4cGduYWZsZHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDUxMjUsImV4cCI6MjA5NDIyMTEyNX0.yXKopAuzWMgQvU2bpZHBG4tAstYB0LpXFjx6bLCi85w';

/**
 * Initialize Supabase Client
 * Uses native fetch API for simplicity
 */
class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url;
    this.anonKey = anonKey;
    this.currentOrgId = localStorage.getItem('currentOrgId');
    this.authToken = localStorage.getItem('authToken');
  }

  /**
   * Make authenticated request to Supabase
   */
  async request(method, path, body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.anonKey}`,
      'apikey': this.anonKey,
    };

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.url}/rest/v1${path}`, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Supabase API Error: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase request error:', error);
      throw error;
    }
  }

  /**
   * Create Organization
   */
  async createOrganization(name, description) {
    return this.request('POST', '/organizations', {
      name,
      description,
    });
  }

  /**
   * Get Organization by ID
   */
  async getOrganization(orgId) {
    return this.request('GET', `/organizations?id=eq.${orgId}`);
  }

  /**
   * Create User
   */
  async createUser(organizationId, name, email, role = 'staff') {
    return this.request('POST', '/users', {
      organization_id: organizationId,
      name,
      email,
      role,
    });
  }

  /**
   * Create Store
   */
  async createStore(organizationId, name, location, specs) {
    return this.request('POST', '/stores', {
      organization_id: organizationId,
      name,
      location,
      specs,
    });
  }

  /**
   * Get Stores for Organization
   */
  async getStores(organizationId) {
    return this.request('GET', `/stores?organization_id=eq.${organizationId}`);
  }

  /**
   * Create Project
   */
  async createProject(organizationId, storeId, name, description, managementType, deadline) {
    return this.request('POST', '/projects', {
      organization_id: organizationId,
      store_id: storeId,
      name,
      description,
      management_type: managementType,
      deadline,
    });
  }

  /**
   * Get Projects for Organization
   */
  async getProjects(organizationId) {
    return this.request('GET', `/projects?organization_id=eq.${organizationId}`);
  }

  /**
   * Create KGI
   */
  async createKGI(organizationId, projectId, name, description, targetValue, durationMonths) {
    return this.request('POST', '/kgis', {
      organization_id: organizationId,
      project_id: projectId,
      name,
      description,
      target_value: targetValue,
      duration_months: durationMonths,
    });
  }

  /**
   * Create Task (TP - Task Panel)
   */
  async createTask(organizationId, title, description, deliverables, deadline, assignedTo) {
    return this.request('POST', '/tasks', {
      organization_id: organizationId,
      title,
      description,
      deliverables,
      deadline,
      assigned_to: assignedTo,
    });
  }

  /**
   * Get Tasks for Organization
   */
  async getTasks(organizationId) {
    return this.request('GET', `/tasks?organization_id=eq.${organizationId}`);
  }

  /**
   * Update Task Status
   */
  async updateTaskStatus(taskId, status) {
    return this.request('PATCH', `/tasks?id=eq.${taskId}`, {
      status,
    });
  }

  /**
   * Create Routine Task
   */
  async createRoutineTask(organizationId, name, description, frequency) {
    return this.request('POST', '/routine_tasks', {
      organization_id: organizationId,
      name,
      description,
      frequency,
    });
  }

  /**
   * Get Routine Tasks
   */
  async getRoutineTasks(organizationId) {
    return this.request('GET', `/routine_tasks?organization_id=eq.${organizationId}`);
  }

  /**
   * Create KPI Tree Node
   */
  async createKPITreeNode(organizationId, projectId, parentNodeId, level, title, description, targetValue) {
    return this.request('POST', '/kpi_tree_nodes', {
      organization_id: organizationId,
      project_id: projectId,
      parent_node_id: parentNodeId,
      level,
      title,
      description,
      target_value: targetValue,
    });
  }

  /**
   * Get KPI Tree Nodes for Project
   */
  async getKPITreeNodes(projectId) {
    return this.request('GET', `/kpi_tree_nodes?project_id=eq.${projectId}`);
  }

  /**
   * Delete Store
   */
  async deleteStore(storeId) {
    return this.request('DELETE', `/stores?id=eq.${storeId}`);
  }

  /**
   * Delete Task
   */
  async deleteTask(taskId) {
    return this.request('DELETE', `/tasks?id=eq.${taskId}`);
  }

  /**
   * Delete Routine Task
   */
  async deleteRoutineTask(routineTaskId) {
    return this.request('DELETE', `/routine_tasks?id=eq.${routineTaskId}`);
  }

  /**
   * Create KPI Tree from Template
   * テンプレートから複数のKPI ノードを一括作成
   *
   * @param {string} organizationId - 組織ID
   * @param {string} projectId - プロジェクトID
   * @param {string} templateId - テンプレートID
   * @param {object} templateData - KPI_TEMPLATES から取得したテンプレートデータ
   * @returns {array} 作成されたノードの配列
   */
  async createKPITreeFromTemplate(organizationId, projectId, templateData) {
    const createdNodes = [];

    // テンプレートのノードを再帰的に作成
    const createNodeRecursive = async (node, parentNodeId = null) => {
      // ノードを Supabase に作成（children を除いたコピー）
      const nodeData = {
        organization_id: organizationId,
        project_id: projectId,
        parent_node_id: parentNodeId,
        level: node.level,
        title: node.title,
        description: node.description || null,
        target_value: node.target,
        current_value: 0,
        unit: node.unit || null,
        weight: node.weight || null
      };

      try {
        const createdNode = await this.request('POST', '/kpi_tree_nodes', nodeData);
        const nodeId = createdNode[0]?.id || createdNode.id;
        createdNodes.push(createdNode);

        // 子ノードを再帰的に作成
        if (node.children && node.children.length > 0) {
          for (const childNode of node.children) {
            await createNodeRecursive(childNode, nodeId);
          }
        }
      } catch (error) {
        console.error(`Error creating KPI node: ${node.title}`, error);
        throw error;
      }
    };

    // トップレベルノードから開始
    if (templateData.nodes && templateData.nodes.length > 0) {
      for (const topNode of templateData.nodes) {
        await createNodeRecursive(topNode);
      }
    }

    console.log(`Created ${createdNodes.length} KPI tree nodes from template: ${templateData.title}`);
    return createdNodes;
  }

  /**
   * Create Business Channel
   * 事業チャネル（実店舗・プロダクト・ブランド）を作成
   */
  async createBusinessChannel(organizationId, channelType, companyName, departmentName, productName, concept, businessHours, phone, email, websiteUrl, instagramUrl, address, notes) {
    return this.request('POST', '/business_channels', {
      organization_id: organizationId,
      channel_type: channelType,
      company_name: companyName,
      department_name: departmentName,
      product_name: productName,
      concept,
      business_hours: businessHours,
      phone,
      email,
      website_url: websiteUrl,
      instagram_url: instagramUrl,
      address,
      notes,
    });
  }

  /**
   * Get Business Channels for Organization
   */
  async getBusinessChannels(organizationId) {
    return this.request('GET', `/business_channels?organization_id=eq.${organizationId}&order_by=created_at.desc`);
  }

  /**
   * Update Business Channel
   */
  async updateBusinessChannel(channelId, updates) {
    return this.request('PATCH', `/business_channels?id=eq.${channelId}`, updates);
  }

  /**
   * Delete Business Channel
   */
  async deleteBusinessChannel(channelId) {
    return this.request('DELETE', `/business_channels?id=eq.${channelId}`);
  }
}

// Create global Supabase client instance
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabase;
}
