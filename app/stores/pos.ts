import { defineStore } from 'pinia'
import { db } from '~/db'
import { seedDatabase } from '~/db/seedData'
import type { Category, ProductWithCategory, Order } from '~/types'

export const usePosStore = defineStore('pos', () => {
  // State
  const activeCategoryId = ref<number | null>(null)
  const currentParentId = ref<number | null>(null)
  const categories = ref<Category[]>([])
  const products = ref<ProductWithCategory[]>([])
  const isLoading = ref<boolean>(false)
  const lastOrder = ref<Order | null>(null)
  const selectedCartItemIndex = ref<number | null>(null)
  const pendingOrdersCount = ref<number>(0)

  // Computed
  const activeCategory = computed(() => 
    categories.value.find(c => c.id === activeCategoryId.value) ?? null
  )

  const displayedCategories = computed(() => {
    return categories.value.filter(c => (c.parentId ?? null) === currentParentId.value)
  })

  const parentCategory = computed(() => {
    if (!currentParentId.value) return null
    return categories.value.find(c => c.id === currentParentId.value) ?? null
  })

  const filteredProducts = computed(() => {
    if (!activeCategoryId.value) return products.value
    return products.value.filter(p => p.categoryId === activeCategoryId.value)
  })

  // สร้างรายชื่อหมวดหมู่ตามลำดับชั้น (Breadcrumbs)
  const categoryPath = computed(() => {
    if (!activeCategoryId.value) return []
    const path: Category[] = []
    let currentId: number | null = activeCategoryId.value
    
    while (currentId) {
      const cat = categories.value.find(c => c.id === currentId)
      if (cat) {
        path.unshift(cat)
        currentId = cat.parentId ?? null
      } else {
        currentId = null
      }
    }
    return path
  })

  // Methods
  async function loadData() {
    if (isLoading.value) return // ป้องกันการเรียกซ้อน
    isLoading.value = true
    
    try {
      // 1. เช็คก่อนว่ามีข้อมูลไหม, ถ้าไม่มี ให้สั่งรัน Seed ลงฐานข้อมูล
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

      // 4. โหลดจำนวนคิวค้างจ่าย
      await refreshPendingOrdersCount()

    } catch (e) {
      console.error('โหลดข้อมูลลง POS ไม่สำเร็จ:', e)
    } finally {
      isLoading.value = false
    }
  }

  function setActiveCategory(id: number | null) {
    activeCategoryId.value = id
    
    // ถ้ามีการเลือกหมวดหมู่ ให้เช็คว่าต้อง Drill-down ไหม
    if (id) {
      const hasChildren = categories.value.some(c => c.parentId === id)
      if (hasChildren) {
        currentParentId.value = id
      }
    }
  }

  function goBack() {
    // 1. ถ้าปัจจุบันเราเลือกหมวดหมู่ย่อย (active) ที่ไม่ใช่หมวดหมู่ที่เป็นฐานของแถบข้าง (currentParent)
    // ให้ถอยกลับมาเลือกหมวดหมู่ที่เป็นฐานก่อน (เพื่อให้เห็นสินค้าในหมวดหมู่ที่เป็น Parent นั้น)
    if (activeCategoryId.value !== currentParentId.value) {
      activeCategoryId.value = currentParentId.value
      return
    }

    // 2. ถ้าปัจจุบันเราเลือกหมวดหมู่ที่เป็นฐานอยู่แล้ว (หรือไม่มีการเลือก)
    // ให้ถอยระดับแถบข้างขึ้นไป 1 ชั้นจริงๆ
    if (currentParentId.value) {
      const current = categories.value.find(c => c.id === currentParentId.value)
      const parentId = current?.parentId ?? null
      
      currentParentId.value = parentId
      activeCategoryId.value = parentId
    }
  }

  function setLastOrder(order: Order | null) {
    lastOrder.value = order
  }

  function setSelectedCartItemIndex(index: number | null) {
    selectedCartItemIndex.value = index
  }

  async function refreshPendingOrdersCount() {
    try {
      pendingOrdersCount.value = await db.orders
        .where('status')
        .equals('pending')
        .count()
    } catch (error) {
      console.error('ไม่สามารถโหลดจำนวนคิวค้างจ่ายได้:', error)
    }
  }

  return {
    // state
    activeCategoryId,
    currentParentId,
    categories,
    products,
    isLoading,
    lastOrder,
    selectedCartItemIndex,
    pendingOrdersCount,
    
    // computed
    activeCategory,
    displayedCategories,
    parentCategory,
    filteredProducts,
    categoryPath,

    // methods
    loadData,
    setActiveCategory,
    goBack,
    setLastOrder,
    setSelectedCartItemIndex,
    refreshPendingOrdersCount
  }
})
