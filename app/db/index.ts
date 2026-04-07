// =============================================================================
// db/index.ts
// Dexie.js Database Schema สำหรับระบบ POS ร้านยำ (Yum2K)
// Offline-First: ข้อมูลทั้งหมดเก็บใน IndexedDB ก่อน แล้วค่อย Sync
// =============================================================================

import Dexie, { type EntityTable } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type {
  User,
  Category,
  Product,
  Order,
  SyncQueueItem,
  AppSetting,
  StockAuditLog,
} from '~/types'

// ---------------------------------------------------------------------------
// กำหนด Version ของ Database (เพิ่มทุกครั้งที่เปลี่ยน Schema)
// ---------------------------------------------------------------------------
const DB_VERSION = 2
const DB_NAME = 'Yum2K_POS_DB'

// ---------------------------------------------------------------------------
// Dexie Database Class
// ---------------------------------------------------------------------------

class Yum2KDatabase extends Dexie {
  // กำหนด Tables พร้อม TypeScript Generics
  users!: EntityTable<User, 'id'>
  categories!: EntityTable<Category, 'id'>
  products!: EntityTable<Product, 'id'>
  orders!: EntityTable<Order, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>
  stockAuditLogs!: EntityTable<StockAuditLog, 'id'>

  // AppSettings ใช้ key เป็น Primary Key แทน id
  appSettings!: Dexie.Table<AppSetting, string>

  constructor() {
    super(DB_NAME)

    this.version(DB_VERSION).stores({
      /**
       * users: ผู้ใช้งาน
       * - id: Auto-increment Primary Key
       * - uuid: UUID สำหรับ Sync (Unique)
       * - username: ชื่อผู้ใช้ (Unique)
       * - role: บทบาท (Index สำหรับ Filter)
       * - isActive: สถานะ (Index สำหรับ Filter)
       * - isDeleted: Soft Delete (Index)
       */
      users: '++id, &uuid, &username, role, isActive, isDeleted',

      /**
       * categories: หมวดหมู่สินค้า
       * - id: Auto-increment Primary Key
       * - uuid: UUID สำหรับ Sync (Unique)
       * - isActive: สถานะ (Index)
       * - sortOrder: ลำดับการแสดง (Index สำหรับเรียงลำดับ)
       */
      categories: '++id, &uuid, isActive, sortOrder, isDeleted',

      /**
       * products: สินค้า
       * - id: Auto-increment Primary Key
       * - uuid: UUID สำหรับ Sync (Unique)
       * - categoryId: FK → categories (Index สำหรับ Filter ตามหมวดหมู่)
       * - sku: รหัสสินค้า (Unique แต่ Optional จึงใช้ uuid แทน unique)
       * - isActive: สถานะ (Index)
       * - stockQuantity: จำนวนสต็อก (Index สำหรับ Query สินค้าใกล้หมด)
       * - mappingType: ประเภท Mapping (Index สำหรับ Filter)
       *
       * หมายเหตุ: inventoryMappings เก็บเป็น JSON (ไม่ Index ได้โดยตรง)
       */
      products: '++id, &uuid, categoryId, sku, isActive, sortOrder, stockQuantity, mappingType, isDeleted',

      /**
       * orders: ออร์เดอร์ / Transaction
       * - id: Auto-increment Primary Key
       * - uuid: UUID สำหรับ Sync (Unique)
       * - orderNumber: เลขออร์เดอร์ (Unique)
       * - staffId: FK → users (Index สำหรับ Report แยกพนักงาน)
       * - status: สถานะออร์เดอร์ (Index)
       * - syncStatus: สถานะ Sync (Index สำหรับ Sync Queue)
       * - createdAt: วันเวลา (Index สำหรับ Report รายวัน/เดือน)
       * - paymentMethod: วิธีชำระเงิน (Index)
       *
       * หมายเหตุ: items (OrderItem[]) เก็บเป็น JSON Array ทั้งก้อน
       */
      orders: '++id, &uuid, &orderNumber, staffId, status, syncStatus, createdAt, paymentMethod, isDeleted',

      /**
       * syncQueue: คิวรอ Sync ขึ้น Server
       * - id: Auto-increment Primary Key
       * - uuid: UUID (Unique)
       * - entityType: ประเภท Entity (Index)
       * - entityId: ID ของ Record ที่จะ Sync (Index)
       * - syncStatus: สถานะ Sync (Index หลักสำหรับ Query รายการที่รอ)
       * - retryCount: จำนวนครั้งที่ Retry (Index สำหรับ Max Retry)
       */
      syncQueue: '++id, &uuid, entityType, entityId, syncStatus, retryCount, isDeleted',

      /**
       * appSettings: การตั้งค่าระบบ (Key-Value Store)
       * - key: Primary Key (String)
       */
      appSettings: '&key',

      /**
       * stockAuditLogs: ประวัติการเปลี่ยนสต็อก
       * - id: Auto-increment
       * - uuid: UUID
       * - productId: สินค้าที่ถูกเปลี่ยนสต็อก
       * - staffId: พนักงานที่เปลี่ยน
       * - createdAt: เวลา
       */
      stockAuditLogs: '++id, &uuid, productId, staffId, syncStatus, createdAt, isDeleted',
    })
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

/** Instance ของ Database (ใช้ตลอดทั้งแอป) */
export const db = new Yum2KDatabase()

// ---------------------------------------------------------------------------
// Database Hooks: Middleware สำหรับ Audit Trail
// ---------------------------------------------------------------------------

/**
 * Hook: ตั้งค่า createdAt และ updatedAt อัตโนมัติเมื่อเพิ่มข้อมูลใหม่
 * รองรับ: users, categories, products, orders, syncQueue
 */
const tablesWithTimestamps = ['users', 'categories', 'products', 'orders', 'syncQueue', 'stockAuditLogs']

tablesWithTimestamps.forEach((tableName) => {
  const table = db.table(tableName)

  // Hook: ก่อน Create ใหม่
  table.hook('creating', (_primKey, obj) => {
    const now = new Date()
    obj.createdAt = obj.createdAt ?? now
    obj.updatedAt = now
    obj.isDeleted = obj.isDeleted ?? false
    obj.syncStatus = obj.syncStatus ?? (['orders', 'stockAuditLogs'].includes(tableName) ? 'pending' : undefined)
  })

  // Hook: ก่อน Update
  table.hook('updating', (modifications) => {
    ;(modifications as Record<string, unknown>).updatedAt = new Date()
    return modifications
  })
})

// ---------------------------------------------------------------------------
// Seed Data: Populate Default Users
// ---------------------------------------------------------------------------
db.on('populate', async () => {
  const now = new Date()
  await db.users.bulkAdd([
    {
      uuid: uuidv4(),
      username: 'admin',
      passwordHash: '', // ไม่ได้ใช้เนื่องจากเป็น PIN-based (Local)
      displayName: 'ผู้จัดการ (Admin)',
      role: 'admin',
      pin: '1234',
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      uuid: uuidv4(),
      username: 'staff',
      passwordHash: '',
      displayName: 'พนักงานขาย (Staff)',
      role: 'staff',
      pin: '0000',
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    }
  ])
  console.log('✅ จำลองข้อมูลบัญชีผู้ใช้เริ่มต้นสำเร็จ: Admin(1234), Staff(0000)')
})

// ---------------------------------------------------------------------------
// DB Helper Functions
// ---------------------------------------------------------------------------

/**
 * ล้างข้อมูลทั้งหมดในฐานข้อมูล (ใช้สำหรับ Dev/Testing เท่านั้น)
 * @warning ไม่ควรใช้ใน Production!
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
}

/**
 * ดึง Setting จาก appSettings
 * @param key - ชื่อ Setting
 * @param defaultValue - ค่า Default ถ้าไม่พบ
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await db.appSettings.get(key)
  if (!setting) return defaultValue
  try {
    return JSON.parse(setting.value) as T
  }
  catch {
    return defaultValue
  }
}

/**
 * บันทึก Setting ลง appSettings
 * @param key - ชื่อ Setting
 * @param value - ค่าที่จะบันทึก
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.appSettings.put({
    key,
    value: JSON.stringify(value),
    updatedAt: new Date(),
  })
}

export default db
