// =============================================================================
// composables/useCategories.ts
// Composable สำหรับ CRUD หมวดหมู่สินค้า (Category Management)
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { Category } from '~/types'

export interface CategoryFormData {
  name: string
  parentId?: number
  parentUuid?: string
  description?: string
  color?: string
  sortOrder: number
  isActive: boolean
}

export function useCategories() {
  /**
   * โหลดหมวดหมู่ทั้งหมด (Admin เห็นทั้ง active และ inactive)
   */
  async function fetchAll(): Promise<Category[]> {
    return db.categories
      .filter(c => !c.isDeleted)
      .sortBy('sortOrder')
  }

  // --- Helper: Sync หมวดหมู่ 1 ตัวขึ้น Cloud ทันที ---
  async function _syncCategoryToCloud(category: Category): Promise<void> {
    const supabase = useSupabaseClient<any>()
    
    const payload = {
      uuid: category.uuid,
      name: category.name,
      description: category.description || null,
      icon_url: category.iconUrl || null,
      color: category.color || '#6366f1',
      sort_order: category.sortOrder,
      is_active: category.isActive,
      is_deleted: category.isDeleted,
      parent_uuid: category.parentUuid || null,
      updated_at: category.updatedAt.toISOString(),
    }

    const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'uuid' })
    if (error) {
      console.error('Master Data Sync Error:', error)
      throw new Error(`อัปเดตข้อมูลขึ้น Cloud ไม่สำเร็จ: ${error.message}`)
    }
  }

  /**
   * เพิ่มหมวดหมู่ใหม่ (Online-First)
   */
  async function createCategory(form: CategoryFormData): Promise<number> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถเพิ่มหมวดหมู่ได้ขณะออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ต')
    }

    const supabase = useSupabaseClient<any>()

    // Check duplicate name
    const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true }).eq('name', form.name.trim()).eq('is_deleted', false)
    if (count && count > 0) throw new Error(`ชื่อหมวดหมู่ "${form.name.trim()}" มีอยู่ในระบบแล้ว`)

    const now = new Date()
    const newCategory = {
      uuid: uuidv4(),
      name: form.name.trim(),
      parentId: form.parentId,
      parentUuid: form.parentUuid,
      description: form.description?.trim() || undefined,
      color: form.color || '#6366f1',
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    } as Category

    await _syncCategoryToCloud(newCategory)
    
    const id = await db.categories.add(newCategory)
    return id as number
  }

  /**
   * แก้ไขหมวดหมู่ (Online-First)
   */
  async function updateCategory(id: number, form: CategoryFormData): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถแก้ไขหมวดหมู่ได้ขณะออฟไลน์')
    }

    const cat = await db.categories.get(id)
    if (!cat) throw new Error('ไม่พบหมวดหมู่')

    const supabase = useSupabaseClient<any>()

    if (form.name.trim() !== cat.name) {
      const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true }).eq('name', form.name.trim()).eq('is_deleted', false).neq('uuid', cat.uuid)
      if (count && count > 0) throw new Error(`ชื่อหมวดหมู่ "${form.name.trim()}" มีอยู่ในระบบแล้ว`)
    }

    const updatedCategory: Category = {
      ...cat,
      name: form.name.trim(),
      parentId: form.parentId,
      parentUuid: form.parentUuid,
      description: form.description?.trim() || undefined,
      color: form.color || '#6366f1',
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      updatedAt: new Date(),
    }

    await _syncCategoryToCloud(updatedCategory)
    await db.categories.update(id, updatedCategory)
  }

  /**
   * เปิด/ปิดหมวดหมู่ (Toggle isActive)
   */
  async function toggleCategoryActive(id: number): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถเปลี่ยนสถานะหมวดหมู่ได้ขณะออฟไลน์')
    }

    const cat = await db.categories.get(id)
    if (!cat) return

    const updatedCategory = { ...cat, isActive: !cat.isActive, updatedAt: new Date() }
    await _syncCategoryToCloud(updatedCategory)
    await db.categories.update(id, updatedCategory)
  }

  /**
   * Soft Delete หมวดหมู่
   */
  async function deleteCategory(id: number): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถลบหมวดหมู่ได้ขณะออฟไลน์')
    }

    const cat = await db.categories.get(id)
    if (!cat) return

    const updatedCategory = { ...cat, isDeleted: true, isActive: false, updatedAt: new Date() }
    await _syncCategoryToCloud(updatedCategory)
    await db.categories.update(id, updatedCategory)
  }

  /**
   * บันทึกการเรียงลำดับหมวดหมู่ใหม่ (Bulk Update sortOrder)
   */
  async function reorderCategories(orderedItems: Category[]): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถจัดเรียงหมวดหมู่ได้ขณะออฟไลน์')
    }

    const now = new Date()
    const toUpdate: Category[] = []
    
    for (let i = 0; i < orderedItems.length; i++) {
      const item = orderedItems[i]
      if (!item?.id) continue
      toUpdate.push({ ...item, sortOrder: i + 1, updatedAt: now })
    }

    for (const c of toUpdate) {
      await _syncCategoryToCloud(c)
    }

    await db.transaction('rw', db.categories, async () => {
      for (const c of toUpdate) {
          await db.categories.update(c.id!, c)
      }
    })
  }

  return {
    fetchAll,
    createCategory,
    updateCategory,
    toggleCategoryActive,
    deleteCategory,
    reorderCategories,
  }
}
