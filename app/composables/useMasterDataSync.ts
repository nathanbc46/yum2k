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

import { db } from '~/db'
import type { Category, Product, User, UserRole } from '~/types'

// --- Global State ---
const isSyncingMaster = ref(false)
const lastMasterSyncAt = ref<Date | null>(null)
const masterSyncError = ref<string | null>(null)

export function useMasterDataSync() {
  // -----------------------------------------------------------------------
  // PUSH: ดันข้อมูล LOCAL → CLOUD
  // -----------------------------------------------------------------------

  /**
   * Push หมวดหมู่ทั้งหมดขึ้น Supabase (Upsert by uuid)
   */
  async function pushCategories(): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const localCats = await db.categories.toArray()
    if (!localCats.length) return 0

    const payload = localCats.map(c => ({
      uuid:        c.uuid,
      name:        c.name,
      description: c.description ?? null,
      icon_url:    c.iconUrl ?? null,
      color:       c.color ?? '#6366f1',
      sort_order:  c.sortOrder,
      is_active:   c.isActive,
      is_deleted:  c.isDeleted,
      created_at:  new Date(c.createdAt).toISOString(),
      updated_at:  new Date(c.updatedAt).toISOString(),
    }))

    const { error } = await supabase
      .from('categories')
      .upsert(payload, { onConflict: 'uuid' })

    if (error) throw new Error(`Push Categories ล้มเหลว: ${error.message}`)
    console.log(`✅ Push Categories สำเร็จ: ${localCats.length} รายการ`)
    return localCats.length
  }

  /**
   * Push สินค้าทั้งหมดขึ้น Supabase (Upsert by uuid)
   * แปลง inventoryMappings: sourceProductId → sourceProductUuid
   */
  async function pushProducts(): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const localProducts = await db.products.toArray()
    if (!localProducts.length) return 0

    // โหลด Category map: id → uuid
    const allCats = await db.categories.toArray()
    const catIdToUuid = new Map(allCats.map(c => [c.id!, c.uuid]))

    // โหลด Product map: id → uuid (สำหรับ inventoryMappings)
    const allProds = await db.products.toArray()
    const prodIdToUuid = new Map(allProds.map(p => [p.id!, p.uuid]))

    const payload = localProducts.map(p => {
      // แปลง inventoryMappings: ใช้ UUID แทน Local ID
      const mappingsForCloud = p.inventoryMappings?.map(m => ({
        sourceProductUuid: prodIdToUuid.get(m.sourceProductId) ?? null,
        quantity:          m.quantity,
      })).filter(m => m.sourceProductUuid) ?? null

      return {
        uuid:               p.uuid,
        category_uuid:      catIdToUuid.get(p.categoryId) ?? '',
        sku:                p.sku ?? null,
        name:               p.name,
        description:        p.description ?? null,
        sale_price:         p.salePrice,
        cost_price:         p.costPrice,
        stock_quantity:     p.stockQuantity,
        alert_threshold:    p.alertThreshold,
        track_inventory:    p.trackInventory,
        mapping_type:       p.mappingType ?? null,
        inventory_mappings: mappingsForCloud,
        is_active:          p.isActive,
        sort_order:         p.sortOrder,
        image_url:          p.imageUrl ?? null,
        is_deleted:         p.isDeleted,
        addon_groups:       p.addonGroups ?? null, // เพิ่มเทมเพลตตัวเลือกเสริม
        created_at:         new Date(p.createdAt).toISOString(),
        updated_at:         new Date(p.updatedAt).toISOString(),
      }
    })

    const { error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'uuid' })

    if (error) throw new Error(`Push Products ล้มเหลว: ${error.message}`)
    console.log(`✅ Push Products สำเร็จ: ${localProducts.length} รายการ`)
    return localProducts.length
  }

  /**
   * Push พนักงาน (Users) ทั้งหมดขึ้น Supabase (Upsert by username)
   */
  async function pushUsers(): Promise<number> {
    const supabase = useSupabaseClient<any>()
    const localUsers = await db.users.toArray()
    if (!localUsers.length) return 0

    const payload = localUsers.map(u => ({
      uuid:         u.uuid,
      username:     u.username,
      display_name: u.displayName,
      role:         u.role,
      pin:          u.pin,
      is_active:    u.isActive,
      is_deleted:   u.isDeleted,
      created_at:   new Date(u.createdAt).toISOString(),
      updated_at:   new Date(u.updatedAt).toISOString(),
    }))

    // ใช้ username เป็น onConflict เพื่อป้องกันปัญหา "Duplicate username" ตอน Push
    const { error } = await supabase
      .from('pos_users')
      .upsert(payload, { onConflict: 'username' })

    if (error) throw new Error(`Push Users ล้มเหลว: ${error.message}`)
    console.log(`✅ Push Users สำเร็จ: ${localUsers.length} รายการ`)
    return localUsers.length
  }

  // -----------------------------------------------------------------------
  // PULL: ดึงข้อมูล CLOUD → LOCAL
  // -----------------------------------------------------------------------

  /**
   * Pull หมวดหมู่จาก Supabase ลงเครื่อง (Merge by uuid)
   * @returns จำนวนรายการที่เพิ่ม/อัปเดต
   */
  async function pullCategories(): Promise<number> {
    const supabase = useSupabaseClient<any>()

    const { data: remoteCats, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw new Error(`Pull Categories ล้มเหลว: ${error.message}`)
    if (!remoteCats?.length) return 0

    let count = 0
    for (const remote of remoteCats) {
      // 1. ลองหาด้วย UUID ก่อน
      let existing = await db.categories.where('uuid').equals(remote.uuid).first()

      // 2. ถ้าไม่พบด้วย UUID ให้ลองหาด้วย "ชื่อ" (ป้องกันข้อมูลซ้ำตอนเริ่มที่ไอดีไม่ตรงกัน)
      if (!existing) {
        existing = await db.categories.where('name').equals(remote.name).first()
      }

      // อัปเดตเฉพาะถ้า Cloud ใหม่กว่า Local หรือไม่มีในเครื่อง
      const remoteUpdatedAt = new Date(remote.updated_at)
      if (existing && new Date(existing.updatedAt) >= remoteUpdatedAt) continue

      const localCategory: Omit<Category, 'id'> = {
        uuid:        remote.uuid,
        name:        remote.name,
        description: remote.description ?? undefined,
        iconUrl:     remote.icon_url ?? undefined,
        color:       remote.color ?? '#6366f1',
        sortOrder:   remote.sort_order,
        isActive:    remote.is_active,
        isDeleted:   remote.is_deleted,
        createdAt:   new Date(remote.created_at),
        updatedAt:   remoteUpdatedAt,
      }

      if (existing?.id) {
        await db.categories.update(existing.id, { ...localCategory, uuid: remote.uuid }) // อัปเดต UUID ให้ตรงกับ Cloud เสมอ
      } else {
        await db.categories.add(localCategory as Category)
      }
      count++
    }

    console.log(`✅ Pull Categories สำเร็จ: อัปเดต ${count} รายการ`)
    return count
  }

  /**
   * Pull สินค้าจาก Supabase ลงเครื่อง (Merge by uuid)
   * แปลง inventoryMappings: sourceProductUuid → sourceProductId (local)
   * @returns จำนวนรายการที่เพิ่ม/อัปเดต
   */
  async function pullProducts(): Promise<number> {
    const supabase = useSupabaseClient<any>()

    const { data: remoteProds, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw new Error(`Pull Products ล้มเหลว: ${error.message}`)
    if (!remoteProds?.length) return 0

    // สร้าง Map: categoryUuid → local id
    const localCats = await db.categories.toArray()
    const catUuidToId = new Map(localCats.map(c => [c.uuid, c.id!]))

    // สร้าง Map: productUuid → local id (สำหรับ Resolve inventoryMappings)
    const localProds = await db.products.toArray()
    const prodUuidToId = new Map(localProds.map(p => [p.uuid, p.id!]))

    let count = 0
    for (const remote of remoteProds) {
      // 1. ลองหาด้วย UUID ก่อน
      let existing = await db.products.where('uuid').equals(remote.uuid).first()

      // 2. ถ้าไม่พบด้วย UUID ลองหาด้วย SKU หรือ ชื่อ
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

      // Resolve categoryId จาก uuid
      const categoryId = catUuidToId.get(remote.category_uuid)
      if (!categoryId) {
        console.warn(`⚠️ ไม่พบหมวดหมู่ uuid=${remote.category_uuid} สำหรับสินค้า "${remote.name}" — ข้าม`)
        continue
      }

      // แปลง inventoryMappings: uuid → local id
      const inventoryMappings = remote.inventory_mappings
        ? (remote.inventory_mappings as Array<{ sourceProductUuid: string; quantity: number }>)
            .map(m => {
              const localId = prodUuidToId.get(m.sourceProductUuid)
              return localId ? { sourceProductId: localId, quantity: m.quantity } : null
            })
            .filter((m): m is { sourceProductId: number; quantity: number } => m !== null)
        : undefined

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
        inventoryMappings:  inventoryMappings?.length ? inventoryMappings : undefined,
        addonGroups:        remote.addon_groups ?? undefined, // ดึงเทมเพลตตัวเลือกเสริมลงเครื่อง
        isActive:           remote.is_active,
        sortOrder:          remote.sort_order,
        imageUrl:           remote.image_url ?? undefined,
        isDeleted:          remote.is_deleted,
        createdAt:          new Date(remote.created_at),
        updatedAt:          remoteUpdatedAt,
      }

      if (existing?.id) {
        await db.products.update(existing.id, { ...localProduct, uuid: remote.uuid }) // อัปเดต UUID ให้ตรงกับ Cloud
      } else {
        const newId = await db.products.add(localProduct as Product)
        // อัปเดต Map เพื่อใช้ Resolve mapping ของสินค้าถัดๆ ไป
        prodUuidToId.set(remote.uuid, newId as number)
      }
      count++
    }

    console.log(`✅ Pull Products สำเร็จ: อัปเดต ${count} รายการ`)
    return count
  }

  /**
   * Pull พนักงานจาก Supabase ลงเครื่อง (Merge by uuid / username fallback)
   */
  async function pullUsers(): Promise<number> {
    const supabase = useSupabaseClient<any>()

    const { data: remoteUsers, error } = await supabase
      .from('pos_users')
      .select('*')

    if (error) throw new Error(`Pull Users ล้มเหลว: ${error.message}`)
    if (!remoteUsers?.length) return 0

    let count = 0
    for (const remote of remoteUsers) {
      // 1. ลองหาด้วย UUID ก่อน
      let existing = await db.users.where('uuid').equals(remote.uuid).first()
      
      // 2. ถ้าไม่พบด้วย UUID ให้ลองหาด้วย username (ป้องกันชื่อซ้ำแต่ UUID ไม่ตรงตอนเริ่มเบื้องต้น)
      if (!existing) {
        existing = await db.users.where('username').equals(remote.username).first()
      }

      const remoteUpdatedAt = new Date(remote.updated_at)
      if (existing && new Date(existing.updatedAt) >= remoteUpdatedAt) {
        // หาก UUID ในเครื่องไม่ตรงกับ Cloud (กรณีชื่อซ้ำแต่คนละ ID) ให้แก้ไอดีในเครื่องตาม Cloud
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

    console.log(`✅ Pull Users สำเร็จ: อัปเดต ${count} รายการ`)
    return count
  }

  // -----------------------------------------------------------------------
  // Orchestration: Push All / Pull All / Sync All
  // -----------------------------------------------------------------------

  /**
   * Push ข้อมูล Local ขึ้น Cloud ทั้งหมด
   */
  async function pushAll(): Promise<{ categories: number; products: number; users: number }> {
    if (isSyncingMaster.value) return { categories: 0, products: 0, users: 0 }
    isSyncingMaster.value = true
    masterSyncError.value = null
    try {
      const categories = await pushCategories()
      const products   = await pushProducts()
      const users      = await pushUsers()
      lastMasterSyncAt.value = new Date()
      return { categories, products, users }
    } catch (e: any) {
      masterSyncError.value = e.message
      throw e
    } finally {
      isSyncingMaster.value = false
    }
  }

  /**
   * Pull ข้อมูลจาก Cloud ลงเครื่องทั้งหมด
   * ลำดับสำคัญ: Categories ก่อน (เพราะ Products อ้างอิง Category uuid)
   */
  async function pullAll(): Promise<{ categories: number; products: number; users: number }> {
    if (isSyncingMaster.value) return { categories: 0, products: 0, users: 0 }
    isSyncingMaster.value = true
    masterSyncError.value = null
    try {
      const categories = await pullCategories()  // ต้อง pull ก่อนเสมอ
      const products   = await pullProducts()
      const users      = await pullUsers()
      lastMasterSyncAt.value = new Date()
      return { categories, products, users }
    } catch (e: any) {
      masterSyncError.value = e.message
      throw e
    } finally {
      isSyncingMaster.value = false
    }
  }

  /**
   * Full Two-way Sync: Push ขึ้นก่อน แล้ว Pull ลง
   * ใช้สำหรับ Full Sync เมื่อจะใช้งานหลายอุปกรณ์
   */
  async function syncAll(): Promise<void> {
    await pushAll()
    await pullAll()
  }

  return {
    isSyncingMaster,
    lastMasterSyncAt,
    masterSyncError,
    pushCategories,
    pushProducts,
    pushAll,
    pullCategories,
    pullProducts,
    pullAll,
    syncAll,
  }
}
