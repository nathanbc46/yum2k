-- =============================================================================
-- 03_daily_summaries.sql
-- ตารางเก็บประวัติการส่งสรุปยอดขายรายวัน
-- ใช้ป้องกันการส่งซ้ำเมื่อ Cron + Client ทำงานพร้อมกัน
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_summaries (
  id         BIGSERIAL PRIMARY KEY,
  sent_date  DATE UNIQUE NOT NULL,   -- วันที่ส่ง (ห้ามซ้ำ — UNIQUE บล็อก race condition)
  order_count INT DEFAULT 0,
  revenue    DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- service role เท่านั้นที่เขียน/อ่านได้ (ไม่ expose ไปที่ client)
CREATE POLICY "service_role_only" ON daily_summaries
  FOR ALL TO service_role USING (true) WITH CHECK (true);
