<template>
  <div class="flex flex-col h-full bg-surface-900 text-surface-50 relative">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-surface-800 flex flex-col gap-2 shrink-0 bg-surface-900/50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Back Button for Mobile -->
          <button 
            @click="$emit('close-mobile')"
            class="md:hidden w-10 h-10 flex items-center justify-center bg-surface-800 rounded-xl text-surface-400 active:scale-95 transition-all hover:bg-surface-700"
          >
            <ArrowLeft :size="20" />
          </button>
          <h2 class="text-lg font-black flex items-center gap-2">
            <span class="tracking-tight">ตะกร้าสินค้า</span>
            <span class="bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">{{ totalItems }}</span>
          </h2>
        </div>
        
        <div class="flex items-center gap-1.5">
          <button
            @click="router.push('/orders')"
            class="w-9 h-9 flex items-center justify-center bg-surface-800 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-all active:scale-95 border border-surface-700/50"
            title="ประวัติการขาย"
          >
            <History :size="18" />
          </button>
          <button 
            v-if="cartItems.length > 0"
            @click="handleClearCart()"
            class="w-9 h-9 flex items-center justify-center bg-surface-800 rounded-lg text-red-400 hover:text-red-300 hover:bg-surface-700 transition-all active:scale-95 border border-surface-700/50"
            title="ล้างตะกร้า"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </div>

      <!-- แถบสถานะและทางลัด (Status & Shortcuts) -->
      <div class="flex flex-col gap-2.5">
        <!-- สถานะออนไลน์ (ขนาดกะทัดรัด) -->
        <div class="flex items-center justify-between gap-2">
          <div
            class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black border transition-colors shrink-0"
            :class="isOnline ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></span>
            {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
          </div>
          <div class="text-[10px] text-surface-500 font-bold uppercase tracking-widest">ทางลัดด่วน</div>
        </div>

        <!-- Buy X Get Y Banner -->
        <PosBuyXGetYBanner
          v-if="buyXGetYEligibilities.length > 0"
          :eligibilities="buyXGetYEligibilities"
          @open-selector="onOpenFreeItemSelector"
        />

        <!-- ปุ่มทางลัดขนาดใหญ่ (Touch-friendly) - จะแสดงเฉพาะเมื่อมีรายการค้าง -->
        <div 
          v-if="posStore.pendingOrdersCount > 0 || cookingCount > 0 || readyCount > 0"
          class="flex flex-col gap-2"
        >
          <!-- แถวที่ 1: ค้างจ่าย -->
          <button
            v-if="posStore.pendingOrdersCount > 0"
            @click="router.push({ path: '/orders', query: { status: 'pending' } })"
            class="h-12 w-full flex items-center justify-center gap-2 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border shadow-sm bg-yellow-500/10 text-yellow-500 border-yellow-500/30 animate-pulse"
          >
            <div class="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>ค้างจ่าย: {{ posStore.pendingOrdersCount }} รายการ</span>
          </button>

          <!-- แถวที่ 2: ครัว (แบ่ง 2 ปุ่ม) -->
          <div 
            v-if="cookingCount > 0 || readyCount > 0"
            class="grid gap-2"
            :class="[cookingCount > 0 && readyCount > 0 ? 'grid-cols-2' : 'grid-cols-1']"
          >
            <!-- รอทำ (Cooking) -->
            <button
              v-if="cookingCount > 0"
              @click="posStore.setViewMode('kds'); posStore.setKitchenFilter('all')"
              class="h-14 flex items-center justify-center gap-2 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border shadow-lg shadow-amber-900/20 bg-amber-500 text-surface-950 border-amber-600 relative overflow-hidden group"
            >
              <div class="absolute top-0 right-0 p-1">
                <span class="flex h-2 w-2 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              </div>
              <ChefHat :size="18" />
              <span>รอทำ: {{ cookingCount }}</span>
            </button>

            <!-- รอเสิร์ฟ (Ready) -->
            <button
              v-if="readyCount > 0"
              @click="posStore.setViewMode('kds'); posStore.setKitchenFilter('ready')"
              class="h-14 flex items-center justify-center gap-2 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border shadow-lg shadow-green-900/20 bg-green-500 text-surface-950 border-green-600 relative overflow-hidden group"
            >
              <div class="absolute top-0 right-0 p-1">
                <span class="flex h-2 w-2 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              </div>
              <Bell :size="18" class="animate-bounce" />
              <span>รอเสิร์ฟ: {{ readyCount }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- รายการสินค้าในตะกร้า -->
    <div class="flex-1 min-h-0 overflow-y-auto overscroll-none p-3 sm:p-4 space-y-2 scrollbar-thin">
      <div 
        v-if="cartItems.length === 0" 
        class="h-full flex flex-col items-center justify-center text-surface-500 gap-4"
      >
        <div class="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center text-surface-600 opacity-50">
          <ShoppingCart :size="40" />
        </div>
        <p class="text-base font-medium">ยังไม่มีสินค้าในตะกร้า</p>
      </div>

      <div
        v-for="(item, idx) in cartItems"
        :key="`${item.product.id}_${idx}`"
        class="relative transition-all"
        :class="hasAddonGroups(item) ? 'cursor-pointer active:scale-[0.99]' : ''"
        @click.stop="hasAddonGroups(item) ? posStore.setSelectedCartItemIndex(posStore.selectedCartItemIndex === idx ? null : idx) : null"
      >
        <!-- Background Layer -->
        <div
          class="absolute inset-0 z-0 bg-surface-800 rounded-xl border transition-all border-l-[3px]"
          :class="posStore.selectedCartItemIndex === idx
            ? 'border-primary-500 ring-2 ring-primary-500/20 bg-surface-700'
            : 'border-surface-700 hover:border-surface-600'"
          :style="item.product.category?.color ? { borderLeftColor: item.product.category.color } : {}"
        />

        <!-- Single-line content -->
        <div class="relative z-10 flex items-center gap-2 px-3 py-2.5 pr-11">
          <!-- จำนวน badge -->
          <span class="shrink-0 min-w-[22px] h-[22px] flex items-center justify-center rounded-md text-[11px] font-black"
            :style="{ backgroundColor: (item.product.category?.color || '#6366f1') + '30', color: item.product.category?.color || '#818cf8' }">
            {{ item.quantity }}
          </span>

          <!-- ชื่อสินค้า + addons -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <div class="font-semibold text-sm text-surface-50 truncate leading-tight">{{ item.product.name }}</div>
              <span v-if="item.isFreeItem" class="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">แถม</span>
              <span
                v-if="hasAddonGroups(item)"
                class="shrink-0 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                :class="posStore.selectedCartItemIndex === cartItems.indexOf(item)
                  ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                  : 'bg-surface-700 text-surface-400 border-surface-600'"
                title="กดเพื่อเพิ่มตัวเลือกเสริม"
              >
                <SlidersHorizontal :size="9" />
              </span>
            </div>
            <!-- Addons row -->
            <div v-if="item.addons && item.addons.length > 0" class="flex flex-wrap gap-1 mt-0.5 pointer-events-auto">
              <span
                v-for="addon in item.addons"
                :key="addon.id"
                class="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-primary-100 text-primary-800 border-primary-300 dark:bg-primary-950/60 dark:text-primary-200 dark:border-primary-800 shadow-xs"
              >
                {{ addon.name }}{{ addon.price > 0 ? ` +${addon.price}` : '' }}
              </span>
            </div>
          </div>

          <!-- ราคารวม -->
          <div class="shrink-0 text-right">
            <span v-if="item.isFreeItem" class="font-black text-sm text-green-400">฿0</span>
            <template v-else>
              <span class="font-black text-sm text-primary-400">฿{{ item.totalPrice }}</span>
            </template>
          </div>
        </div>

        <!-- ปุ่มลบ -->
        <button
          @click.stop="handleRemoveItem(idx)"
          class="absolute top-1 right-1 z-20 w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500/40 hover:text-red-500 rounded-lg transition-all active:scale-90 border border-transparent pointer-events-auto"
          title="ลบรายการ"
        >
          <X :size="16" />
        </button>
      </div>
    </div>

    <!-- สรุปผล & Checkout -->
    <div class="p-4 border-t border-surface-800 bg-surface-900/80 shrink-0" style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
      <!-- ยอดสุทธิ -->
      <div class="mb-3">
        <div v-if="discount > 0" class="flex justify-between text-sm text-green-400 mb-1">
          <span>ส่วนลด</span>
          <span>-฿{{ discount }}</span>
        </div>
        <div class="flex justify-between text-xl font-bold text-surface-50">
          <span>ยอดสุทธิ</span>
          <span class="text-primary-400">฿{{ totalAmount }}</span>
        </div>
      </div>

      <!-- Delivery Ref -->
      <div class="mb-4 pt-3 border-t border-surface-800/50">
        <input 
          v-model="deliveryRef" 
          type="number"
          inputmode="numeric"
          placeholder="เลขอ้างอิง Delivery (ตัวเลขเท่านั้น)"
          class="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-3 text-sm focus:border-primary-500 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <!-- ปุ่มโค้ดโปรโมชัน -->
      <button
        @click="isPromoCodeModalOpen = true"
        class="w-full h-10 mb-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold border transition-all active:scale-95"
        :class="appliedPromoCode
          ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25'
          : 'bg-surface-800/60 text-surface-400 border-surface-700/50 hover:text-surface-200 hover:bg-surface-800'"
      >
        <span>🎟️</span>
        <span v-if="appliedPromoCode">{{ appliedPromoCode }} — {{ appliedPromoProductName }}</span>
        <span v-else>กรอกโค้ดโปรโมชัน</span>
      </button>

      <button
        @click="openSummaryModal"
        :disabled="cartItems.length === 0 || isProcessing"
        class="w-full btn-touch bg-primary-600 hover:bg-primary-500 disabled:bg-surface-800 disabled:text-surface-500 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-900/20 disabled:shadow-none"
      >
        <span v-if="isProcessing">กำลังประมวลผล...</span>
        <span v-else>สรุปคำสั่งซื้อ ฿{{ totalAmount }}</span>
      </button>
    </div>

    <!-- Modal สรุปยอดขาย -->
    <PosOrderSummaryModal 
      :is-open="isSummaryModalOpen"
      :items="cartItems"
      :subtotal="subtotal"
      :discount="discount"
      :total-amount="totalAmount"
      :note="note"
      :delivery-ref="deliveryRef"
      @close="isSummaryModalOpen = false"
      @confirm="handleConfirmOrder"
    />

    <!-- Addon Selection Modal (สำหรับเลือก/แก้ Addons ในตะกร้า) -->
    <PosAddonModal
      :is-open="isAddonModalOpen"
      :product="editingProduct"
      :initial-addons="editingInitialAddons"
      @cancel="isAddonModalOpen = false"
      @confirm="handleConfirmAddons"
    />

    <!-- Free Item Selector Modal (เลือกของแถม เมื่อครบจำนวน) -->
    <PosFreeItemModal
      :is-open="freeItemModalOpen"
      :promotion="freeItemPromotion"
      :eligible-products="freeItemEligibleProducts"
      :free-qty="freeItemQty"
      @close="freeItemModalOpen = false"
      @confirm="handleFreeItemConfirm"
    />

    <!-- Info Modal (ดูสินค้าในโปร ก่อนครบจำนวน) -->
    <PosFreeItemModal
      :is-open="infoModalOpen"
      :promotion="freeItemPromotion"
      :eligible-products="freeItemEligibleProducts"
      :free-qty="freeItemQty"
      :info-only="true"
      @close="infoModalOpen = false"
      @confirm="() => {}"
    />

    <!-- Modal กรอกโค้ดโปรโมชัน -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isPromoCodeModalOpen" class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-surface-950/70 backdrop-blur-sm" @click.self="closePromoCodeModal">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-4 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
          >
            <div v-if="isPromoCodeModalOpen" class="w-full max-w-sm bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black text-surface-50">🎟️ โค้ดโปรโมชัน</h3>
                <button @click="closePromoCodeModal" class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
                  <X :size="16" />
                </button>
              </div>

              <div>
                <input
                  ref="promoCodeInputRef"
                  v-model="promoCodeInput"
                  type="text"
                  placeholder="เช่น YAM-AB3"
                  maxlength="7"
                  @input="promoCodeInput = promoCodeInput.toUpperCase().replace(/[^A-Z0-9-]/g, '')"
                  @keydown.enter="handleValidateCode"
                  class="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-surface-50 focus:border-primary-500 outline-none transition-colors uppercase"
                />
                <p v-if="promoCodeError" class="text-red-400 text-sm text-center mt-2 font-medium">{{ promoCodeError }}</p>
              </div>

              <!-- ผลลัพธ์การตรวจสอบ: เลือกสินค้า -->
              <div v-if="promoCodeValidResult">
                <p class="text-xs font-black text-green-400 mb-2">✓ โค้ดถูกต้อง — เลือกสินค้าที่ต้องการ</p>
                <div class="flex flex-col gap-1.5">
                  <label
                    v-for="p in promoCodeValidResult.products"
                    :key="p.uuid"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all"
                    :class="selectedPromoProductUuid === p.uuid
                      ? 'bg-green-500/15 border-green-500/40'
                      : 'bg-surface-800 border-surface-700 hover:border-surface-600'"
                  >
                    <input type="radio" :value="p.uuid" v-model="selectedPromoProductUuid" class="w-4 h-4 accent-green-500 shrink-0" />
                    <span class="flex-1 text-sm font-bold text-surface-100">{{ p.name }}</span>
                    <span class="text-xs text-surface-500 shrink-0">฿{{ p.salePrice }}</span>
                  </label>
                </div>
              </div>

              <div class="flex gap-2">
                <button @click="closePromoCodeModal" class="flex-1 h-12 bg-surface-800 text-surface-300 font-bold rounded-xl transition-all active:scale-95 hover:bg-surface-700">
                  ยกเลิก
                </button>
                <button
                  v-if="!promoCodeValidResult"
                  @click="handleValidateCode"
                  :disabled="promoCodeInput.length < 7 || isValidatingCode"
                  class="flex-1 h-12 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-800 disabled:text-surface-500 text-white font-bold rounded-xl transition-all active:scale-95"
                >
                  {{ isValidatingCode ? 'กำลังตรวจสอบ...' : 'ตรวจสอบโค้ด' }}
                </button>
                <button
                  v-else
                  @click="handleApplyCode"
                  :disabled="!selectedPromoProductUuid"
                  class="flex-1 h-12 bg-green-600 hover:bg-green-500 disabled:bg-surface-800 disabled:text-surface-500 text-white font-bold rounded-xl transition-all active:scale-95"
                >
                  ยืนยัน รับสินค้าฟรี
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close-mobile'])
import {
  History,
  Trash2,
  ArrowLeft,
  ShoppingCart,
  Settings,
  Plus,
  Minus,
  X,
  Pencil,
  ChefHat,
  Bell,
  SlidersHorizontal
} from 'lucide-vue-next'
import { liveQuery } from 'dexie'
import { db } from '~/db'
import { useCart } from '~/composables/useCart'
import { useAuthStore } from '~/stores/auth'
import type { CartItem } from '~/composables/useCart'
import type { Product, AddonOption, Order, Promotion, ProductWithCategory } from '~/types'
import { usePosStore } from '~/stores/pos'
import { usePrinter } from '~/composables/usePrinter'
import { useToast } from '~/composables/useToast'
import PosOrderSummaryModal from './PosOrderSummaryModal.vue'
import PosAddonModal from './PosAddonModal.vue'
import PosBuyXGetYBanner from './PosBuyXGetYBanner.vue'
import PosFreeItemModal from './PosFreeItemModal.vue'
import type { PaymentMethod } from '~/types'
import { checkBuyXGetYEligibility } from '~/composables/useBuyXGetY'
import type { BuyXGetYEligibility } from '~/composables/useBuyXGetY'
import { usePromotionCodes } from '~/composables/usePromotionCodes'
import type { CodeValidationResult } from '~/composables/usePromotionCodes'

const router = useRouter()
const authUser = useAuthStore()
const posStore = usePosStore()
const { print } = usePrinter()
const toast = useToast()

// คำนวณจำนวนคิวในห้องเครื่องแบบ Real-time แยกสถานะ
const cookingCount = ref(0)
const readyCount = ref(0)
let kitchenSub: any = null

onMounted(() => {
  kitchenSub = liveQuery(() => 
    db.orders
      .where('kitchenStatus')
      .anyOf(['pending', 'preparing', 'ready'])
      .and(o => !o.isDeleted)
      .toArray()
  ).subscribe((orders: Order[]) => {
    cookingCount.value = orders.filter(o => ['pending', 'preparing'].includes(o.kitchenStatus)).length
    readyCount.value = orders.filter(o => o.kitchenStatus === 'ready').length
  })
})

onUnmounted(() => {
  if (kitchenSub) kitchenSub.unsubscribe()
})

const {
  cartItems,
  totalItems,
  subtotal,
  discount,
  totalAmount,
  updateQuantity,
  removeItem,
  updateItemAddons,
  getAddonKey,
  clearCart,
  checkout,
  loadCart,
  cleanupOrphanedFreeItems,
  note,
  deliveryRef
} = useCart()

// --- Buy X Get Y Banner ---
const buyXGetYEligibilities = computed(() =>
  checkBuyXGetYEligibility(cartItems.value, posStore.activePromotions.filter(p => p.type === 'buyXGetY'))
    .filter(e =>
      e.eligibleCountInCart > 0 &&
      (e.isTriggered || e.eligibleCountInCart % e.buyQty > 0)
    )
)

const freeItemModalOpen = ref(false)
const infoModalOpen = ref(false)
const freeItemPromotion = ref<Promotion | null>(null)
const freeItemEligibleProducts = ref<ProductWithCategory[]>([])
const freeItemQty = ref(1)

async function loadEligibleProducts(elig: BuyXGetYEligibility): Promise<ProductWithCategory[]> {
  const ids = elig.promotion.eligibleProductIds
  if (ids.length === 0) return []
  const products = await db.products.where('id').anyOf(ids).filter(p => !p.isDeleted && p.isActive).toArray()
  const catIds = [...new Set(products.map(p => p.categoryId))]
  const cats = await db.categories.where('id').anyOf(catIds).toArray()
  const catMap = new Map(cats.map(c => [c.id!, c]))
  return products.map(p => ({ ...p, category: catMap.get(p.categoryId)! }))
}

async function onOpenFreeItemSelector(elig: BuyXGetYEligibility) {
  freeItemPromotion.value = elig.promotion
  freeItemQty.value = elig.freeQty
  freeItemEligibleProducts.value = await loadEligibleProducts(elig)
  if (elig.isTriggered) {
    infoModalOpen.value = false
    freeItemModalOpen.value = true
  } else {
    freeItemModalOpen.value = false
    infoModalOpen.value = true
  }
}

async function handleFreeItemConfirm(items: Array<{ product: ProductWithCategory, qty: number, promotionId: number, promotionName: string }>) {
  const { addFreeItem } = useCart()
  for (const item of items) {
    await addFreeItem(item.product, item.promotionId, item.promotionName, item.qty)
  }
}

// auto-open เมื่อครบจำนวน
watch(buyXGetYEligibilities, async (newElig, oldElig) => {
  for (const elig of newElig) {
    const prev = oldElig?.find(e => e.promotion.id === elig.promotion.id)
    if (elig.isTriggered && !prev?.isTriggered && !freeItemModalOpen.value && !infoModalOpen.value) {
      freeItemPromotion.value = elig.promotion
      freeItemQty.value = elig.freeQty
      freeItemEligibleProducts.value = await loadEligibleProducts(elig)
      freeItemModalOpen.value = true
      break
    }
  }
})

async function handleClearCart() {
  await clearCart()
  posStore.setSelectedCartItemIndex(null)
}

const { isOnline } = useSync()


onMounted(async () => {
  await loadCart()
  await posStore.refreshPendingOrdersCount()
})

// สถานะและตัวแปรสำหรับแก้ไข Addons ในตะกร้า
const isAddonModalOpen = ref(false)
const editingProduct = ref<Product | null>(null)
const editingInitialAddons = ref<AddonOption[]>([])
const editingOldAddonKey = ref<string>('')

function hasAddonGroups(item: CartItem): boolean {
  return !!(item.product.addonGroups?.length || item.product.category?.addonGroups?.length)
}

function editAddons(item: CartItem) {
  // แทนที่จะเปิด Modal ตอนนี้เราเลือกให้แสดงพื้นที่ด้านล่างแทน
  const idx = cartItems.value.indexOf(item)
  if (idx !== -1) {
    posStore.setSelectedCartItemIndex(idx)
  }
}

function handleRemoveItem(idx: number) {
  const item = cartItems.value[idx]
  if (!item) return

  removeItem(item.product.id!, getAddonKey(item), idx)

  // Reset selection ถ้าตัวที่โดนลบคือตัวที่เลือกอยู่
  if (posStore.selectedCartItemIndex === idx) {
    posStore.setSelectedCartItemIndex(null)
  } else if (posStore.selectedCartItemIndex !== null && posStore.selectedCartItemIndex > idx) {
    posStore.setSelectedCartItemIndex(posStore.selectedCartItemIndex - 1)
  }

  // ลบ free items ที่ไม่ครบเงื่อนไขอีกต่อไปออกอัตโนมัติ
  if (!item.isFreeItem) {
    cleanupOrphanedFreeItems(posStore.activePromotions)
  }
}

async function handleConfirmAddons(selectedAddons: AddonOption[], addonsTotal: number) {
  if (!editingProduct.value) return
  await updateItemAddons(editingProduct.value.id!, editingOldAddonKey.value, selectedAddons, addonsTotal)
  isAddonModalOpen.value = false
}

const isProcessing = ref(false)
const isSummaryModalOpen = ref(false)

// loadCart() ถูกเรียกแล้วใน onMounted ด้านบน (ลบอันซ้ำกันออก)

function openSummaryModal() {
  if (cartItems.value.length === 0) return
  isSummaryModalOpen.value = true
}

// --- Promo Code ---
const { validateCode, redeemCode } = usePromotionCodes()
const isPromoCodeModalOpen = ref(false)
const promoCodeInput = ref('')
const promoCodeError = ref('')
const promoCodeValidResult = ref<CodeValidationResult | null>(null)
const isValidatingCode = ref(false)
const promoCodeInputRef = ref<HTMLInputElement | null>(null)

const appliedPromoCode = ref<string | null>(null)
const appliedPromoProductName = ref<string | null>(null)
const selectedPromoProductUuid = ref<string | null>(null)

function closePromoCodeModal() {
  isPromoCodeModalOpen.value = false
  promoCodeInput.value = ''
  promoCodeError.value = ''
  promoCodeValidResult.value = null
  selectedPromoProductUuid.value = null
}

watch(isPromoCodeModalOpen, async (val) => {
  if (val) {
    await nextTick()
    promoCodeInputRef.value?.focus()
  }
})

async function handleValidateCode() {
  if (promoCodeInput.value.length < 7) return
  isValidatingCode.value = true
  promoCodeError.value = ''
  promoCodeValidResult.value = null
  try {
    const result = await validateCode(promoCodeInput.value)
    if (result.valid) {
      promoCodeValidResult.value = result
      // auto-select เมื่อมีสินค้าเดียว
      if (result.products?.length === 1) selectedPromoProductUuid.value = result.products[0].uuid
    } else {
      promoCodeError.value = result.errorMessage || 'โค้ดไม่ถูกต้อง'
    }
  } finally {
    isValidatingCode.value = false
  }
}

async function handleApplyCode() {
  if (!promoCodeValidResult.value?.products || !selectedPromoProductUuid.value) return
  const { addFreeItem } = useCart()
  const batch = promoCodeValidResult.value.batch
  const product = promoCodeValidResult.value.products.find(p => p.uuid === selectedPromoProductUuid.value)
  if (!product) return

  const category = await db.categories.where('id').equals(product.categoryId).first()
  const productWithCat = { ...product, category: category! }

  await addFreeItem(productWithCat, 0, `โค้ด: ${promoCodeInput.value}`, batch?.quantity ?? 1)
  appliedPromoCode.value = promoCodeInput.value
  appliedPromoProductName.value = product.name

  closePromoCodeModal()
  toast.success(`เพิ่ม "${product.name}" ฟรีแล้ว 🎁`)
}

async function handleConfirmOrder(paymentMethod: PaymentMethod, amountReceived: number, cashDenominations?: Record<string, number>, shouldPrint: boolean = true) {
  if (isProcessing.value) return
  isProcessing.value = true
  
  try {
    // 1. ปิดการขาย บันทึกลงบิล (IndexedDB > Orders)
    // ใช้ paymentMethod ที่เลือกจาก Modal
    const staffId = authUser.currentUser?.id || 0
    const staffUuid = authUser.currentUser?.uuid || ''
    const staffName = authUser.currentUser?.displayName || 'Unknown'
    const order = await checkout(staffId, staffUuid, staffName, paymentMethod, amountReceived, cashDenominations)
    
    // 3. ปิด Modal และสั่งพิมพ์
    if (order) {
      isSummaryModalOpen.value = false
      posStore.setLastOrder(order)

      // redeem โค้ดโปรโมชันถ้ามีการใช้ในออร์เดอร์นี้
      if (appliedPromoCode.value) {
        await redeemCode(appliedPromoCode.value, order.uuid).catch(() => {})
        appliedPromoCode.value = null
        appliedPromoProductName.value = null
      }

      if (shouldPrint) {
        const success = await print(order)
        if (!success) {
          toast.error('ไม่สามารถพิมพ์ใบเสร็จได้ กรุณาตรวจสอบเครื่องพิมพ์ใน Settings')
        }
      }
    }
    
  } catch (error: any) {
    alert(`เกิดข้อผิดพลาด: ${error.message}`)
  } finally {
    isProcessing.value = false
  }
}
</script>
