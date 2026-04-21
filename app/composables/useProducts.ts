// =============================================================================
// composables/useProducts.ts
// Composable สำหรับ CRUD สินค้า (Product Management)
// รองรับ: เพิ่ม, แก้ไข, ซ่อน/แสดง, ปรับสต็อก, ลบ (Soft Delete)
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { Product, InventoryMappingType, InventoryMapping, AddonGroup } from '~/types'

// --- ประเภทสำหรับ Form สร้าง/แก้ไขสินค้า ---
export interface ProductFormData {
  categoryId: number
  sku: string
  name: string
  description?: string
  salePrice: number
  costPrice?: number          // ถ้าไม่ใส่ → auto = 60% ของ salePrice
  stockQuantity: number
  alertThreshold: number
  trackInventory: boolean
  mappingType?: InventoryMappingType
  inventoryMappings?: InventoryMapping[]
  addonGroups?: any[] // ใช้ any ชั่วคราวหรือ import AddonGroup
  isActive: boolean
  sortOrder: number
  imageUrl?: string            // ลิงก์รูปภาพสิค้า
}

// --- ประเภทสำหรับ Log การปรับสต็อก ---
export type StockAdjustReason =
  | 'restock'     // เติมสินค้า
  | 'damaged'     // สินค้าเสียหาย/เน่าเสีย
  | 'count'       // ตรวจนับสต็อก (Stock Count)
  | 'other'       // อื่นๆ

export const ADJUST_REASON_LABELS: Record<StockAdjustReason, string> = {
  restock: '📦 เติมสินค้า',
  damaged: '🗑️ สินค้าเสียหาย / เน่าเสีย',
  count:   '📋 ตรวจนับสต็อก (Adjust)',
  other:   '📝 อื่นๆ',
}

export function useProducts() {
  /**
   * แปลง Reactive Proxy → Plain Object เพื่อให้ IndexedDB clone ได้
   * (แก้ DataCloneError เวลาบันทึก addonGroups / inventoryMappings)
   */
  function toPlain<T>(val: T | undefined | null): T | undefined {
    if (!val) return undefined
    return JSON.parse(JSON.stringify(val)) as T
  }
  /**
   * โหลดสินค้า (Filter ตามเงื่อนไข)
   * @param categoryId - กรอง Category (optional)
   * @param showDeleted - ดูรายการที่ลบแล้ว (ถังขยะ)
   */
  async function fetchAll(categoryId?: number, showDeleted: boolean = false): Promise<Product[]> {
    let query = db.products.filter(p => p.isDeleted === showDeleted)
    if (categoryId) {
      query = db.products.filter(p => p.isDeleted === showDeleted && p.categoryId === categoryId)
    }
    return query.sortBy('sortOrder')
  }

  /**
   * เพิ่มสินค้าใหม่ลงฐานข้อมูล
   * - Auto-calculate costPrice = 60% ถ้าไม่ได้ระบุ
   */
  async function createProduct(form: ProductFormData): Promise<number> {
    const now = new Date()
    const costPrice = form.costPrice ?? Math.round(form.salePrice * 0.6)

    const newProduct: Omit<Product, 'id'> = {
      uuid: uuidv4(),
      categoryId: form.categoryId,
      sku: form.sku || undefined,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      salePrice: form.salePrice,
      costPrice,
      stockQuantity: form.trackInventory ? form.stockQuantity : 0,
      alertThreshold: form.alertThreshold,
      trackInventory: form.trackInventory,
      mappingType: form.mappingType || undefined,
      inventoryMappings:
        form.mappingType && form.inventoryMappings?.length
          ? toPlain(form.inventoryMappings)
          : undefined,
      addonGroups: form.addonGroups?.length ? toPlain(form.addonGroups) : undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      totalSold: 0,
      imageUrl: form.imageUrl || undefined,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    }

    const id = await db.products.add(newProduct as Product)
    return id as number
  }

  /**
   * แก้ไขข้อมูลสินค้า
   */
  async function updateProduct(id: number, form: ProductFormData): Promise<void> {
    const costPrice = form.costPrice ?? Math.round(form.salePrice * 0.6)

    await db.products.update(id, {
      categoryId: form.categoryId,
      sku: form.sku || undefined,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      salePrice: form.salePrice,
      costPrice,
      stockQuantity: form.trackInventory ? form.stockQuantity : 0,
      alertThreshold: form.alertThreshold,
      trackInventory: form.trackInventory,
      mappingType: form.mappingType || undefined,
      inventoryMappings:
        form.mappingType && form.inventoryMappings?.length
          ? toPlain(form.inventoryMappings)
          : undefined,
      addonGroups: form.addonGroups?.length ? toPlain(form.addonGroups) : undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      imageUrl: form.imageUrl || undefined,
      updatedAt: new Date(),
    })
  }

  /**
   * เปิด/ปิดการแสดงสินค้าในหน้าขาย (Toggle isActive)
   */
  async function toggleProductActive(id: number): Promise<void> {
    const product = await db.products.get(id)
    if (!product) return
    await db.products.update(id, {
      isActive: !product.isActive,
      updatedAt: new Date(),
    })
  }

  /**
   * ปรับสต็อกด้วยตนเอง (Manual Adjustment)
   * @param id - Product ID
   * @param delta - จำนวนที่เปลี่ยนแปลง (+เพิ่ม / -ลด)
   * @param reason - เหตุผลการปรับ
   */
  async function adjustStock(
    id: number,
    delta: number,
    reason: StockAdjustReason,
    note?: string,
  ): Promise<{ before: number; after: number }> {
    const product = await db.products.get(id)
    if (!product) throw new Error('ไม่พบสินค้า')

    const before = product.stockQuantity
    const after = Math.max(0, before + delta) // ห้ามติดลบ

    await db.products.update(id, {
      stockQuantity: after,
      updatedAt: new Date(),
    })

    // บันทึก Audit Log อัตโนมัติ
    try {
      const { logAdjustment } = await import('~/composables/useStockAudit').then(m => m.useStockAudit())
      await logAdjustment({
        productId: id,
        productName: product.name,
        changeQuantity: delta,
        previousQuantity: before,
        newQuantity: after,
        reason: reason as any,
        note,
      })
    } catch (logErr) {
      console.warn('⚠️ บันทึก Stock Audit Log ล้มเหลว:', logErr)
    }

    console.log(`📊 ปรับสต็อก "${product.name}": ${before} → ${after}`)
    return { before, after }
  }

  /**
   * Soft Delete สินค้า (ซ่อนทั้งหมด ไม่ลบจริง)
   */
  async function deleteProduct(id: number): Promise<void> {
    await db.products.update(id, {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
    })
  }

  /**
   * กู้คืนสินค้าจากถังขยะ
   */
  async function restoreProduct(id: number): Promise<void> {
    await db.products.update(id, {
      isDeleted: false,
      isActive: true,
      updatedAt: new Date(),
    })
  }

  /**
   * บันทึกการเรียงลำดับสินค้าใหม่ (Bulk Update sortOrder)
   */
  async function reorderProducts(orderedItems: Product[]): Promise<void> {
    const now = new Date()
    await db.transaction('rw', db.products, async () => {
      for (let i = 0; i < orderedItems.length; i++) {
        const item = orderedItems[i]
        if (!item?.id) continue
        await db.products.update(item.id, {
          sortOrder: i + 1,
          updatedAt: now
        })
      }
    })
  }

  return {
    fetchAll,
    createProduct,
    updateProduct,
    toggleProductActive,
    adjustStock,
    deleteProduct,
    restoreProduct,
    getNextSku,
    reorderProducts,
  }
}

/**
 * หา SKU ถัดไปอัตโนมัติ
 */
async function getNextSku(): Promise<string> {
  const allProducts = await db.products.toArray()
  // ดึงเฉพาะตัวเลขจาก SKU (รูปแบบ YUM-0001)
  const numbers = allProducts
    .map(p => {
      const match = p.sku?.match(/\d+$/)
      return match ? parseInt(match[0]) : 0
    })
    .filter(n => n > 0)
  
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
  const nextNumber = maxNumber + 1
  
  // คืนค่ารูปแบบ YUM-XXXX (4 หลัก)
  return `YUM-${nextNumber.toString().padStart(4, '0')}`
}
