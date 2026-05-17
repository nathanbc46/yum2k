// =============================================================================
// composables/useProducts.ts
// Composable สำหรับ CRUD สินค้า (Product Management)
// รองรับ: เพิ่ม, แก้ไข, ซ่อน/แสดง, ปรับสต็อก, ลบ (Soft Delete)
//
// กลยุทธ์: OFFLINE-FIRST
//   1. บันทึกลง IndexedDB ก่อนเสมอ (ทำงานได้แม้ไม่มีอินเทอร์เน็ต)
//   2. ถ้า Online → Sync ขึ้น Cloud ใน background ทันที
//   3. ถ้า Offline → ทำเครื่องหมาย syncStatus = 'pending' เพื่อ Sync ภายหลัง
//   4. มี queue ที่จะ retry เมื่อกลับมา Online
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
  addonGroups?: any[]
  isActive: boolean
  sortOrder: number
  imageUrl?: string
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

// --- Global: สถานะ Pending Sync ของสินค้า ---
const pendingSyncCount = ref(0)
const isSyncingProducts = ref(false)

export function useProducts() {
  /**
   * แปลง Reactive Proxy → Plain Object เพื่อให้ IndexedDB clone ได้
   */
  function toPlain<T>(val: T | undefined | null): T | undefined {
    if (!val) return undefined
    return JSON.parse(JSON.stringify(val)) as T
  }

  /**
   * โหลดสินค้า (Filter ตามเงื่อนไข)
   */
  async function fetchAll(categoryId?: number, showDeleted: boolean = false): Promise<Product[]> {
    let query = db.products.filter(p => !!p.isDeleted === showDeleted)
    if (categoryId) {
      query = db.products.filter(p => !!p.isDeleted === showDeleted && p.categoryId === categoryId)
    }
    return query.sortBy('sortOrder')
  }

  /**
   * นับจำนวนสินค้าที่รอ Sync ขึ้น Cloud
   */
  async function countPendingSync(): Promise<number> {
    const count = await db.products.where('syncStatus').anyOf(['pending', 'failed']).count()
    pendingSyncCount.value = count
    return count
  }

  // --- Helper: Sync สินค้า 1 ตัวขึ้น Cloud ---
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
      throw new Error(`อัปเดตข้อมูลขึ้น Cloud ไม่สำเร็จ: ${error.message}`)
    }
  }

  /**
   * Sync สินค้าขึ้น Cloud ใน background
   * - ถ้า Online → Sync ทันที แล้วอัปเดตสถานะเป็น 'synced'
   * - ถ้า Offline → ทิ้งไว้ที่ 'pending' รอ Retry
   */
  async function _syncInBackground(productId: number): Promise<void> {
    const isOnline = typeof window !== 'undefined' && window.navigator.onLine
    if (!isOnline) {
      // ทำเครื่องหมายว่ารอ Sync
      await db.products.update(productId, { syncStatus: 'pending' } as any)
      await countPendingSync()
      return
    }

    try {
      const product = await db.products.get(productId)
      if (!product) return

      await _syncProductToCloud(product)

      // Sync สำเร็จ → อัปเดตสถานะ
      await db.products.update(productId, {
        syncStatus: 'synced',
        syncedAt: new Date(),
        syncError: undefined,
      } as any)
    } catch (err: any) {
      // Sync ล้มเหลว → บันทึก Error ไว้
      const product = await db.products.get(productId)
      await db.products.update(productId, {
        syncStatus: 'failed',
        syncRetryCount: ((product as any)?.syncRetryCount || 0) + 1,
        syncError: err?.message,
      } as any)
      console.warn(`⚠️ Sync Product [${productId}] ล้มเหลว (จะลองใหม่เมื่อออนไลน์):`, err?.message)
    } finally {
      await countPendingSync()
    }
  }

  /**
   * Sync สินค้าที่ค้างทั้งหมดขึ้น Cloud (เรียกเมื่อกลับมา Online)
   */
  async function syncPendingProducts(): Promise<{ success: number; failed: number }> {
    if (isSyncingProducts.value) return { success: 0, failed: 0 }
    if (!window.navigator.onLine) return { success: 0, failed: 0 }

    isSyncingProducts.value = true
    let success = 0
    let failed = 0

    try {
      const MAX_RETRY = 5
      const pending = await db.products
        .filter((p: any) =>
          (p.syncStatus === 'pending' || p.syncStatus === 'failed') &&
          (p.syncRetryCount || 0) < MAX_RETRY
        )
        .toArray()

      for (const product of pending) {
        try {
          await _syncProductToCloud(product)
          await db.products.update(product.id!, {
            syncStatus: 'synced',
            syncedAt: new Date(),
            syncError: undefined,
          } as any)
          success++
        } catch (err: any) {
          await db.products.update(product.id!, {
            syncStatus: 'failed',
            syncRetryCount: ((product as any).syncRetryCount || 0) + 1,
            syncError: err?.message,
          } as any)
          failed++
        }
      }

      await countPendingSync()
      return { success, failed }
    } finally {
      isSyncingProducts.value = false
    }
  }

  /**
   * ตรวจสอบ SKU ซ้ำในฐานข้อมูล Local
   */
  async function _checkLocalDuplicates(form: ProductFormData, excludeId?: number): Promise<void> {
    if (form.sku) {
      const existing = await db.products
        .filter(p => p.sku === form.sku && !p.isDeleted && p.id !== excludeId)
        .first()
      if (existing) throw new Error(`รหัส SKU "${form.sku}" ถูกใช้งานแล้ว`)
    }
    const existingName = await db.products
      .filter(p => p.name.trim() === form.name.trim() && !p.isDeleted && p.id !== excludeId)
      .first()
    if (existingName) throw new Error(`ชื่อสินค้า "${form.name.trim()}" มีอยู่แล้ว`)
  }

  /**
   * เพิ่มสินค้าใหม่ (Offline-First)
   * - บันทึกลง Local ก่อน → Sync Cloud ใน background
   */
  async function createProduct(form: ProductFormData): Promise<number> {
    // ตรวจสอบ Duplicate จาก Local DB ก่อน
    await _checkLocalDuplicates(form)

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
      // Offline-First fields
      syncStatus: 'pending',
      syncRetryCount: 0,
    } as Product

    // บันทึกลง Local ก่อน
    const id = await db.products.add(newProduct)

    // Sync ขึ้น Cloud ใน background
    _syncInBackground(id as number)

    return id as number
  }

  /**
   * แก้ไขข้อมูลสินค้า (Offline-First)
   */
  async function updateProduct(id: number, form: ProductFormData): Promise<void> {
    const product = await db.products.get(id)
    if (!product) throw new Error('ไม่พบสินค้า')

    // ตรวจสอบ Duplicate (exclude ตัวเอง)
    await _checkLocalDuplicates(form, id)

    const costPrice = form.costPrice ?? Math.round(form.salePrice * 0.6)

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
      // Offline-First fields
      syncStatus: 'pending' as any,
      syncRetryCount: 0,
    }

    // บันทึก Local ก่อน
    await db.products.put(updatedProduct)

    // Sync ขึ้น Cloud ใน background
    _syncInBackground(id)
  }

  /**
   * เปิด/ปิดการแสดงสินค้าในหน้าขาย (Offline-First)
   */
  async function toggleProductActive(id: number): Promise<void> {
    const product = await db.products.get(id)
    if (!product) return

    const updatedProduct = {
      ...product,
      isActive: !product.isActive,
      updatedAt: new Date(),
      syncStatus: 'pending' as any,
    }

    await db.products.put(updatedProduct)
    _syncInBackground(id)
  }

  /**
   * ปรับสต็อกด้วยตนเอง (Manual Adjustment)
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
    const after = Math.max(0, before + delta)

    await db.products.update(id, {
      stockQuantity: after,
      updatedAt: new Date(),
      syncStatus: 'pending' as any,
    })

    // Sync สต็อกขึ้น Cloud
    _syncInBackground(id)

    // บันทึก Audit Log
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

    return { before, after }
  }

  /**
   * Soft Delete สินค้า (Offline-First)
   */
  async function deleteProduct(id: number): Promise<void> {
    const product = await db.products.get(id)
    if (!product) return
    const updatedProduct = {
      ...product,
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
      syncStatus: 'pending' as any,
    }
    await db.products.put(updatedProduct)
    _syncInBackground(id)
  }

  /**
   * กู้คืนสินค้าจากถังขยะ (Offline-First)
   */
  async function restoreProduct(id: number): Promise<void> {
    const product = await db.products.get(id)
    if (!product) return
    const updatedProduct = {
      ...product,
      isDeleted: false,
      isActive: true,
      updatedAt: new Date(),
      syncStatus: 'pending' as any,
    }
    await db.products.put(updatedProduct)
    _syncInBackground(id)
  }

  /**
   * บันทึกการเรียงลำดับสินค้าใหม่ (Offline-First)
   */
  async function reorderProducts(orderedItems: Product[]): Promise<void> {
    const now = new Date()
    const toUpdate: Product[] = []

    for (let i = 0; i < orderedItems.length; i++) {
      const item = orderedItems[i]
      if (!item?.id) continue
      toUpdate.push({ ...item, sortOrder: i + 1, updatedAt: now, syncStatus: 'pending' as any })
    }

    // บันทึก Local ก่อนทั้งหมด
    await db.transaction('rw', db.products, async () => {
      for (const p of toUpdate) {
        await db.products.update(p.id!, {
          sortOrder: p.sortOrder,
          updatedAt: p.updatedAt,
          syncStatus: 'pending',
        } as any)
      }
    })

    // Sync ขึ้น Cloud ใน background (ทีละตัว)
    for (const p of toUpdate) {
      _syncInBackground(p.id!)
    }
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
    syncPendingProducts,
    countPendingSync,
    pendingSyncCount,
    isSyncingProducts,
  }
}

/**
 * หา SKU ถัดไปอัตโนมัติ
 */
async function getNextSku(): Promise<string> {
  const allProducts = await db.products.toArray()
  const numbers = allProducts
    .map(p => {
      const match = p.sku?.match(/\d+$/)
      return match ? parseInt(match[0]) : 0
    })
    .filter(n => n > 0)

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
  const nextNumber = maxNumber + 1
  return `YUM-${nextNumber.toString().padStart(4, '0')}`
}
