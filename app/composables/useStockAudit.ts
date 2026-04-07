// =============================================================================
// composables/useStockAudit.ts
// Composable สำหรับบันทึกและดึงประวัติการปรับสต็อก
// รองรับ: บันทึก Log, โหลด Log แยกตามสินค้า หรือทั้งหมด
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import { useAuthStore } from '~/stores/auth'
import type { StockAuditLog } from '~/types'

export function useStockAudit() {
  const auth = useAuthStore()

  /**
   * บันทึกประวัติการปรับสต็อก
   * เรียกใช้หลังจาก adjustStock() สำเร็จแล้ว
   */
  async function logAdjustment(params: {
    productId: number
    productName: string
    changeQuantity: number      // + เพิ่ม / - ลด
    previousQuantity: number
    newQuantity: number
    reason: StockAuditLog['reason']
    note?: string
  }): Promise<void> {
    const now = new Date()
    const user = auth.currentUser

    await db.stockAuditLogs.add({
      uuid: uuidv4(),
      productId: params.productId,
      productName: params.productName,
      changeQuantity: params.changeQuantity,
      previousQuantity: params.previousQuantity,
      newQuantity: params.newQuantity,
      reason: params.reason,
      note: params.note,
      staffId: user?.id ?? 0,
      staffName: user?.displayName ?? 'ไม่ทราบ',
      staffUuid: user?.uuid ?? '',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    } as StockAuditLog)
  }

  /**
   * โหลดประวัติทั้งหมด (เรียงจากใหม่ → เก่า)
   * @param productId - ถ้าระบุ จะกรองเฉพาะสินค้านั้น
   * @param limit - จำกัดจำนวน (default: 100)
   */
  async function fetchLogs(productId?: number, limit = 100): Promise<StockAuditLog[]> {
    let query = db.stockAuditLogs.filter(l => !l.isDeleted)
    if (productId) {
      query = db.stockAuditLogs.filter(l => !l.isDeleted && l.productId === productId)
    }
    const all = await query.toArray()
    // เรียงจากใหม่สุด
    return all
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  return {
    logAdjustment,
    fetchLogs,
  }
}
