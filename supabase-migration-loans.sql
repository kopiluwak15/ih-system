-- Migration: 融資（借入）管理 — 法人ごとに管理
-- CEO専用「融資」ページで使用。companies（法人）にひも付く
-- IH-SYSTEM本体のSupabase（IHMS） SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS loans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,  -- どの法人の借入か
  lender          text NOT NULL,        -- 金融機関
  principal       numeric,              -- 借入額（当初）
  loan_date       date,                 -- 借入日
  interest_rate   numeric,              -- 金利(%)
  monthly_payment numeric,              -- 毎月返済額
  balance         numeric,              -- 現在残高
  status          text DEFAULT 'active' CHECK (status IN ('active','paid')), -- active=返済中 / paid=完済
  note            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_company ON loans (company_id, status);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loans_all" ON loans;
CREATE POLICY "loans_all" ON loans FOR ALL TO anon USING (true) WITH CHECK (true);
