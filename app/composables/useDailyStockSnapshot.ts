// =============================================================================
// composables/useDailyStockSnapshot.ts
// จัดการ: ถ่ายภาพสต็อกสินค้าประจำวัน + Sync ขึ้น Supabase
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db, getSetting, setSetting } from '~/db'
import { useAuthStore } from '~/stores/auth'
import type { DailyStockSnapshot } from '~/types'

const MAX_RETRY_COUNT = 5
const SETTING_KEY_SNAPSHOT_PULL = 'last_snapshot_pull_at'

const isCapturing = ref(false)
const captureError = ref<string | null>(null)

export function useDailyStockSnapshot() {
  const auth = useAuthStore()

  /**
   * บันทึกสต็อก ณ ปัจจุบันของสินค้าทุกตัวที่ trackInventory=true สำหรับวันที่กำหนด
   * ถ้ามี snapshot ของวันนั้นอยู่แล้วจะ Overwrite (กดซ้ำได้)
   */
  async function captureSnapshot(date: string): Promise<number> {
    if (isCapturing.value) return 0
    isCapturing.value = true
    captureError.value = null

    try {
      const now = new Date()
      const user = auth.currentUser

      const trackedProducts = await db.products
        .filter(p => !!p.trackInventory && p.isActive && !p.isDeleted)
        .toArray()

      if (trackedProducts.length === 0) return 0

      const existingSnapshots = await db.dailyStockSnapshots
        .where('snapshotDate').equals(date)
        .filter(s => !s.isDeleted)
        .toArray()
      const existingByProductUuid = new Map(existingSnapshots.map(s => [s.productUuid, s]))

      await db.transaction('rw', db.dailyStockSnapshots, async () => {
        for (const product of trackedProducts) {
          const existing = existingByProductUuid.get(product.uuid)

          const snapshot = {
            uuid:             existing?.uuid ?? uuidv4(),
            snapshotDate:     date,
            productUuid:      product.uuid,
            productId:        product.id!,
            productName:      product.name,
            productSku:       product.sku,
            stockQuantity:    product.stockQuantity,
            capturedByUuid:   user?.uuid ?? '',
            capturedByName:   user?.displayName ?? 'ไม่ทราบ',
            capturedAt:       now,
            syncStatus:       'pending' as const,
            syncRetryCount:   0,
            syncedAt:         undefined,
            syncError:        undefined,
            isDeleted:        false,
            createdAt:        existing?.createdAt ?? now,
            updatedAt:        now,
          }

          if (existing?.id) {
            await db.dailyStockSnapshots.put({ ...snapshot, id: existing.id })
          } else {
            await db.dailyStockSnapshots.add(snapshot as DailyStockSnapshot)
          }
        }
      })

      return trackedProducts.length
    }
    catch (e: any) {
      captureError.value = e.message ?? 'เกิดข้อผิดพลาด'
      throw e
    }
    finally {
      isCapturing.value = false
    }
  }

  /**
   * Push snapshot ที่ยังไม่ได้ Sync ขึ้น Supabase
   */
  async function pushSnapshots(): Promise<number> {
    const supabase = useSupabaseClient<any>()

    const pendingSnapshots = await db.dailyStockSnapshots
      .where('syncStatus').anyOf(['pending', 'failed'])
      .filter(s => (s.syncRetryCount ?? 0) < MAX_RETRY_COUNT)
      .toArray()

    if (pendingSnapshots.length === 0) return 0

    const now = new Date()
    const chunkSize = 100

    for (let i = 0; i < pendingSnapshots.length; i += chunkSize) {
      const chunk = pendingSnapshots.slice(i, i + chunkSize)

      const payload = chunk.map(s => ({
        uuid:              s.uuid,
        snapshot_date:     s.snapshotDate,
        product_uuid:      s.productUuid,
        product_name:      s.productName,
        product_sku:       s.productSku ?? null,
        stock_quantity:    s.stockQuantity,
        captured_by_uuid:  s.capturedByUuid || null,
        captured_by_name:  s.capturedByName || null,
        captured_at:       s.capturedAt instanceof Date ? s.capturedAt.toISOString() : new Date(s.capturedAt).toISOString(),
        is_deleted:        s.isDeleted,
        created_at:        s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date(s.createdAt).toISOString(),
        updated_at:        now.toISOString(),
      }))

      const { error } = await withTimeout(
        supabase.from('daily_stock_snapshots').upsert(payload, { onConflict: 'uuid' })
      )

      if (error) {
        for (const s of chunk) {
          await db.dailyStockSnapshots.update(s.id!, {
            syncStatus:     'failed',
            syncRetryCount: (s.syncRetryCount ?? 0) + 1,
            syncError:      error.message,
            updatedAt:      now,
          })
        }
        throw error
      }

      for (const s of chunk) {
        await db.dailyStockSnapshots.update(s.id!, {
          syncStatus: 'synced',
          syncedAt:   now,
          syncError:  undefined,
          updatedAt:  now,
        })
      }
    }

    return pendingSnapshots.length
  }

  /** ดึง snapshot ของวันที่กำหนด เรียงตามชื่อสินค้า */
  async function getSnapshotForDate(date: string): Promise<DailyStockSnapshot[]> {
    const rows = await db.dailyStockSnapshots
      .where('snapshotDate').equals(date)
      .filter(s => !s.isDeleted)
      .toArray()
    return rows.sort((a, b) => a.productName.localeCompare(b.productName, 'th'))
  }

  /** ตรวจว่ามี snapshot สำหรับวันที่กำหนดหรือยัง */
  async function hasSnapshotForDate(date: string): Promise<boolean> {
    const count = await db.dailyStockSnapshots
      .where('snapshotDate').equals(date)
      .filter(s => !s.isDeleted)
      .count()
    return count > 0
  }

  /**
   * Pull snapshot จาก Supabase ลงเครื่อง
   * ดึงเฉพาะ 90 วันย้อนหลัง และเปรียบเทียบ updatedAt ก่อน Merge
   */
  async function pullSnapshots(force = false): Promise<number> {
    const supabase = useSupabaseClient<any>()

    const lastPullStr = force ? null : await getSetting<string | null>(SETTING_KEY_SNAPSHOT_PULL, null)
    const lastPullAt = lastPullStr ? new Date(lastPullStr) : null

    // จำกัดช่วงเวลา 90 วันย้อนหลัง เพื่อป้องกัน payload ใหญ่เกินไป
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const sinceDateStr = since.toISOString().split('T')[0]

    let query = supabase
      .from('daily_stock_snapshots')
      .select('*')
      .gte('snapshot_date', sinceDateStr)
      .order('snapshot_date', { ascending: false })

    if (lastPullAt && !force) {
      query = query.gt('updated_at', lastPullAt.toISOString())
    }

    const { data: remoteRows, error } = await withTimeout(
      query.limit(force ? 2000 : 500)
    )
    if (error) throw new Error(`Pull Snapshots ล้มเหลว: ${error.message}`)
    if (!remoteRows?.length) return 0

    // Bulk-fetch local snapshots เพื่อเทียบ
    const remoteUuids = remoteRows.map((r: any) => r.uuid)
    const existingRows = await db.dailyStockSnapshots.where('uuid').anyOf(remoteUuids).toArray()
    const existingByUuid = new Map(existingRows.map(r => [r.uuid, r]))

    // สร้าง Map productUuid → local id เผื่อ resolve productId
    const allProducts = await db.products.toArray()
    const prodUuidToId = new Map(allProducts.map(p => [p.uuid, p.id!]))

    let count = 0
    for (const remote of remoteRows) {
      const existing = existingByUuid.get(remote.uuid)
      const remoteUpdatedAt = new Date(remote.updated_at)
      if (existing && new Date(existing.updatedAt) >= remoteUpdatedAt) continue

      const localSnapshot: Omit<DailyStockSnapshot, 'id'> = {
        uuid:            remote.uuid,
        snapshotDate:    remote.snapshot_date,
        productUuid:     remote.product_uuid,
        productId:       prodUuidToId.get(remote.product_uuid) ?? existing?.productId ?? 0,
        productName:     remote.product_name,
        productSku:      remote.product_sku ?? undefined,
        stockQuantity:   Number(remote.stock_quantity),
        capturedByUuid:  remote.captured_by_uuid ?? '',
        capturedByName:  remote.captured_by_name ?? '',
        capturedAt:      new Date(remote.captured_at),
        syncStatus:      'synced',
        syncedAt:        remoteUpdatedAt,
        syncRetryCount:  0,
        isDeleted:       remote.is_deleted ?? false,
        createdAt:       new Date(remote.created_at),
        updatedAt:       remoteUpdatedAt,
      }

      if (existing?.id) {
        await db.dailyStockSnapshots.update(existing.id, localSnapshot)
      } else {
        await db.dailyStockSnapshots.add(localSnapshot as DailyStockSnapshot)
      }
      count++
    }

    await setSetting(SETTING_KEY_SNAPSHOT_PULL, new Date().toISOString())
    return count
  }

  return {
    isCapturing,
    captureError,
    captureSnapshot,
    pushSnapshots,
    pullSnapshots,
    getSnapshotForDate,
    hasSnapshotForDate,
  }
}
