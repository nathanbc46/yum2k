-- =============================================================================
-- 02_bank_transfers.sql
-- ตารางเก็บข้อมูลการโอนเงินเข้าจาก LINE Webhook (KTB Connext, SCB Connect)
-- รองรับ Realtime subscription จาก POS frontend
-- =============================================================================

CREATE TABLE IF NOT EXISTS bank_transfers (
  id          BIGSERIAL PRIMARY KEY,
  amount      DECIMAL(12, 2) NOT NULL,
  bank_name   TEXT,                    -- 'KTB', 'SCB', 'KBANK', etc.
  note        TEXT,                    -- ข้อความสรุป เช่น "เงินโอนเข้า"
  raw_message TEXT,                    -- ข้อความ LINE ต้นฉบับ
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: service role insert ได้, authenticated user อ่านได้
ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_bank_transfers" ON bank_transfers
  FOR SELECT TO authenticated USING (true);

-- Enable Realtime (ต้องทำในหน้า Supabase Dashboard > Database > Replication ด้วย)
ALTER PUBLICATION supabase_realtime ADD TABLE bank_transfers;
