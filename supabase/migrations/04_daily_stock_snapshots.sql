-- =============================================================================
-- Migration 04: Daily Stock Snapshots
-- ภาพถ่ายสต็อกสินค้าประจำวัน (1 record ต่อ 1 สินค้า ต่อ 1 วัน)
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_stock_snapshots (
  id                  BIGSERIAL PRIMARY KEY,
  uuid                UUID UNIQUE NOT NULL,

  snapshot_date       DATE NOT NULL,
  product_uuid        UUID NOT NULL,
  product_name        TEXT NOT NULL,
  product_sku         TEXT,

  stock_quantity      INT NOT NULL DEFAULT 0,

  captured_by_uuid    UUID,
  captured_by_name    TEXT,
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_daily_stock_snapshot UNIQUE (snapshot_date, product_uuid)
);

CREATE INDEX IF NOT EXISTS idx_daily_stock_snapshots_date         ON daily_stock_snapshots (snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_stock_snapshots_product_uuid ON daily_stock_snapshots (product_uuid);
CREATE INDEX IF NOT EXISTS idx_daily_stock_snapshots_date_product ON daily_stock_snapshots (snapshot_date, product_uuid);

ALTER TABLE daily_stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access" ON daily_stock_snapshots FOR ALL TO public USING (true);
