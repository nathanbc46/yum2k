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
  // PUSH: ดันข้อมูล LOCAL → CLOUD
  // -----------------------------------------------------------------------

  /**
   * Push หมวดหมู่ทั้งหมดขึ้น Supabase (Upsert by uuid)
   */
  async function pushCategories(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const lastPushAt = force ? null : await getLastPushAt()

    let query = db.categories.toCollection()
    if (lastPushAt) {
      query = db.categories.where('updatedAt').above(lastPushAt)
    }

    const localCats = await query.toArray()
    if (localCats.length === 0) return 0

    const payload = localCats.map(c => ({
      uuid: c.uuid,
      name: c.name,
      description: c.description,
      icon_url: c.iconUrl,
      color: c.color,
      sort_order: c.sortOrder,
      is_active: c.isActive,
      is_deleted: c.isDeleted,
      parent_uuid: c.parentUuid,
      updated_at: c.updatedAt.toISOString(),
    }))

    const { error } = await supabase
      .from('categories')
      .upsert(payload, { onConflict: 'uuid' })

    if (error) throw error
    console.log(`✅ Push Categories สำเร็จ: ${localCats.length} รายการ`)
    return localCats.length
  }

  /**
   * Push สินค้าทั้งหมดขึ้น Supabase (Upsert by uuid)
   * แปลง inventoryMappings: sourceProductId → sourceProductUuid
   */
  async function pushProducts(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const lastPushAt = force ? null : await getLastPushAt()

    let query = db.products.toCollection()
    if (lastPushAt) {
      query = db.products.where('updatedAt').above(lastPushAt)
    }

    const localProducts = await query.toArray()
    if (localProducts.length === 0) return 0

    // --- Bulk Fetch: ดึง Category และ Product ทั้งหมดมาสร้าง Map ก่อนเข้าลูป ---
    // หลีกเลี่ยงการ Query ฐานข้อมูลซ้ำๆ ภายในลูป (N+1 Problem)
    const allCats = await db.categories.toArray()
    const catIdToUuid = new Map(allCats.map(c => [c.id!, c.uuid]))

    const allProds = await db.products.toArray()
    const prodIdToUuid = new Map(allProds.map(p => [p.id!, p.uuid]))

    const payload = localProducts.map(p => {
      const category_uuid = catIdToUuid.get(p.categoryId)

      const mappingsForCloud = p.inventoryMappings?.length
        ? p.inventoryMappings
            .map(m => {
              const uuid = prodIdToUuid.get(m.sourceProductId)
              return uuid ? { source_product_uuid: uuid, quantity: m.quantity } : null
            })
            .filter((m): m is { source_product_uuid: string; quantity: number } => m !== null)
        : null

      return {
        uuid: p.uuid,
        category_uuid,
        sku: p.sku,
        name: p.name,
        description: p.description,
        image_url: p.imageUrl,
        sale_price: p.salePrice,
        cost_price: p.costPrice,
        stock_quantity: p.stockQuantity,
        alert_threshold: p.alertThreshold,
        track_inventory: p.trackInventory,
        mapping_type: p.mappingType,
        inventory_mappings: mappingsForCloud,
        addon_groups: p.addonGroups ?? null,
        is_active: p.isActive,
        sort_order: p.sortOrder,
        is_deleted: p.isDeleted,
        updated_at: p.updatedAt.toISOString(),
      }
    })

    const { error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'uuid' })

    if (error) throw error
    console.log(`✅ Push Products สำเร็จ: ${payload.length} รายการ`)
    return payload.length
  }

  /**
   * Push พนักงาน (Users) ทั้งหมดขึ้น Supabase (Upsert by username)
   */
  async function pushUsers(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const lastPushAt = force ? null : await getLastPushAt()

    let query = db.users.toCollection()
    if (lastPushAt) {
      query = db.users.where('updatedAt').above(lastPushAt)
    }

    const localUsers = await query.toArray()
    if (localUsers.length === 0) return 0

    const payload = localUsers.map(u => ({
      uuid: u.uuid,
      username: u.username,
      display_name: u.displayName,
      role: u.role,
      pin: u.pin,
      is_active: u.isActive,
      is_deleted: u.isDeleted,
      updated_at: u.updatedAt.toISOString(),
    }))

    const { error } = await supabase
      .from('pos_users')
      .upsert(payload, { onConflict: 'uuid' })

    if (error) throw error
    console.log(`✅ Push Users สำเร็จ: ${localUsers.length} รายการ`)
    return localUsers.length
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
   * Pull พนักงานจาก Supabase ลงเครื่อง
   */
  async function pullUsers(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()
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

      const localUser: Omit<User, 'id'> = {
        uuid:         remote.uuid,
        username:     remote.username,
        displayName:  remote.display_name,
        role:         remote.role as UserRole,
        pin:          remote.pin ?? undefined,
        passwordHash: '', 
        isActive:     remote.is_active,
        isDeleted:    remote.is_deleted,
        createdAt:    new Date(remote.created_at),
        updatedAt:    remoteUpdatedAt,
      }

      if (existing?.id) {
        await db.users.update(existing.id, localUser)
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
    const lastPullAt = force
      ? null
      : await getSetting<string | null>(SETTING_KEY_STOCK_PULL, null).then(val => val ? new Date(val) : null)

    let query = supabase.from('stock_audit_logs').select('*')
    if (lastPullAt) {
      query = query.gt('updated_at', lastPullAt.toISOString())
    }

    const { data: remoteLogs, error } = await query
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw new Error(`Pull Stock Logs ล้มเหลว: ${error.message}`)
    if (!remoteLogs?.length) return 0

    // --- Bulk Fetch: ดึงทั้ง Products และ Users มาสร้าง Map ก่อนลูปเพื่อประสิทธิภาพ ---
    const allProds = await db.products.toArray()
    const prodUuidToLocalId = new Map(allProds.map(p => [p.uuid, p.id!]))

    const allUsers = await db.users.toArray()
    const userUuidToLocalId = new Map(allUsers.map(u => [u.uuid, u.id!]))

    // ดึงรายการที่มีอยู่แล้วมาตรวจสอบ (Bulk)
    const remoteUuids = remoteLogs.map(r => r.uuid)
    const existingLogs = await db.stockAuditLogs.where('uuid').anyOf(remoteUuids).toArray()
    const existingUuidToId = new Map(existingLogs.map(l => [l.uuid, l.id!]))

    let count = 0
    for (const remote of remoteLogs) {
      const existingId = existingUuidToId.get(remote.uuid)
      if (existingId && !force) continue

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

      if (existingId) {
        await db.stockAuditLogs.update(existingId, localLog)
      } else {
        await db.stockAuditLogs.add(localLog as StockAuditLog)
      }
      count++
    }

    await setSetting(SETTING_KEY_STOCK_PULL, new Date().toISOString())
    return count
  }

  // -----------------------------------------------------------------------
  // Orchestration: Push All / Pull All / Sync All
  // -----------------------------------------------------------------------

  async function pushAll(force = false): Promise<{ categories: number; products: number; users: number }> {
    if (isSyncingMaster.value) return { categories: 0, products: 0, users: 0 }
    isSyncingMaster.value = true
    masterSyncError.value = null
    const syncStartTime = new Date()
    try {
      const categories = await pushCategories(force)
      const products   = await pushProducts(force)
      const users      = await pushUsers(force)
      await updateLastPushAt(syncStartTime)
      lastMasterSyncAt.value = new Date()
      return { categories, products, users }
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

  return {
    isSyncingMaster,
    lastMasterSyncAt,
    masterSyncError,
    lastPullTimestamp,
    pushCategories,
    pushProducts,
    pushAll,
    pullCategories,
    pullProducts,
    pullUsers,
    pullStockAuditLogs,
    pullAll,
    syncAll,
  }
}
