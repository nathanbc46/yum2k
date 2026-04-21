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

  /**
   * เพิ่มหมวดหมู่ใหม่
   */
  async function createCategory(form: CategoryFormData): Promise<number> {
    const now = new Date()
    const id = await db.categories.add({
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
    } as Category)
    return id as number
  }

  /**
   * แก้ไขหมวดหมู่
   */
  async function updateCategory(id: number, form: CategoryFormData): Promise<void> {
    await db.categories.update(id, {
      name: form.name.trim(),
      parentId: form.parentId,
      parentUuid: form.parentUuid,
      description: form.description?.trim() || undefined,
      color: form.color || '#6366f1',
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      updatedAt: new Date(),
    })
  }

  /**
   * เปิด/ปิดหมวดหมู่ (Toggle isActive)
   */
  async function toggleCategoryActive(id: number): Promise<void> {
    const cat = await db.categories.get(id)
    if (!cat) return
    await db.categories.update(id, {
      isActive: !cat.isActive,
      updatedAt: new Date(),
    })
  }

  /**
   * Soft Delete หมวดหมู่
   */
  async function deleteCategory(id: number): Promise<void> {
    await db.categories.update(id, {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
    })
  }

  /**
   * บันทึกการเรียงลำดับหมวดหมู่ใหม่ (Bulk Update sortOrder)
   */
  async function reorderCategories(orderedItems: Category[]): Promise<void> {
    const now = new Date()
    await db.transaction('rw', db.categories, async () => {
      for (let i = 0; i < orderedItems.length; i++) {
        const item = orderedItems[i]
        if (!item?.id) continue
        await db.categories.update(item.id, {
          sortOrder: i + 1,
          updatedAt: now
        })
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
