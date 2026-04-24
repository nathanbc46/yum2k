// =============================================================================
// composables/useMasterDataSync.ts
// Sync ข้อมูล Master Data (Categories & Products) ขึ้น/ลง Supabase
//
// กลยุทธ์:
//   PUSH (ขึ้น Cloud) → ใช้ uuid เป็น Conflict Key (Upsert)
//   PULL (ลงเครื่อง)  → ดึงทุกรายการ เปรียบเทียบ updatedAt ก่อน Merge
//
// InventoryMappings: แปลง sourceProductId (local) ↔ sourceProductUuid (cloud)
//   เพื่อรองรับการ Sync ข้ามอุปกรณ์
// =============================================================================

import { db, getSetting, setSetting } from '~/db'
import type { Category, Product, User, UserRole, StockAuditLog } from '~/types'
import { hashSHA256, isAlreadyHashed } from '~/utils/crypto'

// --- Global State ---
const isSyncingMaster = ref(false)
const lastMasterSyncAt = ref<Date | null>(null)
const masterSyncError = ref<string | null>(null)

/** รหัสเวลาสำหรับการ Pull ล่าสุด (ใช้เป็น Signal ให้หน้าต่างๆ Refresh) */
const lastPullTimestamp = ref(0)

const SETTING_KEY_PUSH = 'last_master_push_at'
const SETTING_KEY_PULL = 'last_master_pull_at'
const SETTING_KEY_STOCK_PULL = 'last_stock_pull_at'

export function useMasterDataSync() {
  // -----------------------------------------------------------------------
  // Helpers: Sync Timestamps
  // -----------------------------------------------------------------------
  async function getLastPushAt(): Promise<Date | null> {
    const val = await getSetting<string | null>(SETTING_KEY_PUSH, null)
    return val ? new Date(val) : null
  }

  async function getLastPullAt(): Promise<Date | null> {
    const val = await getSetting<string | null>(SETTING_KEY_PULL, null)
    return val ? new Date(val) : null
  }

  async function updateLastPushAt(date: Date) {
    await setSetting(SETTING_KEY_PUSH, date.toISOString())
  }

  async function updateLastPullAt(date: Date) {
    await setSetting(SETTING_KEY_PULL, date.toISOString())
  }
  // -----------------------------------------------------------------------
  // PUSH: ดันข้อมูล LOCAL → CLOUD (ตอนนี้เหลือแค่ Transactional Data เช่น Stock Logs)
  // -----------------------------------------------------------------------

  /**
   * Push ประวัติการปรับสต็อก (Stock Audit Logs) ทั้งหมดขึ้น Supabase
   * โดยจะส่งเฉพาะรายการที่ยังไม่ได้ซิงค์ (syncStatus != 'synced') 
   * หรือถ้า force=true จะส่งทั้งหมดที่มีการเปลี่ยนแปลงหลังจาก lastPushAt
   */
  async function pushStockAuditLogs(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const lastPushAt = force ? null : await getLastPushAt()

    let query = db.stockAuditLogs.toCollection()
    
    // ตั้งค่าสูงสุดในการลองใหม่ (เหมือนใน useSync.ts)
    const MAX_RETRY_COUNT = 5

    // ถ้าไม่ใช่ Force ให้ซิงค์เฉพาะที่ยังไม่สำเร็จและยังไม่เกินโควต้าลองใหม่
    if (!force) {
      query = db.stockAuditLogs.where('syncStatus').anyOf(['pending', 'failed'])
        .filter(log => (log.syncRetryCount || 0) < MAX_RETRY_COUNT)
    } else if (lastPushAt) {
      query = db.stockAuditLogs.where('updatedAt').above(lastPushAt)
    }

    const localLogs = await query.toArray()
    if (localLogs.length === 0) return 0

    // ดึงข้อมูลสินค้าทั้งหมดเพื่อสร้าง Map สำหรับแปลง ID -> UUID
    const allProds = await db.products.toArray()
    const prodIdToUuid = new Map(allProds.map(p => [p.id!, p.uuid]))

    // เตรียม Payload
    const payload = localLogs.map(log => ({
      uuid: log.uuid,
      product_uuid: prodIdToUuid.get(log.productId),
      product_name: log.productName,
      change_quantity: log.changeQuantity,
      previous_quantity: log.previousQuantity,
      new_quantity: log.newQuantity,
      reason: log.reason,
      note: log.note,
      staff_uuid: log.staffUuid,
      staff_name: log.staffName,
      is_deleted: log.isDeleted,
      created_at: log.createdAt.toISOString(),
      updated_at: new Date().toISOString()
    }))

    // แบ่งชุดละ 100 รายการเพื่อป้องกัน Payload ใหญ่เกินไป
    const chunkSize = 100
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize)
      const { error } = await supabase
        .from('stock_audit_logs')
        .upsert(chunk, { onConflict: 'uuid' })

      if (error) {
        // อัปเดตสถานะล้มเหลวและเพิ่มจำนวนครั้งที่ลอง
        for (const log of localLogs) {
           await db.stockAuditLogs.update(log.id!, {
             syncStatus: 'failed',
             syncRetryCount: (log.syncRetryCount || 0) + 1,
             syncError: error.message
           })
        }
        throw error
      }
    }

    // อัปเดตสถานะใน Local DB
    const now = new Date()
    for (const log of localLogs) {
      await db.stockAuditLogs.update(log.id!, {
        syncStatus: 'synced',
        syncedAt: now,
        syncError: undefined
      })
    }

    console.log(`✅ Push Stock Logs สำเร็จ: ${localLogs.length} รายการ`)
    return localLogs.length
  }

  /**
   * Push ข้อมูลพนักงาน (Users) ทั้งหมดขึ้น Supabase
   * ใช้สำหรับกรณีเริ่มต้นระบบ (Seed) หรือกรณี Force Sync เพื่อให้ข้อมูลบน Cloud เป็นปัจจุบัน
   */
  async function pushUsers(): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const allUsers = await db.users.toArray()
    if (allUsers.length === 0) return 0

    const payload = allUsers.map(u => ({
      uuid:         u.uuid,
      username:     u.username,
      display_name: u.displayName,
      role:         u.role,
      pin:          u.pin,
      is_active:    u.isActive,
      is_deleted:   u.isDeleted,
      updated_at:   u.updatedAt.toISOString(),
    }))

    const { error } = await supabase.from('pos_users').upsert(payload, { onConflict: 'uuid' })
    if (error) {
      console.error('❌ Push Users ล้มเหลว:', error)
      throw new Error(`ไม่สามารถส่งข้อมูลพนักงานขึ้น Cloud ได้: ${error.message}`)
    }

    console.log(`✅ Push Users สำเร็จ: ${allUsers.length} รายการ`)
    return allUsers.length
  }

  // -----------------------------------------------------------------------
  // PULL: ดึงข้อมูล CLOUD → LOCAL
  // -----------------------------------------------------------------------

  /**
   * Pull หมวดหมู่จาก Supabase ลงเครื่อง (Merge by uuid)
   */
  async function pullCategories(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const lastPullAt = force ? null : await getLastPullAt()

    let query = supabase.from('categories').select('*')
    if (lastPullAt) {
      query = query.gt('updated_at', lastPullAt.toISOString())
    }

    const { data: remoteCats, error } = await query
      .order('sort_order', { ascending: true })

    if (error) throw new Error(`Pull Categories ล้มเหลว: ${error.message}`)
    if (!remoteCats?.length) return 0

    let count = 0
    for (const remote of remoteCats) {
      let existing = await db.categories.where('uuid').equals(remote.uuid).first()
      if (!existing) {
        existing = await db.categories.where('name').equals(remote.name).first()
      }

      const remoteUpdatedAt = new Date(remote.updated_at)
      if (existing && new Date(existing.updatedAt) >= remoteUpdatedAt) continue

      const localCategory: Omit<Category, 'id'> = {
        uuid:        remote.uuid,
        name:        remote.name,
        description: remote.description ?? undefined,
        iconUrl:     remote.icon_url ?? undefined,
        color:       remote.color ?? '#6366f1',
        sortOrder:   remote.sort_order,
        parentUuid:  remote.parent_uuid ?? undefined,
        isActive:    remote.is_active,
        isDeleted:   remote.is_deleted,
        createdAt:   new Date(remote.created_at),
        updatedAt:   remoteUpdatedAt,
      }

      if (existing?.id) {
        await db.categories.update(existing.id, { ...localCategory, uuid: remote.uuid })
      } else {
        await db.categories.add(localCategory as Category)
      }
      count++
    }

    // --- Second Pass: เชื่อมโยง parentId จาก parentUuid ---
    if (count > 0 || force) {
      const allCats = await db.categories.toArray()
      const uuidToId = new Map(allCats.map(c => [c.uuid, c.id!]))
      
      for (const cat of allCats) {
        if (cat.parentUuid) {
          const parentId = uuidToId.get(cat.parentUuid)
          if (parentId && cat.parentId !== parentId) {
            // ส่ง updatedAt ไปด้วยเพื่อเลี่ยง Hook (ไม่ให้ระบบคิดว่าเราแก้เองแล้ว Push กลับ)
            await db.categories.update(cat.id!, { parentId, updatedAt: cat.updatedAt })
          }
        } else if (cat.parentId) {
          await db.categories.update(cat.id!, { parentId: undefined as any, updatedAt: cat.updatedAt })
        }
      }
    }

    return count
  }

  /**
   * Pull สินค้าจาก Supabase ลงเครื่อง (Merge by uuid)
   */
  async function pullProducts(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const lastPullAt = force ? null : await getLastPullAt()

    let query = supabase.from('products').select('*')
    if (lastPullAt) {
      query = query.gt('updated_at', lastPullAt.toISOString())
    }

    const { data: remoteProds, error } = await query
      .order('sort_order', { ascending: true })

    if (error) throw new Error(`Pull Products ล้มเหลว: ${error.message}`)
    if (!remoteProds?.length) return 0

    const localCats = await db.categories.toArray()
    const catUuidToId = new Map(localCats.map(c => [c.uuid, c.id!]))

    const localProds = await db.products.toArray()
    const prodUuidToId = new Map(localProds.map(p => [p.uuid, p.id!]))

    // --- First Pass: Upsert สินค้าเบื้องต้น (ยังไม่เชื่อม Mapping) ---
    let count = 0
    for (const remote of remoteProds) {
      let existing = await db.products.where('uuid').equals(remote.uuid).first()
      if (!existing) {
        if (remote.sku) {
          existing = await db.products.where('sku').equals(remote.sku).first()
        }
        if (!existing) {
          existing = await db.products.where('name').equals(remote.name).first()
        }
      }

      const remoteUpdatedAt = new Date(remote.updated_at)
      if (existing && new Date(existing.updatedAt) >= remoteUpdatedAt) continue

      const categoryId = catUuidToId.get(remote.category_uuid)
      if (!categoryId) {
        console.warn(`⚠️ ไม่พบหมวดหมู่ uuid=${remote.category_uuid} สำหรับสินค้า "${remote.name}" — ข้าม`)
        continue
      }

      // บันทึก Log เพื่อตรวจสอบข้อมูล Addon
      let addonData = remote.addon_groups
      if (typeof addonData === 'string') {
        try { addonData = JSON.parse(addonData) } catch (e) { addonData = undefined }
      }

      const localProduct: Omit<Product, 'id'> = {
        uuid:               remote.uuid,
        categoryId,
        sku:                remote.sku ?? undefined,
        name:               remote.name,
        description:        remote.description ?? undefined,
        salePrice:          Number(remote.sale_price),
        costPrice:          Number(remote.cost_price),
        stockQuantity:      Number(remote.stock_quantity),
        alertThreshold:     Number(remote.alert_threshold),
        trackInventory:     remote.track_inventory,
        mappingType:        remote.mapping_type ?? undefined,
        // สำคัญ: รอบแรกห้ามใส่ Mappings เพราะสินค้าปลายทางอาจยังไม่มีในเครื่อง
        inventoryMappings:  undefined,
        addonGroups:        Array.isArray(addonData) ? addonData : undefined,
        isActive:           remote.is_active,
        sortOrder:          remote.sort_order,
        totalSold:          Number(remote.total_sold || 0),
        imageUrl:           remote.image_url ?? undefined,
        isDeleted:          remote.is_deleted,
        createdAt:          new Date(remote.created_at),
        updatedAt:          remoteUpdatedAt,
      }

      if (existing?.id) {
        await db.products.update(existing.id, { ...localProduct, uuid: remote.uuid })
      } else {
        await db.products.add(localProduct as Product)
      }
      count++
    }

    // --- Second Pass: เชื่อมโยง Inventory Mappings เมื่อสินค้าครบทุกคนแล้ว ---
    if (count > 0 || force) {
      const allProds = await db.products.toArray()
      const uuidToId = new Map(allProds.map(p => [p.uuid, p.id!]))

      for (const remote of remoteProds) {
        if (remote.inventory_mappings?.length) {
          const productId = uuidToId.get(remote.uuid)
          const localProd = allProds.find(p => p.id === productId)
          if (!productId || !localProd) continue

          const resolvedMappings = (remote.inventory_mappings as any[])
            .map(m => {
              const localId = uuidToId.get(m.source_product_uuid)
              return localId ? { sourceProductId: localId, quantity: m.quantity } : null
            })
            .filter(m => m !== null)

          if (resolvedMappings.length > 0) {
            // ส่ง updatedAt ไปด้วยเพื่อเลี่ยง Hook
            await db.products.update(productId, { 
              inventoryMappings: resolvedMappings,
              updatedAt: localProd.updatedAt 
            })
          }
        }
      }
    }

    return count
  }

  /**
   * ตรวจสอบว่าใน Supabase มีพนักงาน (pos_users) หรือยัง
   * ใช้สำหรับการตัดสินใจว่าจะ Pull หรือ Seed ข้อมูลในเครื่องที่ยังว่างเปล่า
   */
  async function checkRemoteUsersExist(): Promise<boolean> {
    const supabase = useSupabaseClient<any>()
    const { count, error } = await supabase
      .from('pos_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)

    if (error) {
      console.error('❌ เช็ค Remote Users ล้มเหลว:', error)
      return false
    }
    return (count || 0) > 0
  }

  /**
   * Pull พนักงานจาก Supabase ลงเครื่อง
   */
  async function pullUsers(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const authStore = useAuthStore() // ใช้สำหรับเช็ค Session ปัจจุบัน
    const lastPullAt = force ? null : await getLastPullAt()

    let query = supabase.from('pos_users').select('*')
    if (lastPullAt) {
      query = query.gt('updated_at', lastPullAt.toISOString())
    }

    const { data: remoteUsers, error } = await query
    if (error) throw new Error(`Pull Users ล้มเหลว: ${error.message}`)
    if (!remoteUsers?.length) return 0

    let count = 0
    for (const remote of remoteUsers) {
      let existing = await db.users.where('uuid').equals(remote.uuid).first()
      if (!existing) {
        existing = await db.users.where('username').equals(remote.username).first()
      }

      const remoteUpdatedAt = new Date(remote.updated_at)
      if (existing && new Date(existing.updatedAt) >= remoteUpdatedAt) {
        if (existing.uuid !== remote.uuid) {
            await db.users.update(existing.id!, { uuid: remote.uuid })
        }
        continue
      }

      const remotePin = remote.pin ?? undefined
      const hashedPin = (remotePin && !isAlreadyHashed(remotePin)) 
        ? await hashSHA256(remotePin) 
        : remotePin

      const localUser: Omit<User, 'id'> = {
        uuid:         remote.uuid,
        username:     remote.username,
        displayName:  remote.display_name,
        role:         remote.role as UserRole,
        pin:          hashedPin,
        passwordHash: '', 
        isActive:     remote.is_active,
        isDeleted:    remote.is_deleted,
        createdAt:    new Date(remote.created_at),
        updatedAt:    remoteUpdatedAt,
      }

      if (existing?.id) {
        await db.users.update(existing.id, localUser)
        
        // --- SECURITY CHECK: ตรวจสอบว่าพนักงานที่กำลัง Login อยู่ ถูกเปลี่ยนรหัสจากเครื่องอื่นหรือไม่ ---
        if (authStore.currentUser?.uuid === remote.uuid) {
          if (authStore.currentUser?.pin !== hashedPin) {
            console.warn('⚠️ ตรวจพบการเปลี่ยนรหัสผ่านจากอุปกรณ์อื่น สำหรับผู้ใช้ปัจจุบัน')
            // ส่งสัญญาณให้หน้าจอแจ้งเตือนและ Logout (ผ่าน Global Hook หรือ Store)
            authStore.handleSecurityInvalidation()
          }
        }
      } else {
        await db.users.add(localUser as User)
      }
      count++
    }
    return count
  }

  /**
   * Pull ประวัติการปรับสต็อก (Stock Audit Logs) จาก Cloud
   */
  async function pullStockAuditLogs(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    
    // หาค่าล่าสุดจากในเครื่องโดยอิงจาก ID (เนื่องจากเป็น Auto-increment)
    const lastLocalLog = await db.stockAuditLogs.orderBy('id').reverse().first()
    const lastUpdateLocal = lastLocalLog?.updatedAt
    
    // ตั้งค่า Query: ถ้าไม่ใช่ force และมีข้อมูลเดิม ให้ดึงเฉพาะตัวที่ใหม่กว่า
    let query = supabase.from('stock_audit_logs').select('*')
    if (lastUpdateLocal && !force) {
      query = query.gt('updated_at', lastUpdateLocal.toISOString())
    }

    const { data: remoteLogs, error } = await query
      .order('updated_at', { ascending: true }) // ดึงตัวที่เก่ากว่ามาใหม่กว่า
      .limit(force ? 1000 : 200)

    if (error) throw new Error(`Pull Stock Logs ล้มเหลว: ${error.message}`)
    if (!remoteLogs?.length) return 0

    // --- Bulk Fetch: ดึงทั้ง Products มาสร้าง Map เพื่อความเร็ว ---
    const allProds = await db.products.toArray()
    const prodUuidToLocalId = new Map(allProds.map(p => [p.uuid, p.id!]))

    // ดึง Users
    const allUsers = await db.users.toArray()
    const userUuidToLocalId = new Map(allUsers.map(u => [u.uuid, u.id!]))

    // ดึงรายการที่มีอยู่เดิมมาตรวจสอบ
    const remoteUuids = remoteLogs.map(r => r.uuid)
    const existingLogs = await db.stockAuditLogs.where('uuid').anyOf(remoteUuids).toArray()
    const existingUuidToId = new Map(existingLogs.map(l => [l.uuid, l.id!]))

    let count = 0
    for (const remote of remoteLogs) {
      const existingId = existingUuidToId.get(remote.uuid)
      
      // ถ้ามีอยู่ในเครื่องแล้ว ไม่ว่ากรณีใดๆ (แม้แต่ Force) ให้ข้ามไปเลย 
      // เพราะประวัติสต็อกเป็นข้อมูลแบบเน้นบันทึกเพิ่ม (Append-only) ไม่ควรแก้ไขของเก่า
      if (existingId) continue

      const localLog: Omit<StockAuditLog, 'id'> = {
        uuid:             remote.uuid,
        productId:        prodUuidToLocalId.get(remote.product_uuid) || 0,
        productName:      remote.product_name,
        changeQuantity:   Number(remote.change_quantity),
        previousQuantity: Number(remote.previous_quantity),
        newQuantity:      Number(remote.new_quantity),
        reason:           remote.reason,
        note:             remote.note ?? undefined,
        staffId:          userUuidToLocalId.get(remote.staff_uuid) || 0,
        staffName:        remote.staff_name,
        staffUuid:        remote.staff_uuid,
        syncStatus:       'synced',
        syncedAt:         new Date(remote.updated_at),
        syncRetryCount:   0,
        createdAt:        new Date(remote.created_at),
        updatedAt:        new Date(remote.updated_at),
        isDeleted:        remote.is_deleted,
      }

      await db.stockAuditLogs.add(localLog as StockAuditLog)
      count++
    }

    await setSetting(SETTING_KEY_STOCK_PULL, new Date().toISOString())
    return count
  }

  // -----------------------------------------------------------------------
  // Orchestration: Push All / Pull All / Sync All
  // -----------------------------------------------------------------------

  async function pushAll(force = false): Promise<{ categories: number; products: number; stockLogs: number }> {
    if (isSyncingMaster.value) return { categories: 0, products: 0, stockLogs: 0 }
    isSyncingMaster.value = true
    masterSyncError.value = null
    const syncStartTime = new Date()
    try {
      const stockLogs  = await pushStockAuditLogs(force)
      
      // หมายเหตุ: Categories และ Products ไม่ Sync (Push) ในนี้แล้ว เปลี่ยนไปเขียนฝั่ง Online ทันที
      // Users ไม่ Sync ในนี้แล้ว (เพราะบีบ Online-only ใน useUsers.ts)
      
      await updateLastPushAt(syncStartTime)
      lastMasterSyncAt.value = new Date()
      return { categories: 0, products: 0, stockLogs }
    } catch (e: any) {
      masterSyncError.value = e.message
      throw e
    } finally {
      isSyncingMaster.value = false
    }
  }

  async function pullAll(force = false): Promise<{ categories: number; products: number; users: number; stockLogs: number }> {
    if (isSyncingMaster.value) return { categories: 0, products: 0, users: 0, stockLogs: 0 }
    isSyncingMaster.value = true
    masterSyncError.value = null
    const syncStartTime = new Date()
    try {
      const categories = await pullCategories(force)
      const products   = await pullProducts(force)
      const users      = await pullUsers(force)
      const stockLogs  = await pullStockAuditLogs(force)
      await updateLastPullAt(syncStartTime)
      
      // อัปเดต Last Push At ด้วย เพื่อบอกว่าข้อมูลที่เพิ่งดึงมานี้ "ทันสมัยแล้ว"
      // ป้องกันการกด Push ทันทีแล้วมันดันกลับขึ้นไปเอง
      await updateLastPushAt(syncStartTime)

      lastMasterSyncAt.value = new Date()
      lastPullTimestamp.value = Date.now()
      return { categories, products, users, stockLogs }
    } catch (e: any) {
      masterSyncError.value = e.message
      throw e
    } finally {
      isSyncingMaster.value = false
    }
  }

  async function syncAll(): Promise<void> {
    await pushAll()
    await pullAll()
  }

  /**
   * ดึงจำนวนรายการที่รอ Sync ขึ้น Cloud (ใช้ Logic เดียวกับ pushAll)
   * เพื่อให้ตัวเลขใน UI แม่นยำและสอดคล้องกับสิ่งที่จะถูก Push จริงๆ
   */
  async function getPendingCounts(): Promise<{
    categories: number; categoryNames: string[]
    products: number; productNames: string[]
    orders: number; orderNumbers: string[]
    stockLogs: number; stockLogDetails: string[]
    expenses: number; expenseDetails: string[]
  }> {
    const lastPushAt = await getLastPushAt()
    const MAX_RETRY = 5

    // Orders: pending/failed ที่ยังไม่เกิน retry limit
    const pendingOrders = await db.orders
      .where('syncStatus').anyOf(['pending', 'failed'])
      .filter(o => (o.syncRetryCount || 0) < MAX_RETRY)
      .toArray()

    // Stock Logs: pending/failed ที่ยังไม่เกิน retry limit
    const pendingStocks = await db.stockAuditLogs
      .where('syncStatus').anyOf(['pending', 'failed'])
      .filter(l => (l.syncRetryCount || 0) < MAX_RETRY)
      .toArray()

    // Expenses: pending/failed
    const pendingExpenses = await db.expenses
      .where('syncStatus').anyOf(['pending', 'failed'])
      .toArray()

    return {
      categories: 0,
      categoryNames: [],
      products: 0,
      productNames: [],
      orders: pendingOrders.length,
      orderNumbers: pendingOrders.map(o => o.orderNumber),
      stockLogs: pendingStocks.length,
      stockLogDetails: pendingStocks.map(l => `${l.productName} (${l.changeQuantity > 0 ? '+' : ''}${l.changeQuantity})`),
      expenses: pendingExpenses.length,
      expenseDetails: pendingExpenses.map(e => `${e.description} (฿${e.amount})`),
    }
  }

  /**
   * ดึงจำนวนรายการที่ตรวจสอบเจอการอัปเดตบน Cloud และรอซิงค์ลงมา (Pull)
   * โดนจะแค่ยิงเช็ค Count/UUID จาก Supabase ตรงๆ เพื่อประหยัด API Quota 
   */
  async function getPendingPullCounts(): Promise<{ 
    categories: number, categoryNames: string[],
    products: number, productNames: string[],
    users: number, userNames: string[],
    stockLogs: number, stockLogDetails: string[],
    orders: number, orderNumbers: string[]
  }> {
    const supabase = useSupabaseClient<any>()
    const lastPullAt = await getLastPullAt()
    const emptyResult = { 
      categories: 0, categoryNames: [], products: 0, productNames: [], 
      users: 0, userNames: [], stockLogs: 0, stockLogDetails: [], orders: 0, orderNumbers: [] 
    }
    
    // หากไม่เคย Pull เลย ให้ใช้เวลาเริ่มต้น (1970) เพื่อให้เห็นว่ามีข้อมูลบน Cloud ที่ยังไม่มีในเครื่อง
    const timeLimit = lastPullAt ? lastPullAt.toISOString() : new Date(0).toISOString()

    try {
      // 1. ตรวจสอบกลุ่มที่เป็น "Master Data" (แก้ไข/ลบ ได้จากหลายเครื่อง)
      const checkMasterUpdates = async (tableName: string, dbTableKey: 'categories' | 'products' | 'users', nameField = 'name') => {
        const { data: rawData } = await supabase
          .from(tableName)
          .select(`uuid, updated_at, ${nameField}`)
          .gt('updated_at', timeLimit)
          
        const data = rawData as any[] | null

        if (!data || data.length === 0) return { count: 0, names: [] }
        
        const remoteUuids = data.map((r: any) => r.uuid)
        const localItems = await (db as any)[dbTableKey].where('uuid').anyOf(remoteUuids).toArray()
        const localMap = new Map<string, number>(localItems.map((item: any) => [
          item.uuid, 
          new Date(item.updatedAt || item.lastLoginAt || 0).getTime()
        ]))

        let pendingCount = 0
        const names: string[] = []
        for (const remote of data) {
          const remoteTime = new Date(remote.updated_at).getTime()
          const localTime = localMap.get(remote.uuid) || 0
          if (remoteTime > localTime) {
            pendingCount++
            names.push(remote[nameField])
          }
        }
        return { count: pendingCount, names }
      }

      // 2. ตรวจสอบกลุ่มที่เป็น "Log / Transaction" 
      const checkAppendOnlyUpdates = async (tableName: string, dbTableKey: 'orders' | 'stockAuditLogs', nameField = 'order_number') => {
        const { count: remoteTotal } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        const localTotal = await (db as any)[dbTableKey].count()
        
        // เปรียบเทียบจำนวนทั้งหมด (ไม่สนใจ syncStatus) เพื่อป้องกันแจ้งเตือนซ้ำซ้อน
        // ในกรณีที่เครื่องเรากำลังจะส่ง (Pending) แต่ระบบดันมองว่าขาดหายไปจากยอดที่ซิงค์แล้ว
        const diff = (remoteTotal || 0) - localTotal
        if (diff > 0) {
          // ดึงรายการล่าสุดตามจำนวนที่ต่างกันเพื่อเอาชื่อมาโชว์ใน Tooltip
          const { data } = await supabase.from(tableName).select(nameField).order('created_at', { ascending: false }).limit(diff)
          return { count: diff, names: data ? data.map((d: any) => d[nameField]) : [] }
        }
        return { count: 0, names: [] }
      }

      const [catRes, prodRes, userRes, stockRes, orderRes] = await Promise.all([
        checkMasterUpdates('categories', 'categories'),
        checkMasterUpdates('products', 'products'),
        checkMasterUpdates('pos_users', 'users', 'display_name'),
        checkAppendOnlyUpdates('stock_audit_logs', 'stockAuditLogs', 'product_name'),
        checkAppendOnlyUpdates('orders', 'orders', 'order_number')
      ])
      
      return { 
        categories: catRes.count, categoryNames: catRes.names,
        products: prodRes.count, productNames: prodRes.names,
        users: userRes.count, userNames: userRes.names,
        stockLogs: stockRes.count, stockLogDetails: stockRes.names,
        orders: orderRes.count, orderNumbers: orderRes.names
      }
    } catch(err) {
      console.warn('⚠️ getPendingPullCounts Error:', err)
      return emptyResult
    }
  }

  return {
    isSyncingMaster,
    lastMasterSyncAt,
    masterSyncError,
    lastPullTimestamp,
    pushStockAuditLogs,
    pushUsers,
    pushAll,
    getPendingCounts,
    getPendingPullCounts,
    checkRemoteUsersExist,
    pullCategories,
    pullProducts,
    pullUsers,
    pullStockAuditLogs,
    pullAll,
    syncAll,
    getLastPushAt,
    getLastPullAt,
    updateLastPushAt,
    updateLastPullAt,
  }
}
