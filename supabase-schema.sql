-- =====================================================
-- CEO Dashboard - Supabase Database Schema
-- Project: IH-SYSTEM (rhlsimhxmrxpgnafldze)
-- =====================================================

-- =====================================================
-- 1. Organizations (組織)
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. Staff (スタッフ・ユーザー)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  auth_user_id uuid UNIQUE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  temporary_password text,
  has_changed_password boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. Business Channels (事業チャネル)
-- =====================================================
CREATE TABLE IF NOT EXISTS business_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('physical_store', 'product', 'brand')),
  company_name text NOT NULL,
  department_name text,
  product_name text NOT NULL,
  concept text,
  business_hours jsonb,
  phone text,
  email text,
  website_url text,
  instagram_url text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. Stores (店舗)
-- =====================================================
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  business_channel_id uuid REFERENCES business_channels(id) ON DELETE SET NULL,
  name text NOT NULL,
  location text,
  specs jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. Projects (プロジェクト)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  business_channel_id uuid REFERENCES business_channels(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  management_type text CHECK (management_type IN ('course', 'task')),
  deadline date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. KGIs (Key Goal Indicators)
-- =====================================================
CREATE TABLE IF NOT EXISTS kgis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  duration_months int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. KPI Tree Nodes (KPI ツリー)
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_tree_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  parent_node_id uuid REFERENCES kpi_tree_nodes(id) ON DELETE CASCADE,
  level int NOT NULL DEFAULT 1,
  title text NOT NULL,
  description text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  weight numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. Tasks (タスク・マイルストーン)
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deliverables text,
  deadline date,
  assigned_to uuid REFERENCES staff(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  progress_percent int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 9. Routine Tasks (ルーチンタスク)
-- =====================================================
CREATE TABLE IF NOT EXISTS routine_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  assigned_to uuid REFERENCES staff(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 10. Daily Reports (日報)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  content text NOT NULL,
  highlights text,
  challenges text,
  next_actions text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 11. Schedules (スケジュール)
-- =====================================================
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_staff_org ON staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_auth ON staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_stores_org ON stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_kgis_project ON kgis(project_id);
CREATE INDEX IF NOT EXISTS idx_kpi_tree_project ON kpi_tree_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_kpi_tree_parent ON kpi_tree_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_channels_org ON business_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_staff_date ON daily_reports(staff_id, report_date);
CREATE INDEX IF NOT EXISTS idx_schedules_staff_date ON schedules(staff_id, start_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE kgis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Simple policies (本番運用前にカスタマイズ推奨)
-- 認証済みユーザーは同じ organization の データに read/write 可能

CREATE POLICY "Authenticated users can read organizations" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage staff" ON staff
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage business_channels" ON business_channels
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage stores" ON stores
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage projects" ON projects
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage kgis" ON kgis
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage kpi_tree_nodes" ON kpi_tree_nodes
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage tasks" ON tasks
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage routine_tasks" ON routine_tasks
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage daily_reports" ON daily_reports
  FOR ALL USING (true);

CREATE POLICY "Authenticated users can manage schedules" ON schedules
  FOR ALL USING (true);

-- =====================================================
-- Initial Seed Data (オプション)
-- =====================================================

-- 一光建設の組織を作成
INSERT INTO organizations (name, description)
VALUES ('一光建設', 'CEO Dashboard - 経営管理システム')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 完了
-- =====================================================
