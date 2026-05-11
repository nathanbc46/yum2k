// =============================================================================
// composables/useSync.ts
// Composable สำหรับ Background Sync: ส่งข้อมูลออร์เดอร์ขึ้น Server
// รองรับ Offline-first: Retry อัตโนมัติเมื่อมีอินเตอร์เน็ต
// =============================================================================

import { db } from '~/db'
import type { Order, SyncStatus, OrderItem, InventoryDeduction } from '~/types'
import { useMasterDataSync } from './useMasterDataSync'
import { useDailyStockSnapshot } from './useDailyStockSnapshot'
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
const pendingExpenseCount = ref(0)
const pendingSnapshotCount = ref(0)
const lastSyncAt = ref<Date | null>(null)
const syncIntervalId = ref<any>(null)

// Countdown: ใช้ target timestamp แทน decrement ทุก 1 วินาที
const HEARTBEAT_SECONDS = 5 * 60
const HEARTBEAT_MS = HEARTBEAT_SECONDS * 1000
const nextSyncCountdown = ref(HEARTBEAT_SECONDS)
let _nextSyncAt = 0

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

    pendingExpenseCount.value = await db.expenses
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count()

    pendingSnapshotCount.value = await db.dailyStockSnapshots
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
    products: number,
    expenses: number,
    stockSnapshots: number
  }> {
    const summary = {
      orders: { total: 0, success: 0, failed: 0, errors: [] as string[] },
      auditLogs: { total: 0, success: 0, failed: 0, errors: [] as string[] },
      categories: 0,
      products: 0,
      expenses: 0,
      stockSnapshots: 0
    }

    // ตรวจสอบ navigator.onLine โดยตรง (real-time) แทน cached isOnline ref
    if (!navigator.onLine || isSyncing.value) return summary
    isOnline.value = navigator.onLine

    // ตรวจสอบ Supabase session ก่อน sync
    // autoRefreshToken=false หมายความว่า token ไม่ refresh เอง → ต้อง re-auth เองเมื่อหมดอายุ
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      const tokenValid = session?.expires_at && (session.expires_at * 1000) > Date.now() + 60_000
      if (!tokenValid) {
        // token หมดอายุหรือใกล้หมด → re-auth ด้วย device credentials
        const config = useRuntimeConfig()
        const email = config.public.supabaseDeviceEmail as string | undefined
        const password = config.public.supabaseDevicePassword as string | undefined
        if (email && password) {
          try {
            const { error } = await withTimeout(
              supabase.auth.signInWithPassword({ email, password }),
              10_000
            )
            if (error) {
              console.warn('⚠️ Session หมดอายุ — re-auth ล้มเหลว ข้าม sync:', error.message)
              return summary
            }
            console.log('🔄 Session refresh สำเร็จ — ดำเนินการ sync ต่อ')
          } catch (err: any) {
            console.warn('⚠️ Session refresh timeout — ข้าม sync รอบนี้:', err?.message)
            return summary
          }
        } else {
          console.warn('⚠️ ไม่มี device credentials — ข้าม sync')
          return summary
        }
      }
    }

    isSyncing.value = true
    try {
      // 1. Sync Master Data (Delta Push Stock Logs)
      const masterRes = await masterSync.pushAll().catch(err => {
        console.error('❌ Master Push Error:', err)
        return { categories: 0, products: 0, stockLogs: 0 }
      })

      // 2. Sync Daily Stock Snapshots (ถ่ายสต็อกสิ้นวัน)
      const snapshotSync = useDailyStockSnapshot()
      summary.stockSnapshots = await snapshotSync.pushSnapshots().catch(err => {
        console.warn('⚠️ Stock Snapshot Push Error:', err)
        return 0
      })

      // 3. Sync Pending Expenses (รายจ่าย)
      const pendingExpenses = await db.expenses
        .where('syncStatus')
        .anyOf(['pending', 'failed'])
        .toArray()

      for (const expense of pendingExpenses) {
        const res = await syncSingleExpense(expense)
        if (res.success) summary.expenses++
      }

      // 4. Sync Pending Orders
      let query = db.orders.where('syncStatus').anyOf(['pending', 'failed'])
      if (!force) {
        query = query.filter(order => order.syncRetryCount < MAX_RETRY_COUNT)
      }
      const pendingOrders = await query.toArray()
      summary.orders.total = pendingOrders.length

      for (const order of pendingOrders) {
        if (!isOnline.value) break
        const res = await syncSingleOrder(order)
        if (res.success) {
          summary.orders.success++
        } else {
          summary.orders.failed++
          if (res.error) summary.orders.errors.push(`Order [${order.orderNumber}]: ${res.error}`)
          if (res.isNetworkError) break
        }
      }

      // 5. Master Data Counts
      summary.auditLogs.success = masterRes.stockLogs
      summary.auditLogs.total = masterRes.stockLogs
      summary.categories = masterRes.categories
      summary.products = masterRes.products
    } finally {
      // รับประกันว่า isSyncing จะ reset เสมอ ไม่ว่าจะเกิด error หรือไม่
      isSyncing.value = false
    }

    lastSyncAt.value = new Date()
    await refreshPendingCount()

    // --- แจ้งเตือนการซิงค์เบื้องหลัง ---
    const totalMasterPushed = summary.categories + summary.products
    const hasSuccessfulSync = summary.orders.success > 0 || summary.auditLogs.success > 0 || totalMasterPushed > 0 || summary.stockSnapshots > 0

    if (!force && hasSuccessfulSync) {
      const msg = [
        '🔄 ซิงค์ข้อมูลอัตโนมัติสำเร็จ',
        summary.categories > 0 ? `• หมวดหมู่: ${summary.categories} รายการ` : '',
        summary.products > 0 ? `• สินค้า: ${summary.products} รายการ` : '',
        summary.orders.success > 0 ? `• ออร์เดอร์: ${summary.orders.success} รายการ` : '',
        summary.auditLogs.success > 0 ? `• ประวัติสต็อก: ${summary.auditLogs.success} รายการ` : '',
        summary.expenses > 0 ? `• รายจ่าย: ${summary.expenses} รายการ` : '',
        summary.stockSnapshots > 0 ? `• สต็อกสิ้นวัน: ${summary.stockSnapshots} รายการ` : ''
      ].filter(Boolean).join('\n')
      
      toast.success(msg, 4000)
    }

    if (!force && (summary.orders.failed > 0 || summary.auditLogs.failed > 0)) {
      toast.warning(`⚠️ การซิงค์อัตโนมัติมีข้อผิดพลาด (${summary.orders.failed + summary.auditLogs.failed} รายการ)\nระบบจะพยายามใหม่เมื่อสัญญาณดีขึ้น`, 5000)
    }
    
    return summary
  }

  function isNetworkError(error: any): boolean {
    return error instanceof TypeError ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('network')
  }

  async function syncSingleOrder(order: Order): Promise<{ success: boolean, isNetworkError?: boolean, error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase Client not ready' }

    await db.orders.update(order.id!, { syncStatus: 'syncing' })

    try {
      const { items, id, createdAt, updatedAt, syncedAt, ...orderBaseInfo } = order
      const { data: insertedOrder, error: orderError } = await withTimeout(
        supabase
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
            kitchen_status: orderBaseInfo.kitchenStatus || 'pending',
            note: orderBaseInfo.note,
            delivery_ref: orderBaseInfo.deliveryRef,
            cash_denominations: orderBaseInfo.cashDenominations,
            is_deleted: orderBaseInfo.isDeleted,
            created_at: new Date(createdAt).toISOString(),
            updated_at: new Date(updatedAt).toISOString()
          }, { onConflict: 'uuid' })
          .select('id')
          .single()
      )

      if (orderError) throw orderError

      if (insertedOrder?.id) {
        await withTimeout(
          supabase.from('order_items').delete().eq('order_id', insertedOrder.id)
        )
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
        const { error: itemsError } = await withTimeout(
          supabase.from('order_items').insert(orderItemsData)
        )
        if (itemsError) throw itemsError
      }

      await db.orders.update(order.id!, {
        syncStatus: 'synced',
        syncedAt: new Date(),
        syncError: undefined,
      })
      return { success: true }
    } catch (error: any) {
      const networkErr = isNetworkError(error)
      if (networkErr) isOnline.value = false
      const newRetryCount = order.syncRetryCount + 1
      await db.orders.update(order.id!, {
        syncStatus: 'failed',
        syncRetryCount: newRetryCount,
        syncError: error.message,
      })
      return { success: false, isNetworkError: networkErr, error: error.message }
    }
  }

  async function syncSingleExpense(expense: any): Promise<{ success: boolean, isNetworkError?: boolean, error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase Client not ready' }

    try {
      const { id, createdAt, updatedAt, syncedAt, ...baseInfo } = expense
      const { error } = await withTimeout(
        supabase.from('expenses').upsert({
          uuid: baseInfo.uuid,
          category: baseInfo.category,
          amount: baseInfo.amount,
          description: baseInfo.description,
          expense_date: baseInfo.expenseDate,
          recorded_by: baseInfo.recordedBy,
          staff_id: baseInfo.staffId,
          staff_uuid: baseInfo.staffUuid,
          is_deleted: baseInfo.isDeleted ? 1 : 0,
          created_at: new Date(createdAt).toISOString(),
          updated_at: new Date(updatedAt).toISOString()
        }, { onConflict: 'uuid' })
      )

      if (error) throw error

      await db.expenses.update(expense.id!, {
        syncStatus: 'synced',
        syncedAt: new Date()
      })
      return { success: true }
    } catch (error: any) {
      const networkErr = isNetworkError(error)
      if (networkErr) isOnline.value = false
      console.error('Sync expense error:', error)
      return { success: false, isNetworkError: networkErr, error: error.message }
    }
  }

  async function fetchRemoteOrders(limit = 100, includeMasterData = true): Promise<number> {
    if (!supabase) return 0

    if (includeMasterData) {
      await masterSync.pullAll().catch(err => console.error('⚠️ Master Pull Error:', err))
    }

    const { data: remoteOrders, error } = await withTimeout(
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(limit)
    )

    if (error) throw error
    if (!remoteOrders?.length) return 0

    // --- Bulk Fetch: สร้าง Maps ก่อนเข้าลูปหลัก ---
    // ดึงออร์เดอร์ที่มีอยู่แล้วมาตรวจสอบ Bulk เพื่อหาเฉพาะรายการใหม่
    const remoteUuids = remoteOrders.map(o => o.uuid)
    const existingOrders = await db.orders.where('uuid').anyOf(remoteUuids).toArray()
    const existingUuids = new Set(existingOrders.map(o => o.uuid))

    // --- เตรียมข้อมูลสินค้าและหมวดหมู่ ---
    const productUuidsNeeded = new Set<string>()
    const categoryUuidsNeeded = new Set<string>()
    for (const remote of remoteOrders) {
      for (const item of remote.order_items) {
        if (item.product_uuid) productUuidsNeeded.add(item.product_uuid)
        if (item.category_uuid) categoryUuidsNeeded.add(item.category_uuid)
      }
    }

    const [matchedProducts, matchedCategories] = await Promise.all([
      db.products.where('uuid').anyOf([...productUuidsNeeded]).toArray(),
      db.categories.where('uuid').anyOf([...categoryUuidsNeeded]).toArray(),
    ])
    const prodUuidToLocalId = new Map(matchedProducts.map(p => [p.uuid, { id: p.id!, categoryId: p.categoryId }]))
    const catUuidToLocalId = new Map(matchedCategories.map(c => [c.uuid, c.id!]))

    // --- ประมวลผลออร์เดอร์ ---
    let count = 0
    
    await db.transaction('rw', db.orders, async () => {
      for (const remote of remoteOrders) {
        const existing = existingOrders.find(o => o.uuid === remote.uuid)
        
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

        const orderData = {
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
          kitchenStatus: remote.kitchen_status || 'pending',
          note: remote.note,
          deliveryRef: remote.delivery_ref,
          cashDenominations: remote.cash_denominations,
          isDeleted: remote.is_deleted,
          syncStatus: 'synced' as SyncStatus,
          syncRetryCount: 0,
          syncedAt: new Date(remote.updated_at),
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          items: processedItems
        }

        if (existing) {
          // ถ้ามีอยู่แล้ว ตรวจสอบว่าข้อมูลบน Cloud ใหม่กว่าหรือไม่
          const remoteDate = new Date(remote.updated_at)
          const localDate = new Date(existing.updatedAt)
          
          if (remoteDate > localDate) {
            await db.orders.update(existing.id!, orderData)
            count++
          }
        } else {
          // ถ้ายังไม่มี ให้เพิ่มใหม่
          await db.orders.add(orderData)
          count++
        }
      }
    })

    await refreshPendingCount()
    return count
  }

  /**
   * ดึงข้อมูลรายจ่ายจาก Cloud ลงมาที่เครื่อง
   */
  async function fetchRemoteExpenses(limit = 100): Promise<number> {
    if (!supabase) return 0

    const { data: remoteExpenses, error } = await withTimeout(
      supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    )

    if (error) throw error
    if (!remoteExpenses?.length) return 0

    // ตรวจสอบรายการที่มีอยู่แล้วเพื่อป้องกันการซ้ำ
    const remoteUuids = remoteExpenses.map(e => e.uuid)
    const existingExpenses = await db.expenses.where('uuid').anyOf(remoteUuids).toArray()
    const existingUuids = new Set(existingExpenses.map(e => e.uuid))

    let count = 0
    await db.transaction('rw', db.expenses, async () => {
      for (const remote of remoteExpenses) {
        if (existingUuids.has(remote.uuid)) {
          // อัปเดตข้อมูลเดิมที่มีอยู่ (ถ้ามี)
          const localExp = existingExpenses.find(e => e.uuid === remote.uuid)
          if (localExp) {
            // เปรียบเทียบ updatedAt เพื่อดูว่าควรทับไหม
            const remoteDate = new Date(remote.updated_at)
            const localDate = new Date(localExp.updatedAt)
            
            if (remoteDate > localDate) {
              await db.expenses.update(localExp.id!, {
                category: remote.category,
                amount: Number(remote.amount),
                description: remote.description,
                expenseDate: remote.expense_date,
                recordedBy: remote.recorded_by,
                staffId: remote.staff_id,
                staffUuid: remote.staff_uuid,
                isDeleted: !!remote.is_deleted,
                syncStatus: 'synced',
                syncedAt: new Date(remote.updated_at),
                updatedAt: new Date(remote.updated_at)
              })
              count++
            }
          }
        } else {
          // เพิ่มรายการใหม่
          await db.expenses.add({
            uuid: remote.uuid,
            category: remote.category,
            amount: Number(remote.amount),
            description: remote.description,
            expenseDate: remote.expense_date,
            recordedBy: remote.recorded_by,
            staffId: remote.staff_id,
            staffUuid: remote.staff_uuid,
            isDeleted: !!remote.is_deleted,
            syncStatus: 'synced',
            syncedAt: new Date(remote.updated_at),
            createdAt: new Date(remote.created_at),
            updatedAt: new Date(remote.updated_at)
          })
          count++
        }
      }
    })

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
    pendingExpenseCount,
    pendingSnapshotCount,
    lastSyncAt,
    setupNetworkListener,
    syncPendingOrders,
    refreshPendingCount,
    fetchRemoteOrders,
    fetchRemoteExpenses, // เพิ่มให้เรียกใช้งานได้
    getLastRemoteOrderSequence,
    nextSyncCountdown,
    startHeartbeatSync: () => {
      if (syncIntervalId.value) return
      if (isOnline.value) syncPendingOrders()
      _nextSyncAt = Date.now() + HEARTBEAT_MS
      nextSyncCountdown.value = HEARTBEAT_SECONDS
      // ใช้ timestamp-based countdown แทน decrement ทุก 1 วินาที → ลด interval fires 5x
      syncIntervalId.value = setInterval(() => {
        const remaining = Math.ceil((_nextSyncAt - Date.now()) / 1000)
        nextSyncCountdown.value = Math.max(0, remaining)
        if (remaining <= 0) {
          _nextSyncAt = Date.now() + HEARTBEAT_MS
          if (isOnline.value && !isSyncing.value) syncPendingOrders()
        }
      }, 5000)
    },
    stopHeartbeatSync: () => {
      if (syncIntervalId.value) {
        clearInterval(syncIntervalId.value)
        syncIntervalId.value = null
      }
    }
  }
}
