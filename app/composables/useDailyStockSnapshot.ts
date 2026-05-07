// =============================================================================
// composables/useDailyStockSnapshot.ts
// จัดการ: ถ่ายภาพสต็อกสินค้าประจำวัน + Sync ขึ้น Supabase
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import { useAuthStore } from '~/stores/auth'
import type { DailyStockSnapshot } from '~/types'

const MAX_RETRY_COUNT = 5

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

  return {
    isCapturing,
    captureError,
    captureSnapshot,
    pushSnapshots,
    getSnapshotForDate,
    hasSnapshotForDate,
  }
}
