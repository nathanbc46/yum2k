// =============================================================================
// composables/useSync.ts
// Composable สำหรับ Background Sync: ส่งข้อมูลออร์เดอร์ขึ้น Server
// รองรับ Offline-first: Retry อัตโนมัติเมื่อมีอินเตอร์เน็ต
// =============================================================================

import { db } from '~/db'
import type { Order, SyncStatus } from '~/types'

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
   * Sync Order ทั้งหมดที่รอดำเนินการขึ้น Server
   * @param force หากเป็น true จะซิงค์ทุกรายการที่ยังไม่สำเร็จ โดยไม่สนจำนวนครั้งที่ลอง (Retry Count)
   */
  async function syncPendingOrders(force = false): Promise<void> {
    console.log(`📡 [useSync] กำลังเตรียมการซิงค์... (Online: ${isOnline.value}, Syncing: ${isSyncing.value}, Force: ${force})`)
    
    if (!isOnline.value) {
      console.warn('⚠️ [useSync] ข้ามการซิงค์: ออฟไลน์')
      return
    }
    if (isSyncing.value) {
      console.warn('⚠️ [useSync] ข้ามการซิงค์: มีงานซิงค์เดิมกำลังทำงานอยู่')
      return
    }

    // ดึง Orders ที่รอ Sync
    let query = db.orders.where('syncStatus').anyOf(['pending', 'failed'])
    
    // ถ้าไม่ใช่ Force Sync ให้กรองเฉพาะที่ Retry ไม่เกินกำหนด
    if (!force) {
      query = query.filter(order => order.syncRetryCount < MAX_RETRY_COUNT)
    }

    const pendingOrders = await query.toArray()

    if (pendingOrders.length === 0) {
      console.log('ℹ️ [useSync] ไม่มีออเดอร์ค้างส่งที่เข้าเงื่อนไข')
      await refreshPendingCount()
      return
    }

    isSyncing.value = true
    console.log(`📤 [useSync] เริ่มส่งข้อมูล ${pendingOrders.length} รายการ (Force: ${force})...`)

    for (const order of pendingOrders) {
      await syncSingleOrder(order)
    }

    // ต่อด้วยการซิงค์ประวัติสต็อก
    await syncStockAuditLogs(force)

    isSyncing.value = false
    lastSyncAt.value = new Date()
    await refreshPendingCount()
  }

  /**
   * Sync ประวัติการปรับสต็อก (StockAuditLogs)
   */
  async function syncStockAuditLogs(force = false): Promise<void> {
    const supabase = import.meta.client ? useSupabaseClient<any>() : null
    if (!supabase) return

    let query = db.stockAuditLogs.where('syncStatus').anyOf(['pending', 'failed'])
    const pendingLogs = await query.toArray()

    if (pendingLogs.length === 0) return

    console.log(`📤 [useSync] เริ่มส่งประวัติสต็อก ${pendingLogs.length} รายการ...`)

    for (const log of pendingLogs) {
      try {
        await db.stockAuditLogs.update(log.id!, { syncStatus: 'syncing' })

        const { error } = await supabase
          .from('stock_audit_logs')
          .upsert({
            uuid: log.uuid,
            product_name: log.productName,
            change_quantity: log.changeQuantity,
            previous_quantity: log.previousQuantity,
            new_quantity: log.newQuantity,
            reason: log.reason,
            note: log.note,
            staff_uuid: log.staffUuid,
            staff_name: log.staffName,
            created_at: new Date(log.createdAt).toISOString()
          }, { onConflict: 'uuid' })

        if (error) throw error

        await db.stockAuditLogs.update(log.id!, {
          syncStatus: 'synced',
          syncedAt: new Date()
        })
      } catch (err) {
        console.error(`❌ Sync Stock Log ${log.uuid} ล้มเหลว:`, err)
        await db.stockAuditLogs.update(log.id!, { syncStatus: 'failed' })
      }
    }
  }

  /**
   * Sync Order เดียวขึ้น Server ผ่าน Supabase
   *
   * @param order - Order ที่ต้องการ Sync
   */
  async function syncSingleOrder(order: Order): Promise<void> {
      const supabase = import.meta.client ? useSupabaseClient<any>() : null

      if (!supabase) {
        throw new Error('Supabase Client not ready')
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
            staff_id: staffUuid, 
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
          }, { onConflict: 'order_number' })
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

         const orderItemsData = items.map(item => ({
          order_id: insertedOrder.id,
          product_id: null,
          product_name: item.productName,
          product_sku: item.productSku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          cost_price: item.costPrice,
          discount: item.discount,
          total_price: item.totalPrice,
          addons: item.addons, // เพิ่ม Add-ons เข้าไปใน JSONB column
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
        // เตรียมไอเทมและพยายามหา Product ID ในเครื่องจาก SKU
        const processedItems = []
        for (const item of remote.order_items) {
          let productId: number | undefined = undefined
          if (item.product_sku) {
            const p = await db.products.where('sku').equals(item.product_sku).first()
            productId = p?.id
          }

          processedItems.push({
            productId: productId || 0, // Fallback เป็น 0 เพื่อให้ Type ไม่ Error
            categoryId: item.category_id || undefined, // เพิ่ม categoryId
            productName: item.product_name,
            productSku: item.product_sku,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            costPrice: Number(item.cost_price),
            discount: Number(item.discount),
            totalPrice: Number(item.total_price),
            addonsTotal: Number(item.addons_total || 0), // เพิ่ม addonsTotal
            addons: item.addons,
            inventoryDeductions: item.inventory_deductions
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
