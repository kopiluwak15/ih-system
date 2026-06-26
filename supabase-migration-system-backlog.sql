-- Migration: システムバックログ（将来仕組み化するシンクタンク）
-- CEO専用「閲覧」ページの「システムバックログ」タブで使用
-- IH-SYSTEM本体のSupabase（IHMS） SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS system_backlog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content         text NOT NULL,
  created_by      uuid,                       -- 入力したスタッフのid
  created_by_name text,                       -- 表示用（誰が入力したか）
  status          text DEFAULT 'active',      -- active=未着手 / archived=着手済み
  created_at      timestamptz DEFAULT now(),  -- いつ入力したか
  archived_at     timestamptz,                -- 着手（アーカイブ）日時
  archived_by     uuid
);

CREATE INDEX IF NOT EXISTS idx_system_backlog_status ON system_backlog (status, created_at DESC);

-- RLS（このプロジェクトの他テーブルと同様に anon フルアクセス）
ALTER TABLE system_backlog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_backlog_all" ON system_backlog;
CREATE POLICY "system_backlog_all" ON system_backlog FOR ALL TO anon USING (true) WITH CHECK (true);
