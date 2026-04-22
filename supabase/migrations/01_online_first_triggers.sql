-- =============================================================================
-- SQL Script for Supabase (Online-First Master Data & Triggers)
-- ให้ก๊อปปี้โค้ดทั้งหมดนี้ไปรันใน "SQL Editor" บน Supabase Dashboard
-- =============================================================================

-- =============================================================================
-- ส่วนที่ 1: การกำจัดข้อมูลที่ซ้ำซ้อน และเพิ่ม Unique Constraint
-- คำเตือน: รันคำสั่งนี้ก็ต่อเมื่อแน่ใจว่าลบสินค้าที่ชื่อซ้ำและ SKU ซ้ำออกไปแล้ว!
-- =============================================================================

-- เพิ่ม Unique ให้ sku และ name เพื่อเป็นด่านสุดท้ายไม่ให้มีใครสร้างข้อมูลซ้ำ
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);

-- ตรวจสอบว่าตาราง order_items มี product_uuid หรือยัง (ถ้าแอปส่งไป)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_uuid') THEN
        ALTER TABLE order_items ADD COLUMN product_uuid UUID;
    END IF;
END $$;


-- =============================================================================
-- ส่วนที่ 2: Triggers สำหรับการตัดสต็อกอัตโนมัติจากใบเสร็จ (Orders)
-- =============================================================================

-- ลบฟังก์ชันเดิมถ้ามี
DROP FUNCTION IF EXISTS update_stock_on_order_item CASCADE;

-- สร้างฟังก์ชันการทำงานเมื่อมีข้อมูลเข้า หรือลบออก จาก order_items
CREATE OR REPLACE FUNCTION update_stock_on_order_item()
RETURNS TRIGGER AS $$
BEGIN
  -- กรณีมีการขาย/รับออร์เดอร์เข้า (INSERT) - หักสต็อกและบวกยอดขายรวม
  IF TG_OP = 'INSERT' THEN
    -- อัปเดตสินค้า (ถ้าเชื่อมด้วย UUID ได้ ให้ใช้ UUID)
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity,
        total_sold = total_sold + NEW.quantity
    WHERE uuid = NEW.product_uuid;
    RETURN NEW;
    
  -- กรณีที่มีการยกเลิก หรือมีการดึงกลับเพื่อ Sync ซ้ำ (DELETE) - คืนค่ากลับไป
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + OLD.quantity,
        total_sold = total_sold - OLD.quantity
    WHERE uuid = OLD.product_uuid;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ผูก Trigger เข้ากับตาราง order_items
CREATE TRIGGER trigger_update_stock_order_item
AFTER INSERT OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_order_item();


-- =============================================================================
-- ส่วนที่ 3: Triggers สำหรับการปรับสต็อกย่อย (Stock Audit Logs)
-- =============================================================================

-- ลบฟังก์ชันเดิมถ้ามี
DROP FUNCTION IF EXISTS update_stock_on_audit_log CASCADE;

-- สร้างฟังก์ชันการทำงาน
CREATE OR REPLACE FUNCTION update_stock_on_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  -- กรณีมีประวัติการเบิก จ่าย ทำทิ้ง (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- เอา change_quantity (เป็นได้ทั้ง + และ -) ไปบวกเข้า stock_quantity
    UPDATE products 
    SET stock_quantity = stock_quantity + NEW.change_quantity
    WHERE uuid = NEW.product_uuid;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ผูก Trigger เข้ากับตาราง stock_audit_logs
CREATE TRIGGER trigger_update_stock_audit_log
AFTER INSERT ON stock_audit_logs
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_audit_log();

-- =============================================================================
-- สิ้นสุดคำสั่ง
-- =============================================================================
