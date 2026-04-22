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
    let query = db.products.filter(p => !!p.isDeleted === showDeleted)
    if (categoryId) {
      query = db.products.filter(p => !!p.isDeleted === showDeleted && p.categoryId === categoryId)
    }
    return query.sortBy('sortOrder')
  }

  // --- Helper: Sync สินค้า 1 ตัวขึ้น Cloud ทันที ---
  async function _syncProductToCloud(product: Product): Promise<void> {
    const supabase = useSupabaseClient<any>()
    
    const category = await db.categories.get(product.categoryId)
    let mappingsForCloud = null
    
    if (product.mappingType && product.inventoryMappings?.length) {
      mappingsForCloud = []
      for (const m of product.inventoryMappings) {
        const srcProd = await db.products.get(m.sourceProductId)
        if (srcProd && srcProd.uuid) {
          mappingsForCloud.push({ source_product_uuid: srcProd.uuid, quantity: m.quantity })
        }
      }
    }

    const payload = {
      uuid: product.uuid,
      category_uuid: category?.uuid || null,
      sku: product.sku || null,
      name: product.name,
      description: product.description || null,
      image_url: product.imageUrl || null,
      sale_price: product.salePrice,
      cost_price: product.costPrice,
      stock_quantity: product.stockQuantity,
      alert_threshold: product.alertThreshold,
      track_inventory: product.trackInventory,
      mapping_type: product.mappingType || null,
      inventory_mappings: mappingsForCloud,
      addon_groups: product.addonGroups || null,
      is_active: product.isActive,
      sort_order: product.sortOrder,
      total_sold: product.totalSold || 0,
      is_deleted: product.isDeleted,
      updated_at: product.updatedAt.toISOString(),
    }

    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'uuid' })
    if (error) {
      console.error('Master Data Sync Error:', error)
      throw new Error(`อัปเดตข้อมูลขึ้น Cloud ไม่สำเร็จ: ${error.message}`)
    }
  }

  /**
   * เพิ่มสินค้าใหม่ลงฐานข้อมูล (Online-First)
   * - ตรวจสอบ SKU และชื่อซ้ำจาก Supabase
   */
  async function createProduct(form: ProductFormData): Promise<number> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถเพิ่มสินค้าได้ขณะออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ต')
    }

    const supabase = useSupabaseClient<any>()

    // Check Duplicates
    if (form.sku) {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('sku', form.sku).eq('is_deleted', false)
      if (count && count > 0) throw new Error(`รหัส SKU "${form.sku}" ถูกใช้งานแล้วในระบบ`)
    }
    const { count: nameCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('name', form.name.trim()).eq('is_deleted', false)
    if (nameCount && nameCount > 0) throw new Error(`ชื่อสินค้า "${form.name.trim()}" มีอยู่ในระบบแล้ว`)

    const now = new Date()
    const costPrice = form.costPrice ?? Math.round(form.salePrice * 0.6)

    const newProduct = {
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
      inventoryMappings: form.mappingType && form.inventoryMappings?.length ? toPlain(form.inventoryMappings) : undefined,
      addonGroups: form.addonGroups?.length ? toPlain(form.addonGroups) : undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      totalSold: 0,
      imageUrl: form.imageUrl || undefined,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    } as Product

    // Push to Cloud first
    await _syncProductToCloud(newProduct)

    // Save to Local Data
    const id = await db.products.add(newProduct)
    return id as number
  }

  /**
   * แก้ไขข้อมูลสินค้า (Online-First)
   */
  async function updateProduct(id: number, form: ProductFormData): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถแก้ไขสินค้าได้ขณะออฟไลน์')
    }

    const product = await db.products.get(id)
    if (!product) throw new Error('ไม่พบสินค้า')

    const supabase = useSupabaseClient<any>()

    // Check Duplicates
    if (form.sku && form.sku !== product.sku) {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('sku', form.sku).eq('is_deleted', false).neq('uuid', product.uuid)
      if (count && count > 0) throw new Error(`รหัส SKU "${form.sku}" ถูกใช้งานแล้วในระบบ`)
    }
    if (form.name.trim() !== product.name) {
      const { count: nameCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('name', form.name.trim()).eq('is_deleted', false).neq('uuid', product.uuid)
      if (nameCount && nameCount > 0) throw new Error(`ชื่อสินค้า "${form.name.trim()}" มีอยู่ในระบบแล้ว`)
    }

    const costPrice = form.costPrice ?? Math.round(form.salePrice * 0.6)
    
    // Prepare Updated Object
    const updatedProduct: Product = {
      ...product,
      categoryId: form.categoryId,
      sku: form.sku || undefined,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      salePrice: form.salePrice,
      costPrice,
      stockQuantity: form.trackInventory ? form.stockQuantity : product.stockQuantity,
      alertThreshold: form.alertThreshold,
      trackInventory: form.trackInventory,
      mappingType: form.mappingType || undefined,
      inventoryMappings: form.mappingType && form.inventoryMappings?.length ? toPlain(form.inventoryMappings) : undefined,
      addonGroups: form.addonGroups?.length ? toPlain(form.addonGroups) : undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      imageUrl: form.imageUrl || undefined,
      updatedAt: new Date(),
    }

    // Push to Cloud first
    await _syncProductToCloud(updatedProduct)

    // Save to Local Data
    await db.products.put(updatedProduct)
  }

  /**
   * เปิด/ปิดการแสดงสินค้าในหน้าขาย (Toggle isActive)
   */
  async function toggleProductActive(id: number): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถเปลี่ยนสถานะพนักงานได้ขณะออฟไลน์')
    }

    const product = await db.products.get(id)
    if (!product) return

    const updatedProduct = { ...product, isActive: !product.isActive, updatedAt: new Date() }
    await _syncProductToCloud(updatedProduct)
    await db.products.put(updatedProduct)
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
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถลบสินค้าได้ขณะออฟไลน์')
    }
    const product = await db.products.get(id)
    if (!product) return
    const updatedProduct = { ...product, isDeleted: true, isActive: false, updatedAt: new Date() }
    await _syncProductToCloud(updatedProduct)
    await db.products.put(updatedProduct)
  }

  /**
   * กู้คืนสินค้าจากถังขยะ
   */
  async function restoreProduct(id: number): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถกู้คืนสินค้าได้ขณะออฟไลน์')
    }
    const product = await db.products.get(id)
    if (!product) return
    const updatedProduct = { ...product, isDeleted: false, isActive: true, updatedAt: new Date() }
    await _syncProductToCloud(updatedProduct)
    await db.products.put(updatedProduct)
  }

  /**
   * บันทึกการเรียงลำดับสินค้าใหม่ (Bulk Update sortOrder)
   */
  async function reorderProducts(orderedItems: Product[]): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถจัดเรียงสินค้าได้ขณะออฟไลน์')
    }
    const now = new Date()
    
    // เตรียมข้อมูลตัวเปลี่ยนทั้งหมด และส่งขึ้น Cloud ทีละตัว
    const toUpdate: Product[] = []
    for (let i = 0; i < orderedItems.length; i++) {
        const item = orderedItems[i]
        if (!item?.id) continue
        toUpdate.push({ ...item, sortOrder: i + 1, updatedAt: now })
    }

    for (const p of toUpdate) {
      await _syncProductToCloud(p)
    }

    await db.transaction('rw', db.products, async () => {
      for (const p of toUpdate) {
        await db.products.update(p.id!, { sortOrder: p.sortOrder, updatedAt: p.updatedAt })
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
