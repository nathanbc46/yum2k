// composables/useStockAlert.ts
// ตรวจสอบและแจ้งเตือนสินค้าที่สต็อกต่ำกว่าเกณฑ์
import { db } from '~/db'

export interface LowStockItem {
  name: string
  currentStock: number
  threshold: number
}

export function useStockAlert() {
  const toast = useToast()

  /**
   * เรียกหลัง checkout — ตรวจเฉพาะสินค้าที่เพิ่งถูกขาย
   * ใช้ค่า stockQuantity ก่อนขาย - quantity ที่ขาย เพื่อคำนวณยอดใหม่
   */
  function checkAfterCheckout(snapshot: Array<{ product: { id?: number, name: string, trackInventory: boolean, stockQuantity: number, alertThreshold: number }, quantity: number }>) {
    const low: LowStockItem[] = []

    for (const item of snapshot) {
      if (!item.product.trackInventory) continue
      const newStock = item.product.stockQuantity - item.quantity
      const threshold = item.product.alertThreshold ?? 0
      if (newStock <= threshold) {
        low.push({ name: item.product.name, currentStock: newStock, threshold })
      }
    }

    if (low.length === 0) return

    const lines = low.map(s =>
      `• ${s.name}: เหลือ ${s.currentStock} ${s.threshold > 0 ? `(ต่ำกว่าขั้นต่ำ ${s.threshold})` : '(หมดแล้ว)'}`
    )
    toast.warning(['⚠️ สินค้าใกล้หมด/หมดแล้ว:', ...lines].join('\n'), 8000)

    // แจ้งเตือน LINE OA (fire-and-forget)
    const { notifyLowStock } = useLineNotify()
    notifyLowStock(low).catch(() => {})
  }

  /**
   * ตรวจสอบสินค้าทั้งหมดจาก IndexedDB — ใช้ใน admin dashboard หรือหลัง sync
   */
  async function fetchAllLowStock(): Promise<LowStockItem[]> {
    const products = await db.products
      .filter(p => !p.isDeleted && p.isActive && p.trackInventory && p.stockQuantity <= (p.alertThreshold ?? 0))
      .toArray()

    return products.map(p => ({
      name: p.name,
      currentStock: p.stockQuantity,
      threshold: p.alertThreshold ?? 0,
    }))
  }

  return { checkAfterCheckout, fetchAllLowStock }
}
