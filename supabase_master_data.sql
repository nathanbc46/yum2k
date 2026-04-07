-- =============================================================================
-- Supabase SQL: สร้างตาราง categories และ products สำหรับ Master Data Sync
-- รันใน Supabase Dashboard > SQL Editor
-- =============================================================================

-- ลบของเก่าที่มีโครงสร้างแบบเก่าออกไปก่อน (ข้อมูลใน Cloud จะถูกล้าง แต่เดี๋ยวเรารัน Push จากเครื่องขึ้นไปใหม่ได้)
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- 1. ตาราง categories
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id           BIGSERIAL PRIMARY KEY,
  uuid         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  icon_url     TEXT,
  color        TEXT DEFAULT '#6366f1',
  sort_order   INT  DEFAULT 1,
  is_active    BOOLEAN DEFAULT TRUE,
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index เพื่อเพิ่มความเร็วในการ Query
CREATE INDEX IF NOT EXISTS idx_categories_uuid       ON public.categories (uuid);
CREATE INDEX IF NOT EXISTS idx_categories_is_deleted ON public.categories (is_deleted);

-- 2. ตาราง products
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id                  BIGSERIAL PRIMARY KEY,
  uuid                TEXT UNIQUE NOT NULL,
  category_uuid       TEXT NOT NULL,                -- อ้างอิง categories.uuid
  sku                 TEXT,
  name                TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT,
  sale_price          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_price          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity      INT  DEFAULT 0,
  alert_threshold     INT  DEFAULT 10,
  track_inventory     BOOLEAN DEFAULT TRUE,
  mapping_type        TEXT,                         -- 'bundle' | 'promotion' | 'variant' | null
  inventory_mappings  JSONB,                        -- [{sourceProductUuid, quantity}]
  addon_groups        JSONB,                        -- เก็บบันทึกตัวเลือกเสริมเช่นความเผ็ด หรือท็อปปิ้ง
  is_active           BOOLEAN DEFAULT TRUE,
  sort_order          INT  DEFAULT 1,
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_uuid          ON public.products (uuid);
CREATE INDEX IF NOT EXISTS idx_products_category_uuid ON public.products (category_uuid);
CREATE INDEX IF NOT EXISTS idx_products_is_deleted    ON public.products (is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_is_active     ON public.products (is_active);

-- 3. ตาราง pos_users (พนักงานในระบบ POS ออฟไลน์)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pos_users (
  id                  BIGSERIAL PRIMARY KEY,
  uuid                UUID UNIQUE NOT NULL,
  username            TEXT UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,
  role                TEXT NOT NULL,
  pin                 TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_users_uuid       ON public.pos_users (uuid);
CREATE INDEX IF NOT EXISTS idx_pos_users_username   ON public.pos_users (username);

-- =============================================================================
-- 4. ตาราง stock_audit (ประวัติการปรับสต็อก)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stock_audit (
  id                  BIGSERIAL PRIMARY KEY,
  uuid                UUID UNIQUE NOT NULL,
  product_uuid        TEXT NOT NULL,
  product_name        TEXT NOT NULL,
  change_quantity     INT NOT NULL,
  previous_quantity   INT NOT NULL,
  new_quantity        INT NOT NULL,
  reason              TEXT NOT NULL,
  note                TEXT,
  staff_uuid          TEXT NOT NULL,
  staff_name          TEXT NOT NULL,
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_uuid ON public.stock_audit (uuid);
CREATE INDEX IF NOT EXISTS idx_stock_audit_product_uuid ON public.stock_audit (product_uuid);
CREATE INDEX IF NOT EXISTS idx_stock_audit_created_at ON public.stock_audit (created_at);

-- =============================================================================
-- 5. แก้ไข Constraint ของตาราง orders เดิม (ถอนการผูกกับ auth.profiles ออก)
-- เนื่องจากระบบ POS ใช้ UUID ของ pos_users แทน
-- =============================================================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_staff_id_fkey;

-- 5. Enable Row Level Security (แนะนำสำหรับ Production)
-- =============================================================================
-- ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for authenticated" ON public.categories FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all for authenticated" ON public.products FOR ALL TO authenticated USING (true);

-- หมายเหตุ: inventory_mappings เก็บ UUID ของสินค้าหลัก (ไม่ใช่ local ID)
-- เช่น: [{"sourceProductUuid": "abc-123", "quantity": 11}]
-- ระบบจะ resolve UUID → local ID เมื่อ Sync ลงเครื่อง
