// =============================================================================
// composables/useInventory.ts
// Composable สำหรับจัดการ Inventory: ตัดสต็อก รองรับ Bundle และ Promotion
// =============================================================================

import { db } from '~/db'
import type { Product, InventoryDeduction, OrderItem } from '~/types'

export function useInventory() {
  /**
   * ตรวจสอบว่าสินค้ามีสต็อกเพียงพอสำหรับการขายหรือไม่
   * รองรับสินค้าแบบ Mapping (โปร/Bundle)
   *
   * @param product - สินค้าที่ต้องการตรวจสอบ
   * @param quantity - จำนวนที่ต้องการขาย
   * @returns true = มีสต็อกเพียงพอ
   */
  async function checkStock(product: Product, quantity: number): Promise<boolean> {
    // สินค้าที่ไม่ Track สต็อก → ขายได้เสมอ
    if (!product.trackInventory) return true

    // สินค้าปกติ (ไม่มี Mapping) → ตรวจสต็อกตัวเอง
    if (!product.inventoryMappings || product.inventoryMappings.length === 0) {
      return product.stockQuantity >= quantity
    }

    // สินค้าแบบ Mapping → ตรวจสต็อกสินค้าหลักทุกตัว
    for (const mapping of product.inventoryMappings) {
      const sourceProduct = await db.products.get(mapping.sourceProductId)
      if (!sourceProduct) return false
      if (!sourceProduct.trackInventory) continue

      // ต้องมีสต็อกเพียงพอสำหรับทุก Quantity ที่ขาย
      const requiredQuantity = mapping.quantity * quantity
      if (sourceProduct.stockQuantity < requiredQuantity) return false
    }

    return true
  }

  /**
   * ตัดสต็อกสินค้าเมื่อมีการขาย
   * รองรับ: สินค้าปกติ, Promotion (เช่น 10 แถม 1), Bundle (เซ็ต)
   *
   * @param product - สินค้าที่ขาย
   * @param quantity - จำนวนที่ขาย
   * @returns รายการ InventoryDeduction ที่เกิดขึ้นจริง (สำหรับบันทึกใน OrderItem)
   */
  async function deductStock(
    product: Product,
    quantity: number,
  ): Promise<InventoryDeduction[]> {
    const deductions: InventoryDeduction[] = []

    // กรณี: สินค้าปกติ (ตัดสต็อกตัวเอง)
    if (!product.inventoryMappings || product.inventoryMappings.length === 0) {
      if (product.trackInventory) {
        await db.products.update(product.id!, {
          stockQuantity: product.stockQuantity - quantity,
        })
        deductions.push({
          sourceProductId: product.id!,
          sourceProductName: product.name,
          quantityDeducted: quantity,
        })
      }
      return deductions
    }

    // กรณี: สินค้าแบบ Mapping (Promotion / Bundle)
    // ตัดสต็อกตามสินค้าหลักทุกตัวใน inventoryMappings
    await db.transaction('rw', db.products, async () => {
      for (const mapping of product.inventoryMappings!) {
        const sourceProduct = await db.products.get(mapping.sourceProductId)
        if (!sourceProduct || !sourceProduct.trackInventory) continue

        // จำนวนที่ต้องตัด = mapping.quantity × จำนวนที่ขาย
        // เช่น โปร 10 แถม 1: mapping.quantity=11, ขาย 2 ชุด → ตัด 22 ชิ้น
        const totalDeduct = mapping.quantity * quantity

        await db.products.update(sourceProduct.id!, {
          stockQuantity: sourceProduct.stockQuantity - totalDeduct,
        })

        deductions.push({
          sourceProductId: sourceProduct.id!,
          sourceProductName: sourceProduct.name,
          quantityDeducted: totalDeduct,
        })
      }
    })

    return deductions
  }

  /**
   * คืนสต็อกสินค้าเมื่อมีการยกเลิกออร์เดอร์
   *
   * @param orderItems - รายการสินค้าในออร์เดอร์ที่ถูกยกเลิก
   */
  async function restoreStock(orderItems: OrderItem[]): Promise<void> {
    await db.transaction('rw', db.products, async () => {
      for (const item of orderItems) {
        // ป้องกัน Error กรณีออเดอร์เก่าไม่มีข้อมูล inventoryDeductions
        if (!item.inventoryDeductions) continue

        for (const deduction of item.inventoryDeductions) {
          const product = await db.products.get(deduction.sourceProductId)
          if (!product || !product.trackInventory) continue

          await db.products.update(product.id!, {
            stockQuantity: product.stockQuantity + deduction.quantityDeducted,
          })
        }
      }
    })
  }

  /**
   * ดึง Product พร้อมคำนวณ costPrice Default (60% ของ salePrice)
   * ใช้เมื่อสร้างสินค้าใหม่โดยไม่ระบุราคาต้นทุน
   *
   * @param salePrice - ราคาขาย
   * @param costPrice - ราคาต้นทุน (Optional)
   * @returns costPrice จริง
   */
  function calculateDefaultCostPrice(salePrice: number, costPrice?: number): number {
    return costPrice ?? salePrice * 0.6
  }

  /**
   * ดึงสินค้าที่สต็อกต่ำกว่า alertThreshold (สำหรับ Dashboard แจ้งเตือน)
   */
  async function getLowStockProducts(): Promise<Product[]> {
    const allProducts = await db.products
      .where('trackInventory')
      .equals(1) // Dexie เก็บ boolean เป็น 0/1
      .filter(p => !p.isDeleted && p.stockQuantity <= p.alertThreshold)
      .toArray()

    return allProducts
  }

  return {
    checkStock,
    deductStock,
    restoreStock,
    calculateDefaultCostPrice,
    getLowStockProducts,
  }
}
