/**
 * Supabase Client
 * IH-SYSTEM v2 - 経営構造化管理システム
 */

const SUPABASE_URL = 'https://rhlsimhxmrxpgnafldze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobHNpbWh4bXJ4cGduYWZsZHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDUxMjUsImV4cCI6MjA5NDIyMTEyNX0.yXKopAuzWMgQvU2bpZHBG4tAstYB0LpXFjx6bLCi85w';

class SupabaseAPI {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_ANON_KEY;
  }

  async request(method, path, body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Prefer': 'return=representation'
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${this.url}/rest/v1${path}`, options);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase ${method} ${path}: ${err}`);
    }
    return res.status === 204 ? null : await res.json();
  }

  // ===== Staff =====
  async getStaffByEmail(email) {
    const data = await this.request('GET', `/staff?email=eq.${encodeURIComponent(email)}`);
    return data[0] || null;
  }

  async getAllStaff() {
    return this.request('GET', '/staff?order=created_at.asc');
  }

  async createStaff(data) {
    return this.request('POST', '/staff', data);
  }

  async updateStaff(id, data) {
    return this.request('PATCH', `/staff?id=eq.${id}`, data);
  }

  async deleteStaff(id) {
    return this.request('DELETE', `/staff?id=eq.${id}`);
  }

  // ===== Companies =====
  async getCompanies() {
    return this.request('GET', '/companies?order=display_order.asc');
  }

  async createCompany(data) {
    return this.request('POST', '/companies', data);
  }

  async updateCompany(id, data) {
    return this.request('PATCH', `/companies?id=eq.${id}`, data);
  }

  async deleteCompany(id) {
    return this.request('DELETE', `/companies?id=eq.${id}`);
  }

  // ===== Business Units =====
  async getBusinessUnits(companyId = null) {
    const filter = companyId ? `?company_id=eq.${companyId}&order=display_order.asc` : '?order=display_order.asc';
    return this.request('GET', `/business_units${filter}`);
  }

  async createBusinessUnit(data) {
    return this.request('POST', '/business_units', data);
  }

  async updateBusinessUnit(id, data) {
    return this.request('PATCH', `/business_units?id=eq.${id}`, data);
  }

  async deleteBusinessUnit(id) {
    return this.request('DELETE', `/business_units?id=eq.${id}`);
  }

  // ===== Projects =====
  async getProjects(filter = {}) {
    let query = '?order=created_at.desc';
    if (filter.business_unit_id) query += `&business_unit_id=eq.${filter.business_unit_id}`;
    if (filter.status) query += `&status=eq.${filter.status}`;
    if (filter.assigned_to) query += `&assigned_to=eq.${filter.assigned_to}`;
    return this.request('GET', `/projects${query}`);
  }

  async getProject(id) {
    const data = await this.request('GET', `/projects?id=eq.${id}`);
    return data[0] || null;
  }

  async createProject(data) {
    return this.request('POST', '/projects', data);
  }

  async updateProject(id, data) {
    return this.request('PATCH', `/projects?id=eq.${id}`, data);
  }

  async deleteProject(id) {
    return this.request('DELETE', `/projects?id=eq.${id}`);
  }

  // ===== KPIs =====
  async getKPIs(projectId) {
    return this.request('GET', `/kpis?project_id=eq.${projectId}&order=created_at.asc`);
  }

  async createKPI(data) {
    return this.request('POST', '/kpis', data);
  }

  async updateKPI(id, data) {
    return this.request('PATCH', `/kpis?id=eq.${id}`, data);
  }

  async deleteKPI(id) {
    return this.request('DELETE', `/kpis?id=eq.${id}`);
  }

  // ===== Milestones =====
  async getMilestones(projectId) {
    return this.request('GET', `/milestones?project_id=eq.${projectId}&order=display_order.asc`);
  }

  async createMilestone(data) {
    return this.request('POST', '/milestones', data);
  }

  async updateMilestone(id, data) {
    return this.request('PATCH', `/milestones?id=eq.${id}`, data);
  }

  async deleteMilestone(id) {
    return this.request('DELETE', `/milestones?id=eq.${id}`);
  }

  // ===== Daily Logs =====
  async getDailyLogs(filter = {}) {
    let query = '?order=log_date.desc,created_at.desc';
    if (filter.project_id) query += `&project_id=eq.${filter.project_id}`;
    if (filter.staff_id) query += `&staff_id=eq.${filter.staff_id}`;
    if (filter.log_date) query += `&log_date=eq.${filter.log_date}`;
    return this.request('GET', `/daily_logs${query}`);
  }

  async createDailyLog(data) {
    return this.request('POST', '/daily_logs', data);
  }

  // ===== Stickies (付箋) =====
  async getStickies(staffId, status = null) {
    let q = `?staff_id=eq.${staffId}&order=created_at.desc`;
    if (status) q += `&status=eq.${status}`;
    return this.request('GET', `/stickies${q}`);
  }
  async createSticky(data) {
    return this.request('POST', '/stickies', data);
  }
  async updateSticky(id, data) {
    return this.request('PATCH', `/stickies?id=eq.${id}`, data);
  }
  async deleteSticky(id) {
    return this.request('DELETE', `/stickies?id=eq.${id}`);
  }

  // ===== Timeline Slots =====
  async getTimelineSlots(staffId, date) {
    return this.request('GET', `/timeline_slots?staff_id=eq.${staffId}&schedule_date=eq.${date}&order=start_minutes.asc`);
  }
  async createTimelineSlot(data) {
    return this.request('POST', '/timeline_slots', data);
  }
  async updateTimelineSlot(id, data) {
    return this.request('PATCH', `/timeline_slots?id=eq.${id}`, data);
  }
  async deleteTimelineSlot(id) {
    return this.request('DELETE', `/timeline_slots?id=eq.${id}`);
  }
  async deleteTimelineSlotsByDate(staffId, date) {
    return this.request('DELETE', `/timeline_slots?staff_id=eq.${staffId}&schedule_date=eq.${date}`);
  }

  // ===== Daily Reports (構造化日報) =====
  async getDailyReports(filter = {}) {
    let query = '?order=report_date.desc,created_at.desc';
    if (filter.staff_id) query += `&staff_id=eq.${filter.staff_id}`;
    if (filter.report_date) query += `&report_date=eq.${filter.report_date}`;
    if (filter.date_from) query += `&report_date=gte.${filter.date_from}`;
    return this.request('GET', `/daily_reports${query}`);
  }

  async createDailyReport(data) {
    return this.request('POST', '/daily_reports', data);
  }

  async updateDailyReport(id, data) {
    return this.request('PATCH', `/daily_reports?id=eq.${id}`, data);
  }

  async deleteDailyReport(id) {
    return this.request('DELETE', `/daily_reports?id=eq.${id}`);
  }

  // ===== Task Instructions =====
  async getTaskInstructions(filter = {}) {
    let query = '?order=created_at.desc';
    if (filter.assigned_to) query += `&assigned_to=eq.${filter.assigned_to}`;
    if (filter.status) query += `&status=eq.${filter.status}`;
    return this.request('GET', `/task_instructions${query}`);
  }

  async createTaskInstruction(data) {
    return this.request('POST', '/task_instructions', data);
  }

  async updateTaskInstruction(id, data) {
    return this.request('PATCH', `/task_instructions?id=eq.${id}`, data);
  }

  async deleteTaskInstruction(id) {
    return this.request('DELETE', `/task_instructions?id=eq.${id}`);
  }

  // ===== Routine Tasks =====
  async getRoutineTasks(filter = {}) {
    let query = '?order=created_at.desc';
    if (filter.cycle) query += `&cycle=eq.${filter.cycle}`;
    if (filter.assigned_to) query += `&assigned_to=eq.${filter.assigned_to}`;
    if (filter.is_active !== undefined) query += `&is_active=eq.${filter.is_active}`;
    return this.request('GET', `/routine_tasks${query}`);
  }

  async createRoutineTask(data) {
    return this.request('POST', '/routine_tasks', data);
  }

  async updateRoutineTask(id, data) {
    return this.request('PATCH', `/routine_tasks?id=eq.${id}`, data);
  }

  async deleteRoutineTask(id) {
    return this.request('DELETE', `/routine_tasks?id=eq.${id}`);
  }

  // ===== Routine Logs =====
  async getRoutineLogs(routineTaskId) {
    return this.request('GET', `/routine_logs?routine_task_id=eq.${routineTaskId}&order=log_date.desc,created_at.desc`);
  }

  async createRoutineLog(data) {
    return this.request('POST', '/routine_logs', data);
  }

  async deleteRoutineLog(id) {
    return this.request('DELETE', `/routine_logs?id=eq.${id}`);
  }

  // ===== Notifications =====
  async getNotifications(recipientId) {
    return this.request('GET', `/notifications?recipient_id=eq.${recipientId}&order=created_at.desc&limit=50`);
  }

  async getUnreadCount(recipientId) {
    const data = await this.request('GET', `/notifications?recipient_id=eq.${recipientId}&is_read=eq.false`);
    return data.length;
  }

  async createNotification(data) {
    return this.request('POST', '/notifications', data);
  }

  async markNotificationRead(id) {
    return this.request('PATCH', `/notifications?id=eq.${id}`, { is_read: true });
  }
}

const db = new SupabaseAPI();
