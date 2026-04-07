import { defineStore } from 'pinia'
import { db } from '~/db'
import { seedDatabase } from '~/db/seedData'
import type { Category, ProductWithCategory, Order } from '~/types'

export const usePosStore = defineStore('pos', () => {
  // State
  const activeCategoryId = ref<number | null>(null)
  const categories = ref<Category[]>([])
  const products = ref<ProductWithCategory[]>([])
  const isLoading = ref<boolean>(false)
  const lastOrder = ref<Order | null>(null)

  // Computed
  const activeCategory = computed(() => 
    categories.value.find(c => c.id === activeCategoryId.value) ?? null
  )

  const filteredProducts = computed(() => {
    if (!activeCategoryId.value) return products.value
    return products.value.filter(p => p.categoryId === activeCategoryId.value)
  })

  // Methods
  async function loadData() {
    isLoading.value = true
    try {
      // 1. เช็คก่อนว่ามีข้อมูลไหม, ถ้าไม่มี ให้สั่งรัน Seed ลงฐานข้อมูล (เพื่อจำลอง Data ให้เล่นได้ทันที)
      const catCount = await db.categories.count()
      if (catCount === 0) {
        await seedDatabase()
      }

      // 2. โหลด Category
      const loadedCats = await db.categories
        .filter(c => c.isActive && !c.isDeleted)
        .sortBy('sortOrder')
      categories.value = loadedCats

      // Select อันแรกอัตโนมัติ
      if (loadedCats.length > 0 && !activeCategoryId.value) {
        activeCategoryId.value = loadedCats.at(0)?.id ?? null
      }

      // 3. โหลด Product พร้อมโยงหา Category
      const loadedProducts = await db.products
        .filter(p => p.isActive && !p.isDeleted)
        .sortBy('sortOrder')
        
      // จอยข้อมูล Category ลงใน Product (ทำ ProductWithCategory)
      const mappedProducts: ProductWithCategory[] = loadedProducts.map(p => {
        const cat = loadedCats.find(c => c.id === p.categoryId)
        return {
          ...p,
          category: cat as Category
        }
      })
      
      products.value = mappedProducts

    } catch (e) {
      console.error('โหลดข้อมูลลง POS ไม่สำเร็จ:', e)
    } finally {
      isLoading.value = false
    }
  }

  function setActiveCategory(id: number | null) {
    activeCategoryId.value = id
  }

  function setLastOrder(order: Order | null) {
    lastOrder.value = order
  }

  return {
    // state
    activeCategoryId,
    categories,
    products,
    isLoading,
    lastOrder,
    
    // computed
    activeCategory,
    filteredProducts,

    // methods
    loadData,
    setActiveCategory,
    setLastOrder
  }
})
