<template>
  <div class="flex flex-col h-full bg-surface-900 text-surface-50">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-surface-800 flex items-center justify-between shrink-0 bg-surface-900/50">
      <h2 class="text-xl font-bold flex items-center gap-2">
        <span>ตะกร้าสินค้า</span>
        <span class="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">{{ totalItems }}</span>
      </h2>
      <div class="flex items-center gap-2">
        <button 
          v-if="cartItems.length > 0"
          @click="clearCart()"
          class="p-2 bg-surface-800 rounded-lg text-red-400 hover:text-red-300 transition-colors text-xs"
          title="ล้างตะกร้า"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- รายการสินค้าในตะกร้า -->
    <div class="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
      <div 
        v-if="cartItems.length === 0" 
        class="h-full flex flex-col items-center justify-center text-surface-500 gap-3"
      >
        <span class="text-4xl opacity-50">🛒</span>
        <p class="text-sm">ยังไม่มีสินค้าในตะกร้า</p>
      </div>

      <div 
        v-for="(item, idx) in cartItems" 
        :key="`${item.product.id}_${idx}`"
        class="bg-surface-800 p-3 rounded-xl border border-surface-700 flex flex-col gap-2 relative group"
      >
        <!-- ชื่อกับราคา -->
        <div class="flex justify-between items-start gap-2 pr-6">
          <div class="flex-1">
            <div class="font-medium text-sm leading-tight text-surface-100">{{ item.product.name }}</div>
            <!-- แสดง Add-ons ที่เลือก -->
            <div v-if="item.addons && item.addons.length > 0" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="addon in item.addons"
                :key="addon.id"
                class="text-[10px] bg-primary-900/50 text-primary-300 border border-primary-700/40 px-1.5 py-0.5 rounded-full"
              >
                {{ addon.name }}{{ addon.price > 0 ? ` +${addon.price}฿` : '' }}
              </span>
              <!-- ปุ่มแก้ไข/เพิ่ม Addon กรณีที่สินค้ามีตัวเลือก -->
              <button 
                v-if="item.product.addonGroups && item.product.addonGroups.length > 0"
                @click="editAddons(item)"
                class="text-[10px] text-surface-400 hover:text-primary-400 bg-surface-900 px-1.5 py-0.5 rounded-full border border-surface-700 transition-colors"
                title="ตั้งค่าตัวเลือกเสริม"
              >
                ✏️ ตั้งค่าตัวเลือก
              </button>
            </div>
            <!-- ปุ่มแก้ไข/เพิ่ม Addon กรณีที่ไม่มี addon ถูกเลือก แต่สินค้ามีตัวเลือก -->
            <button
               v-else-if="item.product.addonGroups && item.product.addonGroups.length > 0"
               @click="editAddons(item)"
               class="mt-1 text-[10px] text-primary-400 font-medium opacity-80 hover:opacity-100 flex items-center gap-1 transition-opacity"
            >
              <span class="w-4 h-4 bg-primary-500/20 rounded-full flex items-center justify-center">+</span>
              เพิ่มตัวเลือก
            </button>
          </div>
          <div class="font-bold text-primary-400 shrink-0">฿{{ item.totalPrice }}</div>
        </div>
        
        <!-- ตัวควบคุมจำนวน -->
        <div class="flex justify-between items-center mt-1">
          <div class="text-xs text-surface-500">
            ฿{{ item.unitPrice + item.addonsTotal }} / ชิ้น
          </div>
          
          <div class="flex items-center gap-3 bg-surface-900 rounded-lg p-1 border border-surface-700">
            <button 
              @click="updateQuantity(item.product.id!, item.quantity - 1)"
              class="w-8 h-8 flex items-center justify-center bg-surface-800 rounded-md text-surface-300 hover:text-white hover:bg-surface-700 active:scale-95 transition-all"
            >
              <span class="text-lg font-bold leading-none">-</span>
            </button>
            <span class="w-4 text-center font-bold text-sm">{{ item.quantity }}</span>
            <button 
              @click="updateQuantity(item.product.id!, item.quantity + 1)"
              class="w-8 h-8 flex items-center justify-center bg-surface-800 rounded-md text-surface-300 hover:text-white hover:bg-surface-700 active:scale-95 transition-all"
            >
              <span class="text-lg font-bold leading-none">+</span>
            </button>
          </div>
        </div>

        <!-- ปุ่มลบอันเดียว -->
        <button 
          @click="removeItem(item.product.id!)"
          class="absolute top-2 right-2 text-surface-500 hover:text-red-400 transition-colors"
        >
          <span class="text-lg font-bold leading-none">×</span>
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

      <!-- หมายเหตุ & Delivery Ref -->
      <div class="space-y-2 mb-4 pt-3 border-t border-surface-800/50">
        <input 
          v-model="note"
          type="text"
          placeholder="หมายเหตุ: เช่น ไม่เผ็ด, พิเศษมะม่วง..."
          class="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none transition-colors"
        />
        <input 
          v-model="deliveryRef" 
          type="text"
          placeholder="เลขอ้างอิง Delivery: GRAB-XXXX, LINEMAN-XXXX"
          class="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none transition-colors"
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
import { useCart } from '~/composables/useCart'
import { useAuthStore } from '~/stores/auth'
import type { CartItem } from '~/composables/useCart'
import type { Product, AddonOption } from '~/types'

const router = useRouter()
const authUser = useAuthStore()

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

import { usePosStore } from '~/stores/pos'
import PosOrderSummaryModal from './PosOrderSummaryModal.vue'
import PosAddonModal from './PosAddonModal.vue'
import type { PaymentMethod } from '~/types'

const posStore = usePosStore()

// สถานะและตัวแปรสำหรับแก้ไข Addons ในตะกร้า
const isAddonModalOpen = ref(false)
const editingProduct = ref<Product | null>(null)
const editingInitialAddons = ref<AddonOption[]>([])
const editingOldAddonKey = ref<string>('')

function editAddons(item: CartItem) {
  editingProduct.value = item.product
  editingInitialAddons.value = [...item.addons]
  editingOldAddonKey.value = getAddonKey(item)
  isAddonModalOpen.value = true
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

async function handleConfirmOrder(paymentMethod: PaymentMethod) {
  if (isProcessing.value) return
  isProcessing.value = true
  
  try {
    // 1. รับยอดเงินพอดี (ในอนาคตค่อยเพิ่มระบบทอนเงิน)
    const amountReceived = totalAmount.value
    
    // 2. ปิดการขาย บันทึกลงบิล (IndexedDB > Orders)
    // ใช้ paymentMethod ที่เลือกจาก Modal
    const staffId = authUser.currentUser?.id || 0
    const staffUuid = authUser.currentUser?.uuid || ''
    const staffName = authUser.currentUser?.displayName || 'Unknown'
    const order = await checkout(staffId, staffUuid, staffName, paymentMethod, amountReceived)
    
    // 3. ปิด Modal และสั่งพิมพ์
    if (order) {
      isSummaryModalOpen.value = false
      posStore.setLastOrder(order)
      
      setTimeout(() => {
        window.print()
      }, 300)
    }
    
  } catch (error: any) {
    alert(`เกิดข้อผิดพลาด: ${error.message}`)
  } finally {
    isProcessing.value = false
  }
}
</script>
