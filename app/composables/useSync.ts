// =============================================================================
// composables/useSync.ts
// Composable สำหรับ Background Sync: ส่งข้อมูลออร์เดอร์ขึ้น Server
// รองรับ Offline-first: Retry อัตโนมัติเมื่อมีอินเตอร์เน็ต
// =============================================================================

import { db } from '~/db'
import type { Order, SyncStatus, OrderItem, InventoryDeduction } from '~/types'
import { useMasterDataSync } from './useMasterDataSync'
import { useToast } from './useToast'

// จำนวนครั้งสูงสุดที่จะ Retry ก่อนหยุด
const MAX_RETRY_COUNT = 5

// Delay ระหว่าง Retry (Exponential Backoff ใน ms)
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000]

// --- Global State (Shared across all components) ---
const isSyncing = ref(false)
const isOnline = ref(import.meta.client ? navigator.onLine : true)
const pendingCount = ref(0)
const pendingStockAuditCount = ref(0)
const lastSyncAt = ref<Date | null>(null)
const syncIntervalId = ref<any>(null)

// Countdown ร่วมกันกับ Background Heartbeat Sync (หน่วย: วินาที)
const HEARTBEAT_SECONDS = 5 * 60
const nextSyncCountdown = ref(HEARTBEAT_SECONDS)

export function useSync() {
  const toast = useToast()
  const masterSync = useMasterDataSync()
  const supabase = import.meta.client ? useSupabaseClient<any>() : null

  // ---------------------------------------------------------------------------
  // Network Status Monitoring
  // ---------------------------------------------------------------------------

  function setupNetworkListener(): () => void {
    const onOnline = () => {
      isOnline.value = true
      console.log('🌐 มีอินเตอร์เน็ตแล้ว — รอ 3 วินาทีก่อน Sync...')
      // delay เล็กน้อยเพราะ browser online event อาจ fire ก่อนที่สัญญาณจะพร้อมจริงๆ
      setTimeout(() => {
        if (navigator.onLine) syncPendingOrders()
      }, 3000)
    }

    const onOffline = () => {
      isOnline.value = false
      console.log('📵 ไม่มีอินเตอร์เน็ต — ข้อมูลจะถูก Sync เมื่อมีสัญญาณ')
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }

  // ---------------------------------------------------------------------------
  // Sync Logic
  // ---------------------------------------------------------------------------

  async function refreshPendingCount(): Promise<void> {
    pendingCount.value = await db.orders
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count()
    
    pendingStockAuditCount.value = await db.stockAuditLogs
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count()
  }


  /**
   * Sync Order ทั้งหมดที่รอดำเนินการขึ้น Server
   */
  async function syncPendingOrders(force = false): Promise<{ 
    orders: { total: number, success: number, failed: number, errors: string[] },
    auditLogs: { total: number, success: number, failed: number, errors: string[] },
    categories: number,
    products: number
  }> {
    const summary = {
      orders: { total: 0, success: 0, failed: 0, errors: [] as string[] },
      auditLogs: { total: 0, success: 0, failed: 0, errors: [] as string[] },
      categories: 0,
      products: 0
    }

    // ตรวจสอบ navigator.onLine โดยตรง (real-time) แทน cached isOnline ref
    // เพื่อป้องกัน race condition ที่ isOnline=true แต่จริงๆ ยังไม่มีสัญญาณ
    if (!navigator.onLine || isSyncing.value) return summary
    isOnline.value = navigator.onLine // sync ค่าให้ตรงกัน

    // 1. Sync Master Data (Delta Push Categories, Products, Stock Logs)
    const masterRes = await masterSync.pushAll().catch(err => {
      console.error('❌ Master Push Error:', err)
      return { categories: 0, products: 0, stockLogs: 0 }
    })

    // 2. Sync Pending Orders
    let query = db.orders.where('syncStatus').anyOf(['pending', 'failed'])
    if (!force) {
      query = query.filter(order => order.syncRetryCount < MAX_RETRY_COUNT)
    }

    const pendingOrders = await query.toArray()
    summary.orders.total = pendingOrders.length

    if (pendingOrders.length > 0) {
      isSyncing.value = true
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

    // 3. Sync Audit Logs
    summary.auditLogs.success = masterRes.stockLogs
    summary.auditLogs.total = masterRes.stockLogs
    
    // 4. Master Data Counts
    summary.categories = masterRes.categories
    summary.products = masterRes.products

    lastSyncAt.value = new Date()
    await refreshPendingCount()

    // --- แจ้งเตือนการซิงค์เบื้องหลัง ---
    const totalMasterPushed = summary.categories + summary.products
    const hasSuccessfulSync = summary.orders.success > 0 || summary.auditLogs.success > 0 || totalMasterPushed > 0

    if (!force && hasSuccessfulSync) {
      const msg = [
        '🔄 ซิงค์ข้อมูลอัตโนมัติสำเร็จ',
        summary.categories > 0 ? `• หมวดหมู่: ${summary.categories} รายการ` : '',
        summary.products > 0 ? `• สินค้า: ${summary.products} รายการ` : '',
        summary.orders.success > 0 ? `• ออร์เดอร์: ${summary.orders.success} รายการ` : '',
        summary.auditLogs.success > 0 ? `• ประวัติสต็อก: ${summary.auditLogs.success} รายการ` : ''
      ].filter(Boolean).join('\n')
      
      toast.success(msg, 4000)
    }

    if (!force && (summary.orders.failed > 0 || summary.auditLogs.failed > 0)) {
      toast.warning(`⚠️ การซิงค์อัตโนมัติมีข้อผิดพลาด (${summary.orders.failed + summary.auditLogs.failed} รายการ)\nระบบจะพยายามใหม่เมื่อสัญญาณดีขึ้น`, 5000)
    }
    
    return summary
  }

  async function syncSingleOrder(order: Order): Promise<{ success: boolean, error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase Client not ready' }

    await db.orders.update(order.id!, { syncStatus: 'syncing' })

    try {
      const { items, id, createdAt, updatedAt, syncedAt, ...orderBaseInfo } = order
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .upsert({
          uuid: orderBaseInfo.uuid,
          order_number: orderBaseInfo.orderNumber,
          staff_uuid: orderBaseInfo.staffUuid || null, 
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
          cash_denominations: orderBaseInfo.cashDenominations,
          is_deleted: orderBaseInfo.isDeleted,
          created_at: new Date(createdAt).toISOString(),
          updated_at: new Date(updatedAt).toISOString()
        }, { onConflict: 'uuid' })
        .select('id')
        .single()

      if (orderError) throw orderError

      if (insertedOrder?.id) {
         await supabase.from('order_items').delete().eq('order_id', insertedOrder.id)
         const orderItemsData = order.items.map(item => ({
          order_id: insertedOrder.id,
          product_uuid: item.productUuid,
          category_uuid: item.categoryUuid,
          product_name: item.productName,
          product_sku: item.productSku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          cost_price: item.costPrice,
          discount: item.discount,
          total_price: item.totalPrice,
          addons: item.addons,
          addons_total: item.addonsTotal,
          inventory_deductions: item.inventoryDeductions
         }))
         const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
         if (itemsError) throw itemsError
      }

      await db.orders.update(order.id!, {
        syncStatus: 'synced',
        syncedAt: new Date(),
        syncError: undefined,
      })
      return { success: true }
    } catch (error: any) {
      const newRetryCount = order.syncRetryCount + 1
      await db.orders.update(order.id!, {
        syncStatus: 'failed',
        syncRetryCount: newRetryCount,
        syncError: error.message,
      })
      return { success: false, error: error.message }
    }
  }

  async function fetchRemoteOrders(limit = 100, includeMasterData = true): Promise<number> {
    if (!supabase) return 0

    if (includeMasterData) {
      await masterSync.pullAll().catch(err => console.error('⚠️ Master Pull Error:', err))
    }

    const { data: remoteOrders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    if (!remoteOrders?.length) return 0

    // --- Bulk Fetch: สร้าง Maps ก่อนเข้าลูปหลัก ---
    // ดึงออร์เดอร์ที่มีอยู่แล้วมาตรวจสอบ Bulk เพื่อหาเฉพาะรายการใหม่
    const remoteUuids = remoteOrders.map(o => o.uuid)
    const existingOrders = await db.orders.where('uuid').anyOf(remoteUuids).toArray()
    const existingUuids = new Set(existingOrders.map(o => o.uuid))

    // รวบรวม UUID ของสินค้าและหมวดหมู่ที่ต้องการทั้งหมดจากออร์เดอร์ใหม่
    const newOrders = remoteOrders.filter(o => !existingUuids.has(o.uuid))
    if (newOrders.length === 0) return 0

    const productUuidsNeeded = new Set<string>()
    const categoryUuidsNeeded = new Set<string>()
    for (const remote of newOrders) {
      for (const item of remote.order_items) {
        if (item.product_uuid) productUuidsNeeded.add(item.product_uuid)
        if (item.category_uuid) categoryUuidsNeeded.add(item.category_uuid)
      }
    }

    // ดึงสินค้าและหมวดหมู่ที่ต้องการทั้งหมดในครั้งเดียว
    const [matchedProducts, matchedCategories] = await Promise.all([
      db.products.where('uuid').anyOf([...productUuidsNeeded]).toArray(),
      db.categories.where('uuid').anyOf([...categoryUuidsNeeded]).toArray(),
    ])
    const prodUuidToLocalId = new Map(matchedProducts.map(p => [p.uuid, { id: p.id!, categoryId: p.categoryId }]))
    const catUuidToLocalId = new Map(matchedCategories.map(c => [c.uuid, c.id!]))

    // --- ประมวลผลออร์เดอร์ใหม่ทุกรายการ ---
    let count = 0
    for (const remote of newOrders) {
      const processedItems: OrderItem[] = remote.order_items.map((item: any) => {
        const prodInfo = prodUuidToLocalId.get(item.product_uuid)
        const categoryId = prodInfo?.categoryId ?? catUuidToLocalId.get(item.category_uuid) ?? 0

        return {
          productId: prodInfo?.id || 0,
          productUuid: item.product_uuid || '',
          categoryId,
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
        }
      })

      await db.orders.add({
        uuid: remote.uuid,
        orderNumber: remote.order_number,
        staffId: 1,
        staffUuid: remote.staff_uuid || remote.staff_id || '',
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
        cashDenominations: remote.cash_denominations,
        isDeleted: remote.is_deleted,
        syncStatus: 'synced',
        syncRetryCount: 0,
        syncedAt: new Date(remote.updated_at),
        createdAt: new Date(remote.created_at),
        updatedAt: new Date(remote.updated_at),
        items: processedItems
      })
      count++
    }

    await refreshPendingCount()
    return count
  }

  async function getLastRemoteOrderSequence(deviceCode: string): Promise<number> {
    if (!supabase || !deviceCode) return 0
    const { data, error } = await supabase
      .from('orders')
      .select('order_number')
      .ilike('order_number', `%-${deviceCode}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (!data) return 0
    const parts = data.order_number.split('-')
    return parseInt(parts[parts.length - 1], 10) || 0
  }

  async function updateSyncStatus(orderId: number, status: SyncStatus): Promise<void> {
    await db.orders.update(orderId, { syncStatus: status })
  }

  return {
    isSyncing,
    isOnline,
    pendingCount,
    pendingStockAuditCount,
    lastSyncAt,
    setupNetworkListener,
    syncPendingOrders,
    refreshPendingCount,
    fetchRemoteOrders,
    getLastRemoteOrderSequence,
    nextSyncCountdown,
    startHeartbeatSync: () => {
      if (syncIntervalId.value) return
      // เรียก Sync ทันทีเมื่อเริ่ม (ไม่ await เพื่อไม่ block การตั้ง interval)
      if (isOnline.value) syncPendingOrders()
      nextSyncCountdown.value = HEARTBEAT_SECONDS
      // Countdown วิ่งทุก 1 วินาทีเสมอ ไม่มีการหยุด
      // guard สำหรับ isSyncing อยู่เฉพาะตอนจะ trigger sync เท่านั้น (ไม่ใช่ตอน decrement)
      syncIntervalId.value = setInterval(() => {
        if (nextSyncCountdown.value > 0) {
          nextSyncCountdown.value--
        } else {
          nextSyncCountdown.value = HEARTBEAT_SECONDS
          if (isOnline.value && !isSyncing.value) syncPendingOrders()
        }
      }, 1000)
    },
    stopHeartbeatSync: () => {
      if (syncIntervalId.value) {
        clearInterval(syncIntervalId.value)
        syncIntervalId.value = null
      }
    }
  }
}
