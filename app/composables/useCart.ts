// =============================================================================
// composables/useCart.ts
// Composable สำหรับจัดการตะกร้าสินค้า
// บันทึกลง IndexedDB ทันทีทุกครั้งที่มีการเปลี่ยนแปลง (Offline-first)
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db, getSetting, setSetting } from '~/db'
import { useInventory } from '~/composables/useInventory'
import { usePromotions } from '~/composables/usePromotions'
import type {
  Product,
  ProductWithCategory,
  OrderItem,
  Order,
  PaymentMethod,
  InventoryDeduction,
  AddonOption,
  Promotion,
  BuyXGetYConfig,
} from '~/types'

// --- Cart Item ที่ใช้ใน RAM (ขณะขายของ) ---
export interface CartItem {
  product: ProductWithCategory  // ใช้ ProductWithCategory เพื่อให้เข้าถึง .category.color ได้
  quantity: number
  unitPrice: number
  discount: number
  addons: AddonOption[]     // ตัวเลือกเสริมที่เลือก
  addonsTotal: number       // ราคารวม addons ต่อชิ้น
  totalPrice: number        // (unitPrice + addonsTotal) * qty - discount
  isFreeItem?: boolean      // true = ของแถมจากโปรโมชัน (ราคา 0)
  promotionId?: number      // FK → Promotion.id ที่ทำให้รายการนี้เป็นของแถม
  promotionName?: string    // ชื่อโปรโมชัน (snapshot)
}

// กุญแจสำหรับบันทึก Cart ลง AppSettings (Persist ระหว่าง Session)
const CART_STORAGE_KEY = 'active_cart'
let _persistTimer: ReturnType<typeof setTimeout> | null = null

// --- State: ตะกร้าสินค้าใน RAM (Global Singleton) ---
const cartItems = ref<CartItem[]>([])
const note = ref<string>('')
const discount = ref<number>(0)          // ส่วนลดรวม (บาท)
const taxRate = ref<number>(0)           // อัตราภาษี (%)
const deliveryRef = ref<string>('')      // รหัสอ้างอิง Delivery เช่น Grab, Lineman
const isLoading = ref<boolean>(false)

export function useCart() {
  const { checkStock, deductStock } = useInventory()

  // --- Computed: คำนวณยอดเงิน ---

  /** จำนวนรายการในตะกร้า */
  const totalItems = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0),
  )

  /** ยอดรวมก่อนส่วนลดรวมและภาษี */
  const subtotal = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.totalPrice, 0),
  )

  /** ยอดหลังหักส่วนลด */
  const afterDiscount = computed(() => subtotal.value - discount.value)

  /** ภาษี */
  const taxAmount = computed(() =>
    Math.round(afterDiscount.value * (taxRate.value / 100) * 100) / 100,
  )

  /** ยอดสุทธิที่ต้องชำระ */
  const totalAmount = computed(() => afterDiscount.value + taxAmount.value)

  /** ต้นทุนรวม (สำหรับคำนวณกำไร) */
  const totalCost = computed(() =>
    cartItems.value.reduce(
      (sum, item) => sum + item.product.costPrice * item.quantity,
      0,
    ),
  )

  /** กำไรโดยประมาณ */
  const profitAmount = computed(() => totalAmount.value - totalCost.value)

  /** ตรวจสอบว่าตะกร้าว่างเปล่า */
  const isEmpty = computed(() => cartItems.value.length === 0)

  function schedulePersist(): void {
    if (_persistTimer) clearTimeout(_persistTimer)
    _persistTimer = setTimeout(() => { persistCart() }, 300)
  }

  // ---------------------------------------------------------------------------
  // Methods: จัดการตะกร้า
  // ---------------------------------------------------------------------------

  /**
   * เพิ่มสินค้าลงตะกร้า
   * ถ้าสินค้าเดิมมีอยู่และไม่มี addons → เพิ่มจำนวน
   * ถ้ามี addons → เพิ่มเป็น row ใหม่เสมอ (เพราะ option ต่างกัน)
   *
   * @param product - สินค้าที่ต้องการเพิ่ม
   * @param qty - จำนวน (default: 1)
   * @param addons - ตัวเลือกเสริมที่เลือก (optional)
   * @param addonsTotal - ราคารวม addons ต่อชิ้น (optional)
   */
  async function addItem(
    product: ProductWithCategory,
    qty: number = 1,
    addons: AddonOption[] = [],
    addonsTotal: number = 0
  ): Promise<boolean> {
    // ตรวจสอบสต็อก (ไม่นับ free items หรือ special menu เป็น existing item → เพิ่มเป็น row ใหม่เสมอ)
    const existingItem = cartItems.value.find(
      i => i.product.id === product.id && i.addons.length === 0 && addons.length === 0 && !i.isFreeItem && !product.isSpecialMenu
    )
    const currentQty = existingItem?.quantity ?? 0
    const hasStock = await checkStock(product, currentQty + qty)

    if (!hasStock) return false // สต็อกไม่พอ

    if (existingItem && addons.length === 0) {
      // สินค้ามีในตะกร้าแล้วและไม่มี addons → เพิ่มจำนวน
      existingItem.quantity += qty
      existingItem.totalPrice = (existingItem.unitPrice + existingItem.addonsTotal) * existingItem.quantity - existingItem.discount
    }
    else {
      // เพิ่มสินค้าใหม่เข้าตะกร้า (รวมกรณีมี addons)
      cartItems.value.push({
        product,
        quantity: qty,
        unitPrice: product.salePrice,
        discount: 0,
        addons,
        addonsTotal,
        totalPrice: (product.salePrice + addonsTotal) * qty,
      })
    }

    schedulePersist()
    return true
  }

  /**
   * อัปเดตจำนวนสินค้าในตะกร้า
   * ถ้า qty <= 0 → ลบออกจากตะกร้า
   *
   * @param productId - ID ของสินค้า
   * @param qty - จำนวนใหม่
   */
  async function updateQuantity(productId: number, qty: number, addonKey?: string): Promise<void> {
    if (qty <= 0) {
      removeItem(productId, addonKey)
      return
    }

    // ถ้ามี addonKey ให้หา item ที่ตรงกัน (uuid ของ addons รวม)
    const item = addonKey
      ? cartItems.value.find(i => i.product.id === productId && getAddonKey(i) === addonKey)
      : cartItems.value.find(i => i.product.id === productId && i.addons.length === 0)
    if (!item) return

    item.quantity = qty
    item.totalPrice = (item.unitPrice + item.addonsTotal) * qty - item.discount
    schedulePersist()
  }

  /**
   * อัปเดต Add-ons สำหรับสินค้าที่อยู่ในตะกร้าแล้ว
   * ถ้าการอัปเดตทำให้ key ไปชนกับรายการอื่นที่มีอยู่แล้ว ระบบจะรวมจำนวนให้
   */
  async function updateItemAddons(
    productId: number,
    oldAddonKey: string | undefined,
    newAddons: AddonOption[],
    newAddonsTotal: number
  ) {
    const idx = cartItems.value.findIndex(i => i.product.id === productId && getAddonKey(i) === (oldAddonKey || ''))
    if (idx === -1) return

    const item = cartItems.value[idx]
    if (!item) return
    
    // คำนวณ Key ใหม่ (เรียง ID)
    const newKey = newAddons.map(a => a.id).sort().join('|')
    
    // เช็คว่าชนกับรายการอื่นที่มีอยู่แล้วหรือไม่
    const existingIdx = cartItems.value.findIndex((i, index) => 
      index !== idx && i.product.id === productId && getAddonKey(i) === newKey
    )

    if (existingIdx !== -1) {
      const existingItem = cartItems.value[existingIdx]
      if (existingItem) {
        // ถ้ารวมกันได้ ให้บวก quantity เพิ่มไปที่ตัวเดิม และลบตัวปัจจุบันทิ้ง
        existingItem.quantity += item.quantity
        existingItem.totalPrice = 
          (existingItem.unitPrice + existingItem.addonsTotal) * 
          existingItem.quantity - 
          existingItem.discount
        cartItems.value.splice(idx, 1)
      }
    } else {
      // ถ้าไม่ซ้ำกับใคร ให้อัปเดตข้อมูลของตัวมันเองเลย
      item.addons = newAddons
      item.addonsTotal = newAddonsTotal
      item.totalPrice = (item.unitPrice + item.addonsTotal) * item.quantity - item.discount
    }

    schedulePersist()
  }

  /**
   * ลบสินค้าออกจากตะกร้า
   * @param productId - ID ของสินค้าที่จะลบ
   * @param addonKey - key ของ addons (ถ้ามีหลาย row ของสินค้าเดียวกัน)
   * @param itemIndex - index ตรง ๆ ในอาเรย์ (ใช้เมื่อรู้ตำแหน่งแน่นอน เพื่อป้องกันลบผิดตัวเมื่อ productId ซ้ำ)
   */
  async function removeItem(productId: number, addonKey?: string, itemIndex?: number): Promise<void> {
    const index = itemIndex !== undefined
      ? itemIndex
      : addonKey
        ? cartItems.value.findIndex(i => i.product.id === productId && getAddonKey(i) === addonKey)
        : cartItems.value.findIndex(i => i.product.id === productId)
    if (index !== -1) {
      cartItems.value.splice(index, 1)
      schedulePersist()
    }
  }

  /** สร้าง unique key สำหรับ CartItem ที่มี addons */
  function getAddonKey(item: CartItem): string {
    return item.addons.map(a => a.id).sort().join('|')
  }

  /**
   * เพิ่มสินค้าแถมจากโปรโมชันลงตะกร้า (ราคา 0, ไม่ตรวจสต็อก)
   */
  async function addFreeItem(
    product: ProductWithCategory,
    promotionId: number,
    promotionName: string,
    qty: number = 1,
  ): Promise<void> {
    cartItems.value.push({
      product,
      quantity: qty,
      unitPrice: 0,
      discount: 0,
      addons: [],
      addonsTotal: 0,
      totalPrice: 0,
      isFreeItem: true,
      promotionId,
      promotionName,
    })
    schedulePersist()
  }

  /**
   * ล้างตะกร้าทั้งหมด
   */
  async function clearCart(): Promise<void> {
    cartItems.value = []
    note.value = ''
    discount.value = 0
    schedulePersist()
  }

  // ---------------------------------------------------------------------------

  /**
   * ยืนยันการขาย
   * 1. ตัดสต็อกสินค้าทุกรายการ
   * 2. สร้าง Order บันทึกลง IndexedDB
   * 3. ล้างตะกร้า
   *
   * @param staffId - ID ของพนักงานที่ขาย
   * @param staffUuid - UUID ของพนักงาน
   * @param staffName - ชื่อพนักงาน
   * @param paymentMethod - วิธีชำระเงิน
   * @param amountReceived - จำนวนเงินที่รับมา
   * @returns Order ที่สร้างขึ้น หรือ null ถ้าล้มเหลว
   */
  async function checkout(
    staffId: number,
    staffUuid: string,
    staffName: string,
    paymentMethod: PaymentMethod,
    amountReceived: number,
    cashDenominations?: Record<string, number>,
  ): Promise<Order | null> {
    if (isEmpty.value) return null
    isLoading.value = true

    try {
      // 1. ตรวจสอบสต็อกรอบสุดท้ายก่อน Checkout (reads เท่านั้น)
      // ข้ามการตรวจสต็อกสำหรับ free items (isFreeItem = true)
      for (const item of cartItems.value) {
        if (item.isFreeItem) continue
        const hasStock = await checkStock(item.product, item.quantity)
        if (!hasStock) {
          alert(`สินค้า "${item.product.name}" สต็อกไม่เพียงพอ`)
          return null
        }
      }

      // เก็บ snapshot ก่อนล้างตะกร้า และเตรียมข้อมูลนอก transaction
      const snapshot = [...cartItems.value]
      const posStore = usePosStore()
      const { receiptSettings, loadReceiptSettings } = useSettings()
      
      // โหลด Settings ล่าสุดจาก DB เพื่อตรวจสอบ KDS และ Device Code
      await loadReceiptSettings()
      
      const orderNumber = await generateOrderNumber()
      const now = new Date()
      const isUnpaid = paymentMethod === 'unpaid'
      const isKdsEnabled = receiptSettings.value.enableKds ?? true

      let savedOrder: Order | undefined

      // รวม write ทั้งหมดใน transaction เดียว + relaxed durability ('rw?')
      // ลดจาก 10+ transactions เหลือ 1 transaction, fsync ครั้งเดียว
      await db.transaction('rw?', [db.orders, db.products, db.appSettings], async () => {
        // 2. สร้าง OrderItems พร้อมตัดสต็อก
        const orderItems: OrderItem[] = []
        for (const item of snapshot) {
          // free items ตัดสต็อกปกติ แต่ราคา = 0
          const deductions: InventoryDeduction[] = await deductStock(item.product, item.quantity)
          const category = posStore.categories.find(c => c.id === item.product.categoryId)
          orderItems.push({
            productId: item.product.id ?? 0,
            productUuid: item.product.uuid,
            categoryId: item.product.categoryId,
            categoryUuid: category?.uuid || '',
            productName: item.product.name,
            productSku: item.product.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.product.costPrice || (item.product.salePrice * 0.6),
            discount: item.discount,
            addons: item.addons,
            addonsTotal: item.addonsTotal,
            totalPrice: item.totalPrice,
            inventoryDeductions: JSON.parse(JSON.stringify(deductions)),
            isFreeItem: item.isFreeItem ?? false,
            promotionId: item.promotionId,
            promotionName: item.promotionName,
          })
        }

        // 3. บันทึก Order
        const newOrder: Omit<Order, 'id'> = {
          uuid: uuidv4(),
          orderNumber,
          staffId,
          staffUuid,
          staffName,
          items: orderItems,
          subtotal: subtotal.value,
          discountAmount: discount.value,
          taxRate: taxRate.value,
          taxAmount: taxAmount.value,
          totalAmount: totalAmount.value,
          totalCost: totalCost.value,
          profitAmount: profitAmount.value,
          paymentMethod,
          amountReceived: isUnpaid ? 0 : amountReceived,
          changeAmount: isUnpaid ? 0 : amountReceived - totalAmount.value,
          cashDenominations: paymentMethod === 'cash' ? cashDenominations : undefined,
          status: isUnpaid ? 'pending' : 'completed',
          kitchenStatus: isKdsEnabled ? 'pending' : 'served',
          note: note.value,
          deliveryRef: deliveryRef.value,
          syncStatus: 'pending',
          syncRetryCount: 0,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        }
        // strip Vue Proxy wrappers ออกก่อน add (IndexedDB Structured Clone ไม่รองรับ Proxy)
        const cleanOrder = JSON.parse(JSON.stringify(newOrder))
        cleanOrder.createdAt = now
        cleanOrder.updatedAt = now
        const orderId = await db.orders.add(cleanOrder as Order)
        savedOrder = { ...cleanOrder, id: orderId } as Order

        // 4. อัพ totalSold ทุก item พร้อมกัน (ข้ามสเปเชียลเมนูที่ไม่มี id ใน DB)
        await Promise.all(snapshot
          .filter(item => item.product.id != null && !item.product.isSpecialMenu)
          .map(item =>
            db.products.update(item.product.id!, {
              totalSold: (item.product.totalSold || 0) + item.quantity
            })
          )
        )

        // 5. ล้างตะกร้าใน IndexedDB
        await setSetting(CART_STORAGE_KEY, { items: [], note: '', discount: 0, deliveryRef: deliveryRef.value })
      })

      // 6. อัพ totalSold ใน store memory โดยไม่ต้อง loadData() ใหม่
      for (const item of snapshot) {
        const prod = posStore.products.find(p => p.id === item.product.id)
        if (prod) prod.totalSold = (prod.totalSold || 0) + item.quantity
      }

      // 7. ล้างตะกร้าใน RAM
      cartItems.value = []
      note.value = ''
      discount.value = 0

      // 8. อัพจำนวน pending orders
      await posStore.refreshPendingOrdersCount()

      // 9. แจ้งเตือนสินค้าใกล้หมด (background, ไม่บล็อก)
      const { checkAfterCheckout } = useStockAlert()
      checkAfterCheckout(snapshot)

      // 9.1 อัพเดทโควต้าโปรวันเกิด (eventual consistency — หลัง commit)
      const birthdayItems = snapshot.filter(item => item.isFreeItem && item.promotionId)
      if (birthdayItems.length > 0) {
        const { incrementTotalGiven } = usePromotions()
        const grouped = new Map<number, number>()
        for (const item of birthdayItems) {
          grouped.set(item.promotionId!, (grouped.get(item.promotionId!) ?? 0) + item.quantity)
        }
        await Promise.all(
          [...grouped.entries()].map(([promoId, qty]) => incrementTotalGiven(promoId, qty))
        )
        // liveQuery ใน pos.ts จะ sync activePromotions อัตโนมัติหลัง DB เปลี่ยน
      }

      // 10. แจ้งเตือน LINE OA (fire-and-forget)
      if (savedOrder) {
        const { notifyNewOrder } = useLineNotify()
        notifyNewOrder(savedOrder).catch(() => {})
      }

      return savedOrder ?? null
    }
    catch (error) {
      console.error('❌ Checkout ล้มเหลว:', error)
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence: บันทึก/โหลด Cart จาก IndexedDB
  // ---------------------------------------------------------------------------

  /**
   * บันทึก Cart ลง AppSettings (IndexedDB)
   * เรียกทุกครั้งที่ Cart เปลี่ยนแปลง → ป้องกันข้อมูลหายเมื่อปิดแอป
   */
  async function persistCart(): Promise<void> {
    const cartData = {
      items: cartItems.value.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        addons: item.addons,
        addonsTotal: item.addonsTotal,
        totalPrice: item.totalPrice,
        isFreeItem: item.isFreeItem,
        promotionId: item.promotionId,
        promotionName: item.promotionName,
      })),
      note: note.value,
      discount: discount.value,
      deliveryRef: deliveryRef.value,
    }
    await setSetting(CART_STORAGE_KEY, cartData)
  }

  /**
   * โหลด Cart จาก IndexedDB เมื่อเปิดแอปขึ้นมาใหม่
   * ป้องกันข้อมูลหายเมื่อ Browser รีเฟรชหรือ App ถูกปิด
   */
  async function loadCart(): Promise<void> {
    const saved = await getSetting<{
      items: Array<{
        productId: number
        quantity: number
        unitPrice: number
        discount: number
        addons: AddonOption[]
        addonsTotal: number
        totalPrice: number
        isFreeItem?: boolean
        promotionId?: number
        promotionName?: string
      }>
      note: string
      discount: number
      deliveryRef: string
    } | null>(CART_STORAGE_KEY, null)

    if (!saved || !saved.items.length) return

    // batch-fetch สินค้าทั้งหมดในครั้งเดียว แทน get() ทีละตัว
    const ids = saved.items.map(i => i.productId)
    const fetched = await db.products.where('id').anyOf(ids).toArray()
    const productMap = new Map(fetched.map(p => [p.id!, p]))

    // batch-fetch category เพื่อ join เข้า product (ต้องการ ProductWithCategory)
    const catIds = [...new Set(fetched.map(p => p.categoryId).filter(Boolean))]
    const fetchedCats = catIds.length > 0
      ? await db.categories.where('id').anyOf(catIds).toArray()
      : []
    const categoryMap = new Map(fetchedCats.map(c => [c.id!, c]))

    const restoredItems: CartItem[] = []
    for (const saved_item of saved.items) {
      const product = productMap.get(saved_item.productId)
      if (!product || product.isDeleted || !product.isActive) continue

      // join category เพื่อให้ได้ ProductWithCategory (มี .category field)
      const category = categoryMap.get(product.categoryId)
      const productWithCategory = { ...product, category: category! }

      restoredItems.push({
        product: productWithCategory,
        quantity: saved_item.quantity,
        unitPrice: saved_item.unitPrice,
        discount: saved_item.discount,
        addons: saved_item.addons ?? [],
        addonsTotal: saved_item.addonsTotal ?? 0,
        totalPrice: saved_item.totalPrice,
        isFreeItem: saved_item.isFreeItem,
        promotionId: saved_item.promotionId,
        promotionName: saved_item.promotionName,
      })
    }

    cartItems.value = restoredItems
    note.value = saved.note ?? ''
    discount.value = saved.discount ?? 0
    deliveryRef.value = saved.deliveryRef ?? ''
  }

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

  /**
   * สร้างเลขออร์เดอร์แบบรันนิ่ง: YUM-YYYYMMDD-[DEVICE]-XXXX
   * เช่น YUM-20260406-D1-0001
   */
  async function generateOrderNumber(): Promise<string> {
    const { receiptSettings, loadReceiptSettings } = useSettings()
    
    // โหลด Settings เพื่อเอา Device Code ล่าสุด
    await loadReceiptSettings()

    const device = receiptSettings.value.deviceCode || 'D1'
    const today = new Date()
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
    const timeStr = today.getHours().toString().padStart(2, '0') + today.getMinutes().toString().padStart(2, '0') // HHmm

    // นับจำนวน Order ของวันนี้
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    const todayCount = await db.orders
      .where('createdAt')
      .between(startOfDay, endOfDay)
      .count()

    const seq = String(todayCount + 1).padStart(4, '0')
    return `YUM-${dateStr}-${timeStr}-${device}-${seq}`
  }

  /**
   * ลบ free items ที่ไม่ผ่านเงื่อนไขโปรอีกต่อไปออกจากตะกร้าอัตโนมัติ
   * เรียกหลัง removeItem / updateQuantity เพื่อ sync free items กับ eligible count
   */
  function cleanupOrphanedFreeItems(promotions: Promotion[]): void {
    const buyXGetYPromos = promotions.filter(p => p.type === 'buyXGetY' && p.isActive && !p.isDeleted)
    let changed = false

    for (const promo of buyXGetYPromos) {
      const config = promo.config as BuyXGetYConfig
      const eligibleCount = cartItems.value
        .filter(i => !i.isFreeItem && promo.eligibleProductIds.includes(i.product.id!))
        .reduce((sum, i) => sum + i.quantity, 0)

      const completedRounds = Math.floor(eligibleCount / config.buyQty)
      const allowedFreeQty = completedRounds * config.freeQty

      const freeItemsForPromo = cartItems.value.filter(i => i.isFreeItem && i.promotionId === promo.id)
      const currentFreeQty = freeItemsForPromo.reduce((sum, i) => sum + i.quantity, 0)

      if (currentFreeQty > allowedFreeQty) {
        let toRemove = currentFreeQty - allowedFreeQty
        for (let i = cartItems.value.length - 1; i >= 0 && toRemove > 0; i--) {
          const item = cartItems.value[i]
          if (!item || !item.isFreeItem || item.promotionId !== promo.id) continue
          if (item.quantity <= toRemove) {
            toRemove -= item.quantity
            cartItems.value.splice(i, 1)
          } else {
            item.quantity -= toRemove
            toRemove = 0
          }
          changed = true
        }
      }
    }

    if (changed) schedulePersist()
  }

  return {
    // State
    cartItems,
    note,
    discount,
    taxRate,
    deliveryRef,
    isLoading,

    // Computed
    totalItems,
    subtotal,
    afterDiscount,
    taxAmount,
    totalAmount,
    totalCost,
    profitAmount,
    isEmpty,

    // Methods
    addItem,
    addFreeItem,
    updateQuantity,
    removeItem,
    updateItemAddons,
    getAddonKey,
    clearCart,
    checkout,
    loadCart,
    cleanupOrphanedFreeItems,
  }
}
