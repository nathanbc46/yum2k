// =============================================================================
// composables/useMassEdit.ts
// Composable สำหรับแก้ไขสินค้าหลายรายการพร้อมกัน
// =============================================================================

import { db } from '~/db'
import type { MassEditPayload } from '~/types'

export function useMassEdit() {
  /**
   * แก้ไขสินค้าหลายรายการพร้อมกัน
   * เฉพาะ fields ที่ระบุใน payload เท่านั้นจะถูกเปลี่ยน
   */
  async function applyMassEdit(productIds: number[], payload: MassEditPayload): Promise<number> {
    if (productIds.length === 0) return 0
    let updated = 0
    await db.transaction('rw', db.products, async () => {
      for (const id of productIds) {
        const product = await db.products.get(id)
        if (!product) continue

        const changes: Record<string, any> = {}

        if (payload.categoryId !== undefined) {
          changes.categoryId = payload.categoryId
        }

        if (payload.isActive !== undefined) {
          changes.isActive = payload.isActive
        }

        if (payload.priceAdjustPercent !== undefined && payload.priceAdjustPercent !== 0) {
          const multiplier = 1 + payload.priceAdjustPercent / 100
          const newSalePrice = Math.round(product.salePrice * multiplier)
          changes.salePrice = newSalePrice
          // auto-recalculate costPrice ที่ 60% ถ้า costPrice เดิมเป็น 60% ของราคาขายเดิม
          const isDefaultCost = Math.abs(product.costPrice - product.salePrice * 0.6) < 1
          if (isDefaultCost) {
            changes.costPrice = Math.round(newSalePrice * 0.6)
          }
        }

        if (Object.keys(changes).length > 0) {
          await db.products.update(id, changes)
          updated++
        }
      }
    })
    return updated
  }

  return { applyMassEdit }
}
