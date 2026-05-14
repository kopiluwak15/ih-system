-- =====================================================
-- IH-SYSTEM v2 - 経営構造化管理システム
-- 階層: 会社 → 事業/店舗/プロダクト → 課題 → KPI/Milestone → 日報
-- =====================================================

-- 既存テーブルを削除（新スキーマで作り直し）
DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS kpis CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS business_units CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

-- 既存の不要テーブルも削除
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS business_channels CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS kgis CASCADE;
DROP TABLE IF EXISTS kpi_tree_nodes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS routine_tasks CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- =====================================================
-- 1. staff (スタッフ・ユーザー)
-- =====================================================
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('ceo', 'manager', 'staff')),
  is_first_login boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. companies (会社) - IH / IE / IF / Stylus 等
-- =====================================================
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. business_units (事業/店舗/プロダクト)
-- =====================================================
CREATE TABLE business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('store', 'product', 'department', 'service')),
  description text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. projects (課題)
-- =====================================================
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id uuid REFERENCES business_units(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  solution_type text NOT NULL CHECK (solution_type IN ('kpi', 'milestone')),
  status text NOT NULL DEFAULT 'pending_design' CHECK (
    status IN ('pending_design', 'pending_approval', 'active', 'completed', 'paused')
  ),
  deadline date,
  created_by uuid REFERENCES staff(id),
  assigned_to uuid REFERENCES staff(id),
  approved_by uuid REFERENCES staff(id),
  approved_at timestamptz,
  progress_percent int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. kpis (KPI - 数値目標)
-- =====================================================
CREATE TABLE kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text,
  start_value numeric DEFAULT 0,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  target_date date,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. milestones (マイルストーン - チェックポイント)
-- =====================================================
CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. daily_logs (日報 - プロジェクトに紐づく行動記録)
-- =====================================================
CREATE TABLE daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  action_content text NOT NULL,
  kpi_id uuid REFERENCES kpis(id) ON DELETE SET NULL,
  kpi_value_change numeric,
  milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  milestone_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. notifications (通知)
-- =====================================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_project', 'design_submitted', 'project_approved', 'daily_log_added')),
  title text NOT NULL,
  message text,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_business_units_company ON business_units(company_id);
CREATE INDEX idx_projects_business_unit ON projects(business_unit_id);
CREATE INDEX idx_projects_assigned ON projects(assigned_to);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_kpis_project ON kpis(project_id);
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_daily_logs_project ON daily_logs(project_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(log_date);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);

-- =====================================================
-- Row Level Security (シンプル設定 - 後で強化)
-- =====================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON staff FOR ALL USING (true);
CREATE POLICY "allow_all" ON companies FOR ALL USING (true);
CREATE POLICY "allow_all" ON business_units FOR ALL USING (true);
CREATE POLICY "allow_all" ON projects FOR ALL USING (true);
CREATE POLICY "allow_all" ON kpis FOR ALL USING (true);
CREATE POLICY "allow_all" ON milestones FOR ALL USING (true);
CREATE POLICY "allow_all" ON daily_logs FOR ALL USING (true);
CREATE POLICY "allow_all" ON notifications FOR ALL USING (true);

-- =====================================================
-- 初期データ
-- =====================================================

-- CEO アカウント (パスワード: ceo123 - ログイン後に変更)
INSERT INTO staff (email, password_hash, name, role, is_first_login) VALUES
  ('kuroda@ikkou-e.com', 'ceo123', 'CEO 黒田', 'ceo', true);

-- 会社
INSERT INTO companies (name, code, description, display_order) VALUES
  ('一鴻ホールディングス', 'IH', '不動産・経営管理', 1),
  ('IE エンターテインメント', 'IE', 'COOKIE for MEN / SKC など', 2),
  ('IF フードサービス', 'IF', 'obanzai / 郷彩 根っこ など', 3),
  ('Stylus', 'STY', '誰でもYouTuber / 生前葬 / SaaS など', 4);

-- 事業/店舗/プロダクト
WITH ih AS (SELECT id FROM companies WHERE code = 'IH'),
     ie AS (SELECT id FROM companies WHERE code = 'IE'),
     if_co AS (SELECT id FROM companies WHERE code = 'IF'),
     sty AS (SELECT id FROM companies WHERE code = 'STY')
INSERT INTO business_units (company_id, name, code, type, description, display_order) VALUES
  ((SELECT id FROM ih), '経営管理', 'IH-KEIEI', 'department', '経営管理部門', 1),
  ((SELECT id FROM ie), 'COOKIE for MEN', 'CFM', 'store', 'メンズ専門サロン', 1),
  ((SELECT id FROM ie), '縮毛矯正＆髪質改善 COOKIE熊本', 'SKC', 'store', '熊本の縮毛矯正専門店', 2),
  ((SELECT id FROM if_co), 'obanzai', 'OBZ', 'store', '日本料理 おばんざい', 1),
  ((SELECT id FROM if_co), '郷彩 根っこ', 'NEK', 'store', '郷土料理 根っこ', 2),
  ((SELECT id FROM sty), '誰でもYouTuber', 'YT', 'service', 'YouTube制作支援', 1),
  ((SELECT id FROM sty), '生前葬', 'SBS', 'service', '生前葬プロデュース', 2),
  ((SELECT id FROM sty), '映像制作', 'VID', 'service', '映像制作事業', 3),
  ((SELECT id FROM sty), 'システム開発', 'DEV', 'service', 'システム開発受託', 4),
  ((SELECT id FROM sty), 'SaaS事業', 'SAAS', 'product', '自社SaaSプロダクト', 5);
