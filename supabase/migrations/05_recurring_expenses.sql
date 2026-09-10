-- Migration 05: recurring_expenses table + expenses enhancements
-- สร้างตาราง recurring_expenses และเพิ่ม column ที่ขาดใน expenses

-- ============================================================
-- 1. เพิ่ม column ที่ขาดใน expenses
-- ============================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_expense_uuid UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2);

-- Compound unique index — ป้องกัน cron สร้างรายจ่ายซ้ำสำหรับ template เดียวกัน
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_recurring_date
  ON expenses (recurring_expense_uuid, expense_date)
  WHERE recurring_expense_uuid IS NOT NULL;

-- ============================================================
-- 2. สร้างตาราง recurring_expenses (เก็บ template รายจ่ายประจำ)
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_expenses (
  uuid              UUID PRIMARY KEY,
  frequency         TEXT NOT NULL,              -- 'daily' | 'monthly'
  day_of_month      INTEGER,                    -- 1-28 สำหรับ monthly
  is_active         BOOLEAN DEFAULT true,
  amount            DECIMAL(12,2) NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT,                       -- legacy
  category_uuid     UUID,                       -- FK -> expense_categories.uuid
  vendor            TEXT,
  unit              TEXT,
  quantity          DECIMAL(10,2),
  last_generated_date DATE,
  is_deleted        BOOLEAN DEFAULT false,
  sync_status       TEXT DEFAULT 'synced',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active
  ON recurring_expenses (is_active, is_deleted);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_access" ON recurring_expenses
  FOR ALL TO authenticated USING (true);
