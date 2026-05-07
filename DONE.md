# DONE — Yum2K POS

## บันทึกสต็อกสิ้นวัน (Daily Stock Snapshot)
**หน้า:** `admin/closing-report`

- เพิ่มปุ่ม "📸 บันทึกสต็อกประจำวัน" — บันทึกสต็อกสินค้าทุกรายการ (trackInventory=true) ณ เวลาที่กด
- บันทึกลง IndexedDB offline-first แล้ว Sync ขึ้น Supabase
- แสดงตารางสต็อกพร้อมสี (แดง/เหลือง/เขียว) ด้านล่างปุ่ม
- กดซ้ำวันเดิมได้ (Overwrite)
- ไฟล์ที่เกี่ยวข้อง:
  - `app/types/index.ts` — interface `DailyStockSnapshot`
  - `app/db/index.ts` — ตาราง `dailyStockSnapshots`, DB_VERSION 8
  - `app/composables/useDailyStockSnapshot.ts`
  - `app/pages/admin/closing-report.vue`
  - `supabase/migrations/04_daily_stock_snapshots.sql`
