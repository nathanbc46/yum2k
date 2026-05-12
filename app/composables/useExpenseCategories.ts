import { db } from '~/db'
import type { ExpenseCategoryRecord } from '~/types'
import { v4 as uuidv4 } from 'uuid'

export function useExpenseCategories() {
  const categories = ref<ExpenseCategoryRecord[]>([])
  const isLoading = ref(false)

  const fetchAll = async () => {
    isLoading.value = true
    try {
      const all = await db.expenseCategories
        .orderBy('sortOrder')
        .filter(c => !c.isDeleted)
        .toArray()
      categories.value = all
      return all
    } finally {
      isLoading.value = false
    }
  }

  const addCategory = async (name: string, color?: string) => {
    const newCat: ExpenseCategoryRecord = {
      uuid: uuidv4(),
      name,
      color,
      sortOrder: categories.value.length + 1,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const id = await db.expenseCategories.add(newCat)
    await fetchAll()
    return id
  }

  const updateCategory = async (id: number, data: Partial<ExpenseCategoryRecord>) => {
    await db.expenseCategories.update(id, {
      ...data,
      updatedAt: new Date()
    })
    await fetchAll()
  }

  const deleteCategory = async (id: number) => {
    // Soft delete
    await db.expenseCategories.update(id, {
      isDeleted: true,
      updatedAt: new Date()
    })
    await fetchAll()
  }

  return {
    categories,
    isLoading,
    fetchAll,
    addCategory,
    updateCategory,
    deleteCategory
  }
}
