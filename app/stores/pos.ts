import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'
import { db } from '~/db'
import { seedDatabase } from '~/db/seedData'
import { useSettings } from '~/composables/useSettings'
import { useAuthStore } from '~/stores/auth'
import type { Category, ProductWithCategory, Order, Promotion } from '~/types'

export const usePosStore = defineStore('pos', () => {
  // โหลด Settings (singleton ref จาก useSettings)
  const { receiptSettings, loadReceiptSettings } = useSettings()

  // State
  const activeCategoryId = ref<number | null>(null)
  const currentParentId = ref<number | null>(null)
  const categories = ref<Category[]>([])
  const products = ref<ProductWithCategory[]>([])
  const isLoading = ref<boolean>(false)
  const loadError = ref<string | null>(null)
  const lastOrder = ref<Order | null>(null)
  const selectedCartItemIndex = ref<number | null>(null)
  const pendingOrdersCount = ref<number>(0)
  const viewMode = ref<'pos' | 'kds'>('pos')
  const kitchenFilter = ref<'all' | 'ready'>('all')
  const activePromotions = ref<Promotion[]>([])
  const activePromotionFilter = ref<Promotion | null>(null)
  let _promotionsSub: { unsubscribe(): void } | null = null

  // Computed
  const activeCategory = computed(() => 
    categories.value.find(c => c.id === activeCategoryId.value) ?? null
  )

  const displayedCategories = computed(() => {
    return categories.value
      .filter(c => (c.parentId ?? null) === currentParentId.value)
      // เปิดใช้การกรองหมวดหมู่ว่างเหมือนเดิม เพื่อความสวยงาม (ตอนนี้ข้อมูลน่าจะมาแล้ว)
      .filter(c => (categoryProductCounts.value[c.id!] || 0) > 0)
  })

  // คำนวณจำนวนสินค้าในแต่ละหมวดหมู่ (นับรวมหมวดหมู่ย่อยแบบ Recursive)
  const categoryProductCounts = computed(() => {
    const counts: Record<number, number> = {}
    
    // 1. นับสินค้าที่อยู่ในหมวดหมู่โดยตรง
    products.value.forEach(p => {
      if (p.categoryId) {
        counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
      }
    })

    // 2. ฟังก์ชันช่วยนับรวมลูกๆ ทั้งหมด
    const getRecursiveCount = (catId: number): number => {
      let total = counts[catId] || 0
      const children = categories.value.filter(c => c.parentId === catId)
      children.forEach(child => {
        if (child.id) total += getRecursiveCount(child.id)
      })
      return total
    }

    const result: Record<number, number> = {}
    categories.value.forEach(cat => {
      if (cat.id) result[cat.id] = getRecursiveCount(cat.id)
    })
    return result
  })

  const parentCategory = computed(() => {
    if (!currentParentId.value) return null
    return categories.value.find(c => c.id === currentParentId.value) ?? null
  })

  /** ฟังก์ชันช่วยดึง ID หมวดหมู่ย่อยทั้งหมดรวมตัวเอง (Recursive) */
  function getCategoryDescendants(parentId: number): number[] {
    const ids = [parentId]
    const children = categories.value.filter(c => c.parentId === parentId)
    children.forEach(child => {
      if (child.id) ids.push(...getCategoryDescendants(child.id))
    })
    return ids
  }

  const filteredProducts = computed(() => {
    // Promotion filter มีความสำคัญสูงสุด override category
    if (activePromotionFilter.value) {
      const ids = new Set(activePromotionFilter.value.eligibleProductIds)
      return products.value.filter(p => ids.has(p.id!))
    }

    // อ่าน setting ว่าจะรวมหมวดหมู่ย่อยหรือไม่ (default: true)
    const includeSubcategories = receiptSettings.value.showSubcategoryProducts ?? true

    // 1. ไม่ได้เลือกหมวดหมู่ → แสดงทั้งหมดเรียงตามขายดี
    if (!activeCategoryId.value) {
      return [...products.value].sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0))
    }

    // 2. เลือกหมวดหมู่แล้ว
    if (includeSubcategories) {
      // โหมดรวมหมวดหมู่ย่อย: ดึงสินค้าจากหมวดหมู่นี้และหมวดหมู่ย่อยทั้งหมด
      const targetCategoryIds = getCategoryDescendants(activeCategoryId.value)
      return products.value
        .filter(p => p.categoryId && targetCategoryIds.includes(p.categoryId))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    } else {
      // โหมดเฉพาะหมวดหมู่: แสดงเฉพาะสินค้าในหมวดหมู่ที่เลือกโดยตรง ไม่รวมหมวดหมู่ย่อย
      return products.value
        .filter(p => p.categoryId === activeCategoryId.value)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }
  })

  const promotedProductIds = computed(() => {
    const ids = new Set<number>()
    for (const promo of activePromotions.value) {
      for (const id of promo.eligibleProductIds) ids.add(id)
    }
    return ids
  })

  const birthdayProductIds = computed(() => {
    const ids = new Set<number>()
    for (const promo of activePromotions.value) {
      if (promo.type === 'birthday') {
        for (const id of promo.eligibleProductIds) ids.add(id)
      }
    }
    return ids
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
  async function loadData(force = false) {
    if (isLoading.value) return
    
    // โหลด Settings เสมอเพื่อให้ UI สะท้อนค่าล่าสุด (เช่น showSubcategoryProducts)
    // ถึงแม้ข้อมูลสินค้าจะอยู่ใน memory แล้วก็ตาม
    await loadReceiptSettings()

    // ข้ามการโหลดซ้ำถ้าข้อมูลอยู่ใน memory แล้ว (เช่น navigate กลับจาก orders)
    // ใช้ force=true เพื่อบังคับโหลดใหม่ (เช่น หลัง pull จาก cloud)
    if (!force && products.value.length > 0 && categories.value.length > 0) {
      // อัปเดตคิวค้างจ่ายด้วย (เผื่อมีออร์เดอร์ใหม่จากเครื่องอื่น sync ลงมา)
      await refreshPendingOrdersCount()
      return
    }

    isLoading.value = true
    loadError.value = null

    try {

      // 1. ระบบเริ่มต้นผู้ใช้งาน (เช็ค Local/Cloud/Seed)
      const authStore = useAuthStore()
      const userInit = await authStore.initUserSystem()

      if (userInit.status !== 'ready') {
        loadError.value = userInit.message ?? 'ไม่สามารถเริ่มต้นระบบได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
        return
      }

      // 2. โหลด Category ทั้งหมด
      // ดึงมาทั้งหมดแล้วค่อยกรองเพื่อความเสถียรของประเภทข้อมูล (Boolean/Number)
      const allCats = await db.categories.toArray()
      const loadedCats = allCats
        .filter(c => (!c.isDeleted || c.isDeleted === (0 as any)) && c.isActive)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      
      categories.value = loadedCats

      // 3. โหลด Product พร้อมโยงหา Category
      const allProds = await db.products.toArray()
      const activeProds = allProds.filter(p => 
        (!p.isDeleted || p.isDeleted === (0 as any)) && p.isActive
      )
      
      // จอยข้อมูล Category ลงใน Product
      products.value = activeProds.map(p => {
        const cat = loadedCats.find(c => c.id === p.categoryId)
        return {
          ...p,
          category: cat as Category
        }
      })

      // 4. Subscribe โปรโมชัน active แบบ realtime (liveQuery)
      if (!_promotionsSub) {
        _promotionsSub = liveQuery(() =>
          db.promotions.filter(p => !p.isDeleted && !!p.isActive).toArray()
        ).subscribe((promos) => {
          activePromotions.value = promos
        })
      }

      // 5. โหลดจำนวนคิวค้างจ่าย
      await refreshPendingOrdersCount()

    } catch (e: any) {
      console.error('❌ POS Store Error:', e)
      loadError.value = e?.message || 'ไม่สามารถโหลดข้อมูลได้'
    } finally {
      isLoading.value = false
    }
  }

  function setPromotionFilter(promo: Promotion | null) {
    activePromotionFilter.value = promo
    if (promo) {
      activeCategoryId.value = null
      currentParentId.value = null
    }
  }

  function setActiveCategory(id: number | null) {
    activePromotionFilter.value = null
    // ถ้ากดอันเดิม ให้ย้อนกลับไปหาระดับบน (Toggle to Parent)
    if (activeCategoryId.value === id) {
      const current = categories.value.find(c => c.id === id)
      activeCategoryId.value = current?.parentId ?? null
      return
    }

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

  /** กลับไปที่หมวดหมู่ระดับนอกสุดทันที */
  function resetNavigation() {
    activeCategoryId.value = null
    currentParentId.value = null
    activePromotionFilter.value = null
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
      console.error('ไม่สามารถโหลดจำนวนรายการค้างจ่ายได้:', error)
    }
  }

  return {
    // state
    activeCategoryId,
    currentParentId,
    categories,
    products,
    isLoading,
    loadError,
    lastOrder,
    selectedCartItemIndex,
    pendingOrdersCount,
    viewMode,
    kitchenFilter,
    activePromotions,
    
    // computed
    activeCategory,
    displayedCategories,
    categoryProductCounts,
    parentCategory,
    filteredProducts,
    categoryPath,
    activePromotionFilter,
    promotedProductIds,
    birthdayProductIds,

    // methods
    loadData,
    setActiveCategory,
    setPromotionFilter,
    goBack,
    resetNavigation,
    setLastOrder,
    setSelectedCartItemIndex,
    refreshPendingOrdersCount,
    setViewMode: (mode: 'pos' | 'kds') => viewMode.value = mode,
    setKitchenFilter: (filter: 'all' | 'ready') => kitchenFilter.value = filter
  }
})
