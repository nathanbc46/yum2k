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
        <div class="flex items-center justify-between">
          <div 
            class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black border transition-colors"
            :class="isOnline ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></span>
            {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
          </div>
          <div class="text-[10px] text-surface-500 font-bold uppercase tracking-widest">ทางลัดด่วน</div>
        </div>

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
    <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
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
        class="relative flex flex-col gap-2 transition-all p-3"
      >
        <!-- Background & Clickable Layer (หัวใจสำคัญของ Effect) -->
        <div 
          @click.stop="item.product.addonGroups?.length ? posStore.setSelectedCartItemIndex(posStore.selectedCartItemIndex === idx ? null : idx) : null"
          class="absolute inset-0 z-0 bg-surface-800 rounded-xl border transition-all"
          :class="[
            posStore.selectedCartItemIndex === idx 
              ? 'border-primary-500 ring-2 ring-primary-500/20 bg-surface-700' 
              : 'border-surface-700 hover:border-surface-600',
            item.product.addonGroups?.length ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'
          ]"
        />

        <div class="relative z-10 pointer-events-none flex flex-col gap-2">
          <!-- ชื่อกับราคา -->
          <div class="flex justify-between items-start gap-2 pr-12">
            <div class="flex-1">
              <div class="font-bold text-sm leading-tight text-surface-50">
                {{ item.product.name }}
              </div>
              <!-- แสดง Add-ons ที่เลือก -->
              <div v-if="item.addons && item.addons.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="addon in item.addons"
                  :key="addon.id"
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-bold border transition-colors bg-primary-900/40 text-primary-300 border-primary-700/30 [.light-mode_&]:bg-primary-100 [.light-mode_&]:text-primary-600 [.light-mode_&]:border-primary-300"
                >
                  {{ addon.name }}{{ addon.price > 0 ? ` +${addon.price}` : '' }}
                </span>
                <!-- ปุ่มแก้ไข (pointer-events-auto เพื่อให้กดได้) -->
                <button 
                  v-if="item.product.addonGroups && item.product.addonGroups.length > 0"
                  @click.stop="editAddons(item)"
                  class="text-[10px] bg-surface-900 text-surface-400 px-2 py-1 rounded-full border border-surface-700 transition-colors pointer-events-auto font-normal flex items-center gap-1 hover:border-primary-500/50 [.light-mode_&]:text-primary-600 [.light-mode_&]:bg-white [.light-mode_&]:border-primary-200"
                  title="ตั้งค่าตัวเลือกเสริม"
                >
                  <Pencil :size="10" />
                  <span>ตั้งค่า</span>
                </button>
              </div>
              <!-- ปุ่มกรณีที่ยังไม่ได้เลือก Addon -->
              <div v-else-if="item.product.addonGroups && item.product.addonGroups.length > 0" class="mt-1">
                <button
                  @click.stop="editAddons(item)"
                  class="text-[10px] font-bold px-2 py-1 rounded-full border transition-all flex items-center gap-1 pointer-events-auto font-normal bg-primary-500/10 text-primary-400 border-primary-500/20 [.light-mode_&]:bg-primary-100 [.light-mode_&]:text-primary-600 [.light-mode_&]:border-primary-300"
                >
                  <span>+</span> เพิ่มตัวเลือก
                </button>
              </div>
            </div>
            <div class="font-black shrink-0 text-base text-primary-400 [.light-mode_&]:text-primary-600">฿{{ item.totalPrice }}</div>
          </div>
          
          <!-- ตัวควบคุมจำนวน -->
          <div class="flex justify-between items-center mt-1">
            <div class="text-[10px] text-surface-500 font-medium">
              ฿{{ item.unitPrice + item.addonsTotal }} / ชิ้น
            </div>
            <div class="flex items-center gap-3 bg-surface-950 rounded-xl p-1 border border-surface-700 pointer-events-auto">
              <button 
                @click.stop="updateQuantity(item.product.id!, item.quantity - 1)"
                class="w-12 h-10 flex items-center justify-center bg-surface-800 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700 active:scale-90 transition-all shadow-sm"
                title="ลดจำนวน"
              >
                <Minus :size="16" stroke-width="3" />
              </button>
              <span class="w-8 text-center font-bold text-lg text-primary-400 [.light-mode_&]:text-primary-600">{{ item.quantity }}</span>
              <button 
                @click.stop="updateQuantity(item.product.id!, item.quantity + 1)"
                class="w-12 h-10 flex items-center justify-center bg-surface-800 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700 active:scale-90 transition-all shadow-sm"
                title="เพิ่มจำนวน"
              >
                <Plus :size="16" stroke-width="3" />
              </button>
            </div>
          </div>
        </div>

        <!-- ปุ่มลบ (pointer-events-auto) -->
        <button 
          @click.stop="handleRemoveItem(idx)"
          class="absolute top-1 right-1 z-20 w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500/40 hover:text-red-500 rounded-xl transition-all active:scale-90 border border-transparent pointer-events-auto [.light-mode_&]:bg-red-50 [.light-mode_&]:text-red-400 [.light-mode_&]:border-red-100"
          title="ลบรายการ"
        >
          <X :size="20" />
        </button>
      </div>
    </div>

    <!-- สรุปผล & Checkout -->
    <div class="p-4 border-t border-surface-800 bg-surface-900/80 shrink-0">
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
  </div>
</template>

<script setup lang="ts">
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
  Bell
} from 'lucide-vue-next'
import { liveQuery } from 'dexie'
import { db } from '~/db'
import { useCart } from '~/composables/useCart'
import { useAuthStore } from '~/stores/auth'
import type { CartItem } from '~/composables/useCart'
import type { Product, AddonOption, Order } from '~/types'
import { usePosStore } from '~/stores/pos'
import { usePrinter } from '~/composables/usePrinter'
import PosOrderSummaryModal from './PosOrderSummaryModal.vue'
import PosAddonModal from './PosAddonModal.vue'
import type { PaymentMethod } from '~/types'

const router = useRouter()
const authUser = useAuthStore()
const posStore = usePosStore()
const { printRawBT, printStandard } = usePrinter()

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
  note,
  deliveryRef
} = useCart()

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
  
  removeItem(item.product.id!, getAddonKey(item))
  
  // Reset selection ถ้าตัวที่โดนลบคึอตัวที่เลือกอยู่
  if (posStore.selectedCartItemIndex === idx) {
    posStore.setSelectedCartItemIndex(null)
  } else if (posStore.selectedCartItemIndex !== null && posStore.selectedCartItemIndex > idx) {
    // เลื่อน index ขึ้นถ้าลบตัวก่อนหน้า
    posStore.setSelectedCartItemIndex(posStore.selectedCartItemIndex - 1)
  }
}

async function handleConfirmAddons(selectedAddons: AddonOption[], addonsTotal: number) {
  if (!editingProduct.value) return
  await updateItemAddons(editingProduct.value.id!, editingOldAddonKey.value, selectedAddons, addonsTotal)
  isAddonModalOpen.value = false
}

const isProcessing = ref(false)
const isSummaryModalOpen = ref(false)

onMounted(() => {
  loadCart()
})

function openSummaryModal() {
  if (cartItems.value.length === 0) return
  isSummaryModalOpen.value = true
}

async function handleConfirmOrder(paymentMethod: PaymentMethod, amountReceived: number, cashDenominations?: Record<string, number>) {
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
      
      // พยายามพิมพ์ผ่าน RawBT (Silent Print)
      // ถ้าสำเร็จจะไม่มีหน้าต่างเด้งขึ้นมา
      const success = await printRawBT(order)
      
      // ถ้าพิมพ์ผ่าน RawBT ไม่สำเร็จ (เช่น ไม่ได้เปิดแอป) ให้ใช้ระบบพิมพ์มาตรฐานของ Browser
      if (!success) {
        setTimeout(() => {
          printStandard()
        }, 300)
      }
    }
    
  } catch (error: any) {
    alert(`เกิดข้อผิดพลาด: ${error.message}`)
  } finally {
    isProcessing.value = false
  }
}
</script>
