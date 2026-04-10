// =============================================================================
// types/index.ts
// TypeScript Interfaces สำหรับระบบ POS ร้านยำ (Yum2K)
// =============================================================================

// ---------------------------------------------------------------------------
// Enums: ค่าคงที่ของระบบ
// ---------------------------------------------------------------------------

/** บทบาทของผู้ใช้งานในระบบ */
export type UserRole = 'admin' | 'staff'

/** สถานะของออร์เดอร์ */
export type OrderStatus =
  | 'pending'    // รอดำเนินการ
  | 'completed'  // เสร็จสมบูรณ์
  | 'cancelled'  // ยกเลิกแล้ว
  | 'refunded'   // คืนเงินแล้ว

/** สถานะการ Sync กับ Server */
export type SyncStatus =
  | 'pending'   // รอ Sync
  | 'syncing'   // กำลัง Sync
  | 'synced'    // Sync สำเร็จ
  | 'failed'    // Sync ล้มเหลว

/** ประเภทของการชำระเงิน */
export type PaymentMethod =
  | 'cash'          // เงินสด
  | 'promptpay'     // พร้อมเพย์
  | 'card'          // บัตรเครดิต/เดบิต
  | 'other'         // อื่นๆ
  | 'unpaid'        // ยังไม่ชำระเงิน (ค้างจ่าย)

/** ประเภทของ Inventory Mapping */
export type InventoryMappingType =
  | 'bundle'     // ขายแบบชุด (ตัดสต็อกหลายรายการพร้อมกัน)
  | 'promotion'  // โปรโมชัน (เช่น ซื้อ 10 แถม 1 → ตัด 11 ชิ้น)
  | 'variant'    // สินค้าที่มีตัวเลือก (เช่น ขนาด, รสชาติ)

// ---------------------------------------------------------------------------
// Base Interface: คุณสมบัติพื้นฐานที่ทุก Entity มี
// ---------------------------------------------------------------------------

/** คุณสมบัติพื้นฐานสำหรับทุก Record ในระบบ */
export interface BaseEntity {
  id?: number            // Primary Key (Auto-increment โดย Dexie)
  uuid: string           // UUID สำหรับ Sync กับ Server
  createdAt: Date        // วันเวลาที่สร้าง
  updatedAt: Date        // วันเวลาที่แก้ไขล่าสุด
  isDeleted: boolean     // Soft Delete (ไม่ลบจริง เพื่อ Sync)
}

// ---------------------------------------------------------------------------
// User: ข้อมูลผู้ใช้งาน
// ---------------------------------------------------------------------------

/** ข้อมูลผู้ใช้งานในระบบ */
export interface User extends BaseEntity {
  username: string       // ชื่อผู้ใช้สำหรับ Login
  passwordHash: string   // รหัสผ่านที่ Hash แล้ว (bcrypt หรือ SHA-256)
  displayName: string    // ชื่อที่แสดงในระบบ
  role: UserRole         // บทบาท: admin หรือ staff
  pin?: string           // PIN 4 หลัก สำหรับ Quick Login บน Tablet
  avatarUrl?: string     // URL รูปโปรไฟล์
  isActive: boolean      // สถานะบัญชี (เปิด/ปิดใช้งาน)
  lastLoginAt?: Date     // เวลา Login ล่าสุด
}

// ---------------------------------------------------------------------------
// Category: หมวดหมู่สินค้า
// ---------------------------------------------------------------------------

/** หมวดหมู่สินค้า */
export interface Category extends BaseEntity {
  name: string           // ชื่อหมวดหมู่ (เช่น "ยำ", "ข้าว", "เครื่องดื่ม")
  parentId?: number      // FK -> Category.id (สำหรับหมวดหมู่ย่อย)
  parentUuid?: string    // UUID ของหมวดหมู่หลัก (สำหรับ Sync)
  description?: string   // คำอธิบายหมวดหมู่
  iconUrl?: string       // URL ไอคอนหมวดหมู่
  color?: string         // สีประจำหมวดหมู่ (Hex เช่น "#FF5733")
  sortOrder: number      // ลำดับการแสดงผล
  isActive: boolean      // แสดง/ซ่อนหมวดหมู่
}

// ---------------------------------------------------------------------------
// Inventory Mapping: การตัดสต็อกแบบกำหนดเอง
// ---------------------------------------------------------------------------

/**
 * การ Mapping ระหว่างสินค้าที่ขายกับสินค้าหลักที่ต้องตัดสต็อก
 * 
 * ตัวอย่าง: สินค้า "โปร 10 แถม 1 (ยำมะม่วง)"
 *   - เมื่อขาย 1 ชุด → ตัดสต็อก "ยำมะม่วง" จำนวน 11 ชิ้น
 * 
 * ตัวอย่าง: สินค้า "เซ็ตยำรวมมิตร"
 *   - เมื่อขาย 1 เซ็ต → ตัดสต็อก "ยำมะม่วง" 1 + "ยำวุ้นเส้น" 1 + "ยำทะเล" 1
 */
export interface InventoryMapping {
  sourceProductId: number   // ID ของสินค้า "หลัก" ที่จะถูกตัดสต็อก
  quantity: number          // จำนวนที่ต้องตัดสต็อกของสินค้าหลัก
}

// ---------------------------------------------------------------------------
// Product: สินค้า
// ---------------------------------------------------------------------------

/** ข้อมูลสินค้า */
export interface Product extends BaseEntity {
  categoryId: number          // FK → Category.id
  sku?: string                // รหัสสินค้า (Stock Keeping Unit)
  name: string                // ชื่อสินค้า (เช่น "ยำมะม่วง", "โปร 10 แถม 1")
  description?: string        // คำอธิบายสินค้า
  imageUrl?: string           // URL รูปสินค้า

  // --- ราคา ---
  salePrice: number           // ราคาขาย (บาท)
  costPrice: number           // ราคาต้นทุน (Default = 60% ของ salePrice)

  // --- สต็อก ---
  stockQuantity: number       // จำนวนสต็อกปัจจุบัน
  alertThreshold: number      // แจ้งเตือนเมื่อสต็อกต่ำกว่าค่านี้ (Default = 10)
  trackInventory: boolean     // เปิด/ปิดการติดตามสต็อก

  // --- Inventory Mapping ---
  /**
   * ประเภทของ Mapping (null = สินค้าปกติ ตัดสต็อกตัวเอง)
   * - bundle: เซ็ตสินค้า (ตัดสต็อกหลายรายการ)
   * - promotion: โปรโมชัน (ตัดสต็อกสินค้าหลักมากกว่า 1 ชิ้น)
   */
  mappingType?: InventoryMappingType

  /**
   * รายการสินค้าหลักที่ต้องตัดสต็อกเมื่อขายสินค้านี้
   * เก็บเป็น JSON Array ใน IndexedDB
   * null = ตัดสต็อกตัวเอง (สินค้าปกติ)
   */
  inventoryMappings?: InventoryMapping[]

  // --- Add-ons ---
  /** กลุ่มของตัวเลือกเพิ่มเติม (เช่น ระดับความเผ็ด, ท็อปปิ้ง) */
  addonGroups?: AddonGroup[]

  isActive: boolean           // แสดง/ซ่อนสินค้าในหน้าขาย
  sortOrder: number           // ลำดับการแสดงผล
}

// ---------------------------------------------------------------------------
// Add-ons: ตัวเลือกสินค้า และกลุ่มตัวเลือก
// ---------------------------------------------------------------------------

/** ตัวเลือกย่อย (เช่น "ปูม้า", "+20 บาท") */
export interface AddonOption {
  id: string
  name: string       // ชื่อตัวเลือก
  price: number      // ราคาที่บวกเพิ่ม (ถ้ามี)
}

/** กลุ่มตัวเลือก (เช่น "ท็อปปิ้ง", "ความเผ็ด") */
export interface AddonGroup {
  id: string
  name: string       // ชื่อกลุ่ม
  isRequired: boolean // บังคับเลือกอย่างน้อย 1 อันหรือไม่
  maxSelect?: number  // จำนวนที่เลือกได้สูงสุด (เช่น เลือกได้ไม่เกิน 2 อย่าง)
  options: AddonOption[]
}

// ---------------------------------------------------------------------------
// Order Item: รายการสินค้าในออร์เดอร์
// ---------------------------------------------------------------------------

/**
 * รายการสินค้าแต่ละชิ้นในออร์เดอร์
 * ใช้สำหรับแสดงรายละเอียดว่าขายอะไรไปบ้าง
 */
export interface OrderItem {
  productId: number           // FK → Product.id (Local)
  productUuid: string         // UUID สำหรับเชื่อมโยงข้ามเครื่อง
  categoryId: number          // FK → Category.id (Snippet)
  categoryUuid: string        // UUID ของหมวดหมู่
  productName: string         // ชื่อสินค้า (Snapshot ณ เวลาที่ขาย)
  productSku?: string         // รหัสสินค้า (Snapshot)

  quantity: number            // จำนวนที่ขาย (ในหน่วยของสินค้านี้ เช่น 1 ชุดโปร)
  unitPrice: number           // ราคาต่อหน่วย ณ เวลาที่ขาย
  costPrice: number           // ราคาต้นทุน ณ เวลาที่ขาย (สำหรับคำนวณกำไร)
  discount: number            // ส่วนลดต่อรายการ (บาท)
  
  // --- Addons ---
  addons?: AddonOption[]      // ตัวเลือกเสริมที่ลูกค้าเลือก (Snapshot)
  addonsTotal: number         // ราคารวมของท็อปปิ้ง/ตัวเลือกในรายการนี้

  totalPrice: number          // ราคารวมของรายการนี้ = ((unitPrice + addonsTotal) * quantity) - discount

  // --- Inventory Snapshot: บันทึกว่าตัดสต็อกอะไรไปจริงๆ ---
  /**
   * รายละเอียดการตัดสต็อกที่เกิดขึ้นจริง
   * สำหรับ Audit Trail และการตรวจสอบย้อนหลัง
   * เช่น โปร 10 แถม 1 → [{ sourceProductId: 5, quantity: 11 }]
   */
  inventoryDeductions: InventoryDeduction[]
}

/**
 * บันทึกการตัดสต็อกจริงที่เกิดขึ้นในแต่ละ OrderItem
 * ใช้ตรวจสอบว่า Order นี้ตัดสต็อกสินค้าหลักไปกี่ชิ้น
 */
export interface InventoryDeduction {
  sourceProductId: number     // ID ของสินค้าหลักที่ถูกตัดสต็อก
  sourceProductUuid: string   // UUID ของสินค้าหลัก
  sourceProductName: string   // ชื่อสินค้าหลัก (Snapshot)
  quantityDeducted: number    // จำนวนที่ตัดสต็อกจริง
}

// ---------------------------------------------------------------------------
// Order: ออร์เดอร์ / Transaction
// ---------------------------------------------------------------------------

/** ออร์เดอร์การขาย (Transaction หลัก) */
export interface Order extends BaseEntity {
  // --- การระบุตัวตน ---
  orderNumber: string         // เลขที่ออร์เดอร์ (เช่น "YUM-20260406-0001")
  serverId?: number           // ID จาก Server หลังจาก Sync สำเร็จ

  // --- ผู้เกี่ยวข้อง ---
  staffId: number             // FK → User.id (พนักงานที่ขาย)
  staffUuid: string           // FK → pos_users.uuid (สำหรับขึ้น Supabase)
  staffName: string           // ชื่อพนักงาน (Snapshot)

  // --- รายการสินค้า ---
  items: OrderItem[]          // รายการสินค้าในออร์เดอร์ (เก็บเป็น JSON)

  // --- ยอดเงิน ---
  subtotal: number            // ยอดรวมก่อนส่วนลดและภาษี
  discountAmount: number      // ส่วนลดรวม (บาท)
  taxRate: number             // อัตราภาษี (% เช่น 7)
  taxAmount: number           // ภาษีรวม (บาท)
  totalAmount: number         // ยอดสุทธิที่ต้องชำระ
  totalCost: number           // ต้นทุนรวม (สำหรับคำนวณกำไร)
  profitAmount: number        // กำไรรวม = totalAmount - totalCost

  // --- การชำระเงิน ---
  paymentMethod: PaymentMethod  // วิธีชำระเงิน
  amountReceived: number      // จำนวนเงินที่รับมา
  changeAmount: number        // เงินทอน
  cashDenominations?: Record<string, number> // รายละเอียดธนบัตร/เหรียญ (เช่น {"20": 2, "10": 1})

  // --- สถานะ ---
  status: OrderStatus         // สถานะออร์เดอร์
  note?: string               // หมายเหตุ
  deliveryRef?: string        // เลขอ้างอิงของ Delivery (Grab, LineMan ฯลฯ)

  // --- Sync Status ---
  syncStatus: SyncStatus      // สถานะการ Sync กับ Server
  syncedAt?: Date             // เวลาที่ Sync สำเร็จ
  syncError?: string          // ข้อความ Error ถ้า Sync ล้มเหลว
  syncRetryCount: number      // จำนวนครั้งที่ลอง Sync (สำหรับ Retry Logic)
}

// ---------------------------------------------------------------------------
// Sync Queue: คิวสำหรับ Sync ข้อมูลขึ้น Server
// ---------------------------------------------------------------------------

/** ประเภทของ Entity ที่จะ Sync */
export type SyncEntityType = 'order' | 'product' | 'category' | 'user'

/** รายการที่รอ Sync ขึ้น Server */
export interface SyncQueueItem extends BaseEntity {
  entityType: SyncEntityType  // ประเภทของข้อมูลที่จะ Sync
  entityId: number            // ID ของ Record ที่จะ Sync (Local)
  entityUuid: string          // UUID ของ Record (ใช้ Merge กับ Server)
  payload: string             // JSON String ของข้อมูลที่จะส่ง
  syncStatus: SyncStatus      // สถานะการ Sync
  retryCount: number          // จำนวนครั้งที่พยายาม Sync
  lastAttemptAt?: Date        // เวลาที่พยายาม Sync ล่าสุด
  errorMessage?: string       // ข้อความ Error ล่าสุด
}

// ---------------------------------------------------------------------------
// Audit Logs: ประวัติสต็อก
// ---------------------------------------------------------------------------

/** บันทึกประวัติการเปลี่ยนแปลงสต็อก (การปรับมือ/ซิงก์อื่นๆ ที่ไม่ใช่จากออร์เดอร์) */
export interface StockAuditLog extends BaseEntity {
  productId: number
  productName: string        // Snapshot
  changeQuantity: number     // เช่น +10 หรือ -5
  previousQuantity: number   // สต็อกเดิม
  newQuantity: number        // สต็อกใหม่
  reason: 'adjust' | 'void' | 'purchase' | 'loss' | 'other' // เหตุผล
  note?: string              // หมายเหตุพิมพ์เพิ่ม
  staffId: number
  staffName: string
  staffUuid: string          // สำหรับตาราง Supabase
  syncStatus: SyncStatus     // สถานะการ Sync
  syncedAt?: Date            // เวลาที่ Sync สำเร็จ
  syncError?: string         // ข้อความ Error ถ้า Sync ล้มเหลว
  syncRetryCount: number     // จำนวนครั้งที่ลอง Sync
}

// ---------------------------------------------------------------------------
// App Settings: การตั้งค่าระบบ
// ---------------------------------------------------------------------------

/** การตั้งค่าระบบ (เก็บเป็น Key-Value) */
export interface AppSetting {
  key: string                 // ชื่อ Setting (Primary Key)
  value: string               // ค่า Setting (JSON String)
  updatedAt: Date             // วันเวลาที่แก้ไข
}

// ---------------------------------------------------------------------------
// Type Helpers: ประเภทช่วยเหลือสำหรับการสร้าง/แก้ไขข้อมูล
// ---------------------------------------------------------------------------

/** ประเภทสำหรับสร้าง Entity ใหม่ (ไม่มี id, createdAt, updatedAt) */
export type CreateEntity<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

/** ประเภทสำหรับแก้ไข Entity (ทุก Field เป็น Optional ยกเว้น id) */
export type UpdateEntity<T extends BaseEntity> = Partial<Omit<T, 'id'>> & { id: number }

/** ข้อมูล Product พร้อม Category (สำหรับแสดงหน้า POS) */
export interface ProductWithCategory extends Product {
  category: Category
}

/** สรุปยอดขายรายวัน */
export interface DailySummary {
  date: string               // วันที่ (YYYY-MM-DD)
  totalOrders: number        // จำนวนออร์เดอร์ทั้งหมด
  totalRevenue: number       // ยอดขายรวม
  totalCost: number          // ต้นทุนรวม
  totalProfit: number        // กำไรรวม
  totalItemsSold: number     // จำนวนสินค้าที่ขายได้
  paymentBreakdown: {        // แยกตามวิธีชำระเงิน
    cash: number
    promptpay: number
    card: number
    other: number
  }
}
