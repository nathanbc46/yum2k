// =============================================================================
// composables/useSync.ts
// Composable สำหรับ Background Sync: ส่งข้อมูลออร์เดอร์ขึ้น Server
// รองรับ Offline-first: Retry อัตโนมัติเมื่อมีอินเตอร์เน็ต
// =============================================================================

import { db } from '~/db'
import type { Order, SyncStatus, OrderItem, InventoryDeduction } from '~/types'

// จำนวนครั้งสูงสุดที่จะ Retry ก่อนหยุด
const MAX_RETRY_COUNT = 5

// Delay ระหว่าง Retry (Exponential Backoff ใน ms)
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000]

// --- Global State (Shared across all components) ---
const isSyncing = ref(false)
const isOnline = ref(import.meta.client ? navigator.onLine : true)
const pendingCount = ref(0)
const pendingStockAuditCount = ref(0) // สำหรับประวัติสต็อก
const lastSyncAt = ref<Date | null>(null)
const syncIntervalId = ref<any>(null) // สำหรับ Heartbeat Sync

export function useSync() {

  // ---------------------------------------------------------------------------
  // Network Status Monitoring
  // ---------------------------------------------------------------------------

  /** ดักจับเหตุการณ์ Online/Offline */
  function setupNetworkListener(): () => void {
    const onOnline = () => {
      isOnline.value = true
      console.log('🌐 มีอินเตอร์เน็ตแล้ว — เริ่ม Sync...')
      syncPendingOrders()
    }

    const onOffline = () => {
      isOnline.value = false
      console.log('📵 ไม่มีอินเตอร์เน็ต — ข้อมูลจะถูก Sync เมื่อมีสัญญาณ')
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Return cleanup function สำหรับ onUnmounted
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }

  // ---------------------------------------------------------------------------
  // Sync Logic
  // ---------------------------------------------------------------------------

  /**
   * ดึงจำนวน Order ที่รอ Sync
   */
  async function refreshPendingCount(): Promise<void> {
    pendingCount.value = await db.orders
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count()
    
    // นับจำนวน Audit Logs ที่ยังไม่ได้ Sync (สมมติใช้ column syncStatus หรือ check against server)
    // ในที่นี้เราจะเพิ่ม syncStatus ให้ตาราง stockAuditLogs ใน db/index.ts ด้วย
    pendingStockAuditCount.value = await db.stockAuditLogs
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count()
  }

  /**
   * Sync ข้อมูลผู้ใช้งาน (Users) ขึ้น Server
   * เพื่อแก้ปัญหาการติด Foreign Key ในตาราง Orders
   */
  async function syncUsers(): Promise<void> {
    const supabase = import.meta.client ? useSupabaseClient<any>() : null
    if (!supabase || !isOnline.value) return

    try {
      const localUsers = await db.users.toArray()
      if (localUsers.length === 0) return

      console.log(`📤 [useSync] กำลังซิงค์รายชื่อพนักงาน ${localUsers.length} ท่าน...`)

      const usersToSync = localUsers.map(u => ({
        uuid: u.uuid,
        username: u.username,
        display_name: u.displayName,
        role: u.role,
        pin: u.pin,
        is_active: u.isActive,
        is_deleted: u.isDeleted,
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('pos_users')
        .upsert(usersToSync, { onConflict: 'uuid' })

      if (error) throw error
      console.log('✅ [useSync] ซิงค์รายชื่อพนักงานสำเร็จ')
    } catch (err) {
      console.error('❌ [useSync] ซิงค์รายชื่อพนักงานล้มเหลว:', err)
      // ไม่หยุดการทำงานรวม แต่แจ้งเตือนใน Console
    }
  }

  /**
   * Sync หมวดหมู่สินค้า (Categories) ขึ้น Server
   */
  async function syncCategories(): Promise<void> {
    const supabase = import.meta.client ? useSupabaseClient<any>() : null
    if (!supabase || !isOnline.value) return

    try {
      const localItems = await db.categories.toArray()
      if (localItems.length === 0) return

      console.log(`📤 [useSync] กำลังซิงค์หมวดหมู่สินค้า ${localItems.length} รายการ...`)

      const itemsToSync = localItems.map(item => ({
        uuid: item.uuid,
        name: item.name,
        description: item.description,
        icon_url: item.iconUrl,
        color: item.color,
        sort_order: item.sortOrder,
        is_active: item.isActive,
        is_deleted: item.isDeleted,
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('categories')
        .upsert(itemsToSync, { onConflict: 'uuid' })

      if (error) throw error
      console.log('✅ [useSync] ซิงค์หมวดหมู่สินค้าสำเร็จ')
    } catch (err) {
      console.error('❌ [useSync] ซิงค์หมวดหมู่สินค้าล้มเหลว:', err)
    }
  }

  /**
   * Sync สินค้า (Products) ขึ้น Server
   */
  async function syncProducts(): Promise<void> {
    const supabase = import.meta.client ? useSupabaseClient<any>() : null
    if (!supabase || !isOnline.value) return

    try {
      const localItems = await db.products.toArray()
      if (localItems.length === 0) return

      console.log(`📤 [useSync] กำลังซิงค์ข้อมูลสินค้า ${localItems.length} รายการ...`)

      const itemsToSync = []
      for (const item of localItems) {
        // หา Category UUID จาก categoryId
        const cat = await db.categories.get(item.categoryId)
        const categoryUuid = cat?.uuid

        if (!categoryUuid) {
           console.warn(`⚠️ ข้ามสินค้า ${item.name}: ไม่พบรหัสหมวดหมู่สินค้า`)
           continue
        }

        itemsToSync.push({
          uuid: item.uuid,
          category_uuid: categoryUuid,
          sku: item.sku,
          name: item.name,
          description: item.description,
          image_url: item.imageUrl,
          sale_price: item.salePrice,
          cost_price: item.costPrice,
          stock_quantity: item.stockQuantity,
          alert_threshold: item.alertThreshold,
          track_inventory: item.trackInventory,
          mapping_type: item.mappingType,
          inventory_mappings: item.inventoryMappings,
          addon_groups: item.addonGroups,
          is_active: item.isActive,
          sort_order: item.sortOrder,
          is_deleted: item.isDeleted,
          updated_at: new Date().toISOString()
        })
      }

      if (itemsToSync.length === 0) return

      const { error } = await supabase
        .from('products')
        .upsert(itemsToSync, { onConflict: 'uuid' })

      if (error) throw error
      console.log('✅ [useSync] ซิงค์ข้อมูลสินค้าสำเร็จ')
    } catch (err) {
      console.error('❌ [useSync] ซิงค์ข้อมูลสินค้าล้มเหลว:', err)
    }
  }

  /**
   * Sync ประวัติการปรับสต็อก (Stock Audit Logs) ขึ้น Server
   */
  async function syncStockAuditLogs(force = false): Promise<{ success: number, failed: number, errors: string[] }> {
    const supabase = import.meta.client ? useSupabaseClient<any>() : null
    const result = { success: 0, failed: 0, errors: [] as string[] }
    
    if (!supabase || !isOnline.value) return result

    try {
      let query = db.stockAuditLogs.where('syncStatus').anyOf(['pending', 'failed'])
      
      if (!force) {
        query = query.filter(log => log.syncRetryCount < MAX_RETRY_COUNT)
      }

      const logsToSync = await query.toArray()
      if (logsToSync.length === 0) return result

      console.log(`📤 [useSync] กำลังซิงค์ประวัติสต็อก ${logsToSync.length} รายการ...`)

      for (const log of logsToSync) {
        // อัปเดตสถานะเป็นกำลังซิงค์
        await db.stockAuditLogs.update(log.id!, { syncStatus: 'syncing' })

        const { error } = await supabase
          .from('stock_audit_logs')
          .upsert({
            uuid: log.uuid,
            product_uuid: (await db.products.get(log.productId))?.uuid,
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
          }, { onConflict: 'uuid' })

        if (error) {
          result.failed++
          result.errors.push(`Stock [${log.productName}]: ${error.message}`)
          
          await db.stockAuditLogs.update(log.id!, {
            syncStatus: 'failed',
            syncRetryCount: log.syncRetryCount + 1,
            syncError: error.message
          })
          continue
        }

        result.success++
        await db.stockAuditLogs.update(log.id!, {
          syncStatus: 'synced',
          syncedAt: new Date(),
          syncError: undefined
        })
      }
      
      if (result.success > 0) console.log(`✅ [useSync] ซิงค์ประวัติสต็อกสำเร็จ ${result.success} รายการ`)
    } catch (err: any) {
      console.error('❌ [useSync] ซิงค์ประวัติสต็อกล้มเหลว:', err)
      result.errors.push(err.message)
    }
    return result
  }

  /**
   * Sync Order ทั้งหมดที่รอดำเนินการขึ้น Server
   * @param force หากเป็น true จะซิงค์ทุกรายการที่ยังไม่สำเร็จ โดยไม่สนจำนวนครั้งที่ลอง (Retry Count)
   */
  async function syncPendingOrders(force = false): Promise<{ 
    orders: { total: number, success: number, failed: number, errors: string[] },
    auditLogs: { total: number, success: number, failed: number, errors: string[] }
  }> {
    const summary = {
      orders: { total: 0, success: 0, failed: 0, errors: [] as string[] },
      auditLogs: { total: 0, success: 0, failed: 0, errors: [] as string[] }
    }

    console.log(`📡 [useSync] กำลังเตรียมการซิงค์... (Online: ${isOnline.value}, Syncing: ${isSyncing.value}, Force: ${force})`)
    
    if (!isOnline.value) {
      console.warn('⚠️ [useSync] ข้ามการซิงค์: ออฟไลน์')
      return summary
    }
    if (isSyncing.value) {
      console.warn('⚠️ [useSync] ข้ามการซิงค์: มีงานซิงค์เดิมกำลังทำงานอยู่')
      return summary
    }

    // 1. ซิงค์ข้อมูลหลักขึ้นไปก่อน (เป็น Background)
    syncUsers()
    syncCategories()
    syncProducts()

    // 2. ซิงค์ออร์เดอร์ที่ค้างอยู่
    let query = db.orders.where('syncStatus').anyOf(['pending', 'failed'])
    
    if (!force) {
      query = query.filter(order => order.syncRetryCount < MAX_RETRY_COUNT)
    }

    const pendingOrders = await query.toArray()
    summary.orders.total = pendingOrders.length

    if (pendingOrders.length > 0) {
      isSyncing.value = true
      console.log(`📤 [useSync] เริ่มส่งข้อมูล ${pendingOrders.length} รายการ...`)

      for (const order of pendingOrders) {
        const res = await syncSingleOrder(order)
        if (res.success) {
          summary.orders.success++
        } else {
          summary.orders.failed++
          if (res.error) summary.orders.errors.push(`Order [${order.orderNumber}]: ${res.error}`)
        }
      }
      isSyncing.value = false
    }

    // 3. ซิงค์ประวัติสต็อกด้วย
    const auditRes = await syncStockAuditLogs(force)
    summary.auditLogs.total = auditRes.success + auditRes.failed
    summary.auditLogs.success = auditRes.success
    summary.auditLogs.failed = auditRes.failed
    summary.auditLogs.errors = auditRes.errors

    lastSyncAt.value = new Date()
    await refreshPendingCount()
    
    return summary
  }

  /**
   * Sync Order เดียวขึ้น Server ผ่าน Supabase
   *
   * @param order - Order ที่ต้องการ Sync
   */
  async function syncSingleOrder(order: Order): Promise<{ success: boolean, error?: string }> {
      const supabase = import.meta.client ? useSupabaseClient<any>() : null

      if (!supabase) {
        return { success: false, error: 'Supabase Client not ready' }
      }

      // อัปเดตสถานะเป็น "กำลัง Sync"
      await updateSyncStatus(order.id!, 'syncing')

      try {
        // 1. แยกออร์เดอร์หลักกับไอเทมออกจากกัน
        const { items, id, createdAt, updatedAt, syncedAt, ...orderBaseInfo } = order
        
        // 2. ใช้ staffUuid จากออร์เดอร์ใหม่ (ถ้าเป็นออร์เดอร์เก่าที่ไม่มี staffUuid จะตกลงไปเป็น null)
        const staffUuid = orderBaseInfo.staffUuid || null

        // 3. Insert ออร์เดอร์หลัก (ใช้ order_number เป็น Conflict Target เพื่อแก้ 409)
        const { data: insertedOrder, error: orderError } = await supabase
          .from('orders')
          .upsert({
            uuid: orderBaseInfo.uuid,
            order_number: orderBaseInfo.orderNumber,
            staff_uuid: staffUuid, 
            staff_name: orderBaseInfo.staffName,
            subtotal: orderBaseInfo.subtotal,
            discount_amount: orderBaseInfo.discountAmount,
            tax_rate: orderBaseInfo.taxRate,
            tax_amount: orderBaseInfo.taxAmount,
            total_amount: orderBaseInfo.totalAmount,
            total_cost: orderBaseInfo.totalCost,
            profit_amount: orderBaseInfo.profitAmount,
            payment_method: orderBaseInfo.paymentMethod,
            amount_received: orderBaseInfo.amountReceived,
            change_amount: orderBaseInfo.changeAmount,
            status: orderBaseInfo.status,
            note: orderBaseInfo.note,
            delivery_ref: orderBaseInfo.deliveryRef,
            is_deleted: orderBaseInfo.isDeleted,
            created_at: new Date(createdAt).toISOString(),
            updated_at: new Date(updatedAt).toISOString()
          }, { onConflict: 'uuid' })
          .select('id')
          .single()

        if (orderError) {
          console.error(`❌ Supabase Order Error [${order.orderNumber}]:`, orderError)
          throw orderError
        }

      // 4. เตรียมข้อมูล Order Items สำหรับ Insert
      if (insertedOrder && insertedOrder.id) {
         // ลบรายการเดิมออกก่อนเพื่อกันไอเทมซ้ำกรณีซิงค์ใหม่
         await supabase.from('order_items').delete().eq('order_id', insertedOrder.id)

         const orderItemsData = order.items.map(item => ({
          order_id: insertedOrder.id,
          product_id: null, // ปล่อยว่างไว้เพราะ ID ของแต่ละเครื่องไม่ตรงกัน ให้ใช้ Name/UUID แทน
          product_uuid: item.productUuid,
          category_uuid: item.categoryUuid,
          product_name: item.productName,
          product_sku: item.productSku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          cost_price: item.costPrice,
          discount: item.discount, // แก้ชื่อฟิลด์จาก discount_amount เป็น discount ตาม Schema
          total_price: item.totalPrice,
          addons: item.addons,
          addons_total: item.addonsTotal,
          inventory_deductions: item.inventoryDeductions
         }))

         const { error: itemsError } = await supabase
           .from('order_items')
           .insert(orderItemsData)

         if (itemsError) throw itemsError
      }

      // Sync สำเร็จ
      await db.orders.update(order.id!, {
        syncStatus: 'synced' as SyncStatus,
        syncedAt: new Date(),
        syncError: undefined,
      })

      console.log(`✅ Sync Order ${order.orderNumber} เข้าสู่ Supabase สำเร็จ`)
      return { success: true }
    }
    catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const newRetryCount = order.syncRetryCount + 1

      await db.orders.update(order.id!, {
        syncStatus: 'failed' as SyncStatus,
        syncRetryCount: newRetryCount,
        syncError: errorMessage,
      })

      const delay = RETRY_DELAYS[Math.min(newRetryCount - 1, RETRY_DELAYS.length - 1)] ?? 60000
      console.warn(`⚠️ Sync Order ${order.orderNumber} ล้มเหลว (ครั้งที่ ${newRetryCount}): ${errorMessage} — จะ Retry ใน ${delay / 1000}s`)

      if (newRetryCount < MAX_RETRY_COUNT) {
        setTimeout(() => {
          if (isOnline.value) syncSingleOrder({ ...order, syncRetryCount: newRetryCount })
        }, delay)
      }
      
      return { success: false, error: errorMessage }
    }
  }

  /**
   * ดักจับและดึงออร์เดอร์จาก Cloud ลงเครื่อง (Sync Down)
   */
  async function fetchRemoteOrders(limit = 100): Promise<number> {
    const supabase = import.meta.client ? useSupabaseClient<any>() : null
    if (!supabase) return 0

    console.log('📡 [useSync] กำลังดึงข้อมูลจาก Cloud...')
    
    const { data: remoteOrders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ Fetch Remote Orders Error:', error)
      throw error
    }

    if (!remoteOrders || remoteOrders.length === 0) {
      console.log('ℹ️ [useSync] ไม่พบออร์เดอร์ใน Cloud')
      return 0
    }

    let count = 0
    for (const remote of remoteOrders) {
      const existing = await db.orders.where('uuid').equals(remote.uuid).first()
      
      if (!existing) {
        // เตรียมไอเทมและพยายามหา Product ID ในเครื่องจาก UUID หรือ SKU
        const processedItems: OrderItem[] = []
        for (const item of remote.order_items) {
          let productId: number | undefined = undefined
          let categoryId: number | undefined = undefined

          // 1. ค้นหาจาก UUID (แม่นยำที่สุด)
          if (item.product_uuid) {
            const p = await db.products.where('uuid').equals(item.product_uuid).first()
            productId = p?.id
            categoryId = p?.categoryId
          } 
          // 2. ถ้าหาไม่เจอ ลองค้นจาก SKU (สำรอง)
          else if (item.product_sku) {
            const p = await db.products.where('sku').equals(item.product_sku).first()
            productId = p?.id
            categoryId = p?.categoryId
          }

          // ค้นหา Category ID จาก category_uuid หากยังไม่มี
          if (!categoryId && item.category_uuid) {
            const c = await db.categories.where('uuid').equals(item.category_uuid).first()
            categoryId = c?.id
          }

          processedItems.push({
            productId: productId || 0,
            productUuid: item.product_uuid || '',
            categoryId: categoryId || 0,
            categoryUuid: item.category_uuid || '',
            productName: item.product_name,
            productSku: item.product_sku,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            costPrice: Number(item.cost_price),
            discount: Number(item.discount || 0),
            totalPrice: Number(item.total_price),
            addonsTotal: Number(item.addons_total || 0),
            addons: item.addons || [],
            inventoryDeductions: item.inventory_deductions || []
          })
        }

        const orderToSave: Order = {
          uuid: remote.uuid,
          orderNumber: remote.order_number,
          staffId: 1, // fallback to local admin
          staffUuid: remote.staff_id || '',
          staffName: remote.staff_name,
          subtotal: Number(remote.subtotal),
          discountAmount: Number(remote.discount_amount),
          taxRate: Number(remote.tax_rate),
          taxAmount: Number(remote.tax_amount || 0),
          totalAmount: Number(remote.total_amount),
          totalCost: Number(remote.total_cost),
          profitAmount: Number(remote.profit_amount),
          paymentMethod: remote.payment_method,
          amountReceived: Number(remote.amount_received),
          changeAmount: Number(remote.change_amount),
          status: remote.status,
          note: remote.note,
          deliveryRef: remote.delivery_ref,
          isDeleted: remote.is_deleted,
          syncStatus: 'synced',
          syncRetryCount: 0,
          syncedAt: new Date(remote.updated_at),
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          items: processedItems
        }

        await db.orders.add(orderToSave)
        count++
      }
    }
    
    console.log(`✅ [useSync] ดึงข้อมูลเสร็จสิ้น: นำเข้า ${count} รายการใหม่`)
    await refreshPendingCount()
    return count
  }

  /**
   * ดึงเลขลำดับบิลล่าสุดของเครื่องนี้จาก Cloud
   * @param deviceCode รหัสเครื่องที่ระบุใน Settings
   */
  async function getLastRemoteOrderSequence(deviceCode: string): Promise<number> {
    const supabase = import.meta.client ? useSupabaseClient<any>() : null
    if (!supabase || !deviceCode) return 0

    console.log(`📡 [useSync] กำลังตรวจสอบลำดับบิลล่าสุดของเครื่อง ${deviceCode}...`)

    // ค้นหาออร์เดอร์ล่าสุดที่ขึ้นต้นด้วยรหัสเครื่องนี้
    // เลขบิลรูปแบบ: YUM-YYYYMMDD-[DEVICE]-XXXX
    const { data, error } = await supabase
      .from('orders')
      .select('order_number')
      .ilike('order_number', `%-${deviceCode}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 คือไม่พบข้อมูล (ซึ่งปกติ)
      console.error('❌ Get Remote Sequence Error:', error)
      return 0
    }

    if (!data) return 0

    // ดึงเลข 4 ตัวท้ายออกมา (XXXX)
    const parts = data.order_number.split('-')
    const lastSeqStr = parts[parts.length - 1]
    const lastSeq = parseInt(lastSeqStr, 10)

    console.log(`ℹ️ [useSync] พบลำดับล่าสุดบน Cloud: ${lastSeq}`)
    return isNaN(lastSeq) ? 0 : lastSeq
  }

  /**
   * อัปเดตสถานะ Sync ของ Order
   */
  async function updateSyncStatus(orderId: number, status: SyncStatus): Promise<void> {
    await db.orders.update(orderId, { syncStatus: status })
  }

  return {
    isSyncing,
    isOnline,
    pendingCount,
    lastSyncAt,
    setupNetworkListener,
    syncPendingOrders,
    refreshPendingCount,
    fetchRemoteOrders,
    getLastRemoteOrderSequence,
    pendingStockAuditCount,
    startHeartbeatSync: () => {
      if (syncIntervalId.value) return
      //Sync ครั้งแรกทันที
      syncPendingOrders()
      //Set interval ทุก 5 นาที
      syncIntervalId.value = setInterval(() => {
        if (isOnline.value && !isSyncing.value) {
          syncPendingOrders()
        }
      }, 5 * 60 * 1000)
    },
    stopHeartbeatSync: () => {
      if (syncIntervalId.value) {
        clearInterval(syncIntervalId.value)
        syncIntervalId.value = null
      }
    }
  }
}
