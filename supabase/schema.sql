-- =============================================================================
-- supabase/schema.sql
-- Database Schema สำหรับ Supabase (PostgreSQL) - ระบบ POS ร้านยำ (Yum2K)
-- รวมศูนย์ข้อมูลทั้งหมด (Master Data, Orders, Stock Audit) ไว้ที่เดียว
-- นำโค้ดนี้ไปรันใน SQL Editor ของ Supabase Dashboard
-- =============================================================================

-- ==========================================
-- 1. เตรียมความพร้อม (ลบตารางเก่าถ้ามี)
-- ==========================================
DROP TABLE IF EXISTS stock_audit_logs CASCADE;
DROP TABLE IF EXISTS stock_audit CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS pos_users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ==========================================
-- 2. ตาราง Profiles (ผู้ใช้งานระบบหลัก / Admin)
-- ผูกกับ auth.users ของ Supabase
-- ==========================================
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE,
  display_name TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  pin         TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  is_deleted  BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. ตาราง Categories (หมวดหมู่สินค้า)
-- ==========================================
CREATE TABLE categories (
  id           BIGSERIAL PRIMARY KEY,
  uuid         UUID UNIQUE NOT NULL,
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

CREATE INDEX idx_categories_uuid ON categories (uuid);

-- ==========================================
-- 4. ตาราง Products (สินค้า)
-- ==========================================
CREATE TABLE products (
  id                  BIGSERIAL PRIMARY KEY,
  uuid                UUID UNIQUE NOT NULL,
  category_uuid       UUID NOT NULL REFERENCES categories(uuid),
  sku                 TEXT,
  name                TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT,
  sale_price          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_price          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity      INT  DEFAULT 0,
  alert_threshold     INT  DEFAULT 10,
  track_inventory     BOOLEAN DEFAULT TRUE,
  mapping_type        TEXT,                         -- 'bundle', 'promotion', 'variant'
  inventory_mappings  JSONB,                        -- [{sourceProductUuid, quantity}]
  addon_groups        JSONB,                        -- รายการตัวเลือกเสริม (Spicy, Topping)
  is_active           BOOLEAN DEFAULT TRUE,
  sort_order          INT  DEFAULT 1,
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_uuid ON products (uuid);
CREATE INDEX idx_products_category_uuid ON products (category_uuid);

-- ==========================================
-- 5. ตาราง pos_users (พนักงานในเครื่อง POS)
-- พนักงานที่ถูกสร้างจากหน้า Admin ของ Tablet
-- ==========================================
CREATE TABLE pos_users (
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

CREATE INDEX idx_pos_users_uuid ON pos_users (uuid);

-- ==========================================
-- 6. ตาราง Orders (ตารางการขาย)
-- ==========================================
CREATE TABLE orders (
  id                  BIGSERIAL PRIMARY KEY,
  uuid                UUID UNIQUE NOT NULL,
  order_number        TEXT UNIQUE NOT NULL,         -- เลขที่บิล (ห้ามซ้ำ)
  staff_uuid          UUID REFERENCES pos_users(uuid), -- พนักงานที่ขาย (จากเครื่อง)
  staff_name          TEXT NOT NULL,                -- Snapshot ชื่อพนักงาน
  subtotal            DECIMAL(10, 2) NOT NULL,
  discount_amount     DECIMAL(10, 2) DEFAULT 0,
  tax_rate            DECIMAL(5, 2) DEFAULT 0,
  tax_amount          DECIMAL(10, 2) DEFAULT 0,
  total_amount        DECIMAL(10, 2) NOT NULL,
  total_cost          DECIMAL(10, 2) NOT NULL,
  profit_amount       DECIMAL(10, 2) NOT NULL,
  payment_method      TEXT NOT NULL,                -- cash, promptpay, etc.
  amount_received     DECIMAL(10, 2) NOT NULL,
  change_amount       DECIMAL(10, 2) NOT NULL,
  status              TEXT NOT NULL,                -- completed, cancelled
  note                TEXT,
  delivery_ref        TEXT,
  cash_denominations  JSONB,                        -- รายละเอียดธนบัตร/เหรียญ (เช่น {"20": 2, "10": 1})
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_uuid ON orders (uuid);
CREATE INDEX idx_orders_order_number ON orders (order_number);

-- ==========================================
-- 7. ตาราง Order Items (รายการสินค้าในบิล)
-- ==========================================
CREATE TABLE order_items (
  id                  BIGSERIAL PRIMARY KEY,
  order_id            BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id          BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name        TEXT NOT NULL,
  product_sku         TEXT,
  quantity            INT NOT NULL,
  unit_price          DECIMAL(10, 2) NOT NULL,
  cost_price          DECIMAL(10, 2) NOT NULL,
  discount            DECIMAL(10, 2) DEFAULT 0,
  total_price         DECIMAL(10, 2) NOT NULL,
  addons              JSONB,                        -- รายการ addons ที่ลูกค้าเลือก
  addons_total        DECIMAL(10, 2) DEFAULT 0,
  inventory_deductions JSONB,                       -- Snapshot การตัดสต็อกจริง
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. ตาราง stock_audit_logs (ประวัติสต็อก)
-- ปรับชื่อให้ตรงตามหน้าจอ Supabase
-- ==========================================
CREATE TABLE stock_audit_logs (
  id                  BIGSERIAL PRIMARY KEY,
  uuid                UUID UNIQUE NOT NULL,
  product_uuid        UUID NOT NULL REFERENCES products(uuid),
  product_name        TEXT NOT NULL,
  change_quantity     INT NOT NULL,
  previous_quantity   INT NOT NULL,
  new_quantity        INT NOT NULL,
  reason              TEXT NOT NULL,                -- adjust, sale, void, etc.
  note                TEXT,
  staff_uuid          UUID NOT NULL,
  staff_name          TEXT NOT NULL,
  is_deleted          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_audit_uuid ON stock_audit_logs (uuid);
CREATE INDEX idx_stock_audit_created_at ON stock_audit_logs (created_at);

-- ==========================================
-- 9. Row Level Security (RLS)
-- ==========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_audit_logs ENABLE ROW LEVEL SECURITY;

-- สร้าง Simple Policy (อนุญาตให้ทุกคนเข้าถึงเพื่อความสะดวกในการ Sync ระหว่างทดสอบ)
-- ในระบบจริงควรจำกัดให้เฉพาะ Authenticated Users
CREATE POLICY "Public Access" ON categories FOR ALL TO public USING (true);
CREATE POLICY "Public Access" ON products FOR ALL TO public USING (true);
CREATE POLICY "Public Access" ON pos_users FOR ALL TO public USING (true);
CREATE POLICY "Public Access" ON profiles FOR ALL TO public USING (true);
CREATE POLICY "Public Access" ON orders FOR ALL TO public USING (true);
CREATE POLICY "Public Access" ON order_items FOR ALL TO public USING (true);
CREATE POLICY "Public Access" ON stock_audit_logs FOR ALL TO public USING (true);
