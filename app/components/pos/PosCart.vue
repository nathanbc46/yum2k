<template>
  <div class="flex flex-col h-full bg-surface-900 text-surface-50 relative">
    <!-- Header -->
    <div class="px-4 py-4 border-b border-surface-800 flex items-center justify-between shrink-0 bg-surface-900/50">
      <div class="flex items-center gap-3">
        <!-- Back Button for Mobile -->
        <button 
          @click="$emit('close-mobile')"
          class="md:hidden w-10 h-10 flex items-center justify-center bg-surface-800 rounded-xl text-surface-400 active:scale-95 transition-all"
        >
          ⬅️
        </button>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <span>ตะกร้าสินค้า</span>
          <span class="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">{{ totalItems }}</span>
          
          <!-- สถานะออนไลน์/ออฟไลน์ -->
          <span 
            class="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border"
            :class="isOnline ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></span>
            {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
          </span>
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <button 
          v-if="cartItems.length > 0"
          @click="clearCart()"
          class="w-10 h-10 flex items-center justify-center bg-surface-800 rounded-lg text-red-400 hover:text-red-300 transition-colors"
          title="ล้างตะกร้า"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- รายการสินค้าในตะกร้า -->
    <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
      <div 
        v-if="cartItems.length === 0" 
        class="h-full flex flex-col items-center justify-center text-surface-500 gap-4"
      >
        <div class="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center text-5xl opacity-50">🛒</div>
        <p class="text-base">ยังไม่มีสินค้าในตะกร้า</p>
      </div>

      <div 
        v-for="(item, idx) in cartItems" 
        :key="`${item.product.id}_${idx}`"
        class="bg-surface-800 p-3 rounded-xl border border-surface-700 flex flex-col gap-2 relative group"
      >
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
                class="text-[10px] bg-primary-900/40 text-primary-300 border border-primary-700/30 px-1.5 py-0.5 rounded-full"
              >
                {{ addon.name }}{{ addon.price > 0 ? ` +${addon.price}` : '' }}
              </span>
              <!-- ปุ่มแก้ไข/เพิ่ม Addon กรณีที่สินค้ามีตัวเลือก -->
              <button 
                v-if="item.product.addonGroups && item.product.addonGroups.length > 0"
                @click="editAddons(item)"
                class="text-[10px] text-surface-400 hover:text-primary-400 bg-surface-900 px-1.5 py-0.5 rounded-full border border-surface-700 transition-colors"
                title="ตั้งค่าตัวเลือกเสริม"
              >
                ✏️ ตั้งค่า
              </button>
            </div>
            <!-- ปุ่มกรณีที่ยังไม่ได้เลือก Addon แต่สินค้ามีตัวเลือกให้เลือกได้ -->
            <div v-else-if="item.product.addonGroups && item.product.addonGroups.length > 0" class="mt-1">
              <button
                @click="editAddons(item)"
                class="text-[10px] text-primary-400 font-bold bg-primary-500/10 px-2 py-1 rounded-full border border-primary-500/20 hover:bg-primary-500/20 transition-all flex items-center gap-1"
              >
                <span>+</span> เพิ่มตัวเลือก
              </button>
            </div>
          </div>
          <div class="font-black text-primary-400 shrink-0 text-base">฿{{ item.totalPrice }}</div>
        </div>
        
        <!-- ตัวควบคุมจำนวน -->
        <div class="flex justify-between items-center mt-1">
          <div class="text-[10px] text-surface-500 font-medium">
            ฿{{ item.unitPrice + item.addonsTotal }} / ชิ้น
          </div>
          <div class="flex items-center gap-3 bg-surface-950 rounded-xl p-1 border border-surface-700">
            <button 
              @click="updateQuantity(item.product.id!, item.quantity - 1)"
              class="w-12 h-10 flex items-center justify-center bg-surface-800 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700 active:scale-90 transition-all shadow-sm"
              title="ลดจำนวน"
            >
              <span class="text-xl font-bold leading-none">-</span>
            </button>
            <span class="w-8 text-center font-bold text-lg text-primary-400">{{ item.quantity }}</span>
            <button 
              @click="updateQuantity(item.product.id!, item.quantity + 1)"
              class="w-12 h-10 flex items-center justify-center bg-surface-800 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700 active:scale-90 transition-all shadow-sm"
              title="เพิ่มจำนวน"
            >
              <span class="text-xl font-bold leading-none">+</span>
            </button>
          </div>
        </div>

        <!-- ปุ่มลบอันเดียว (ปรับให้เล็กลงนิดนึง และห่างจากราคา) -->
        <button 
          @click="removeItem(item.product.id!)"
          class="absolute top-1 right-1 w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500/50 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all active:scale-90 border border-transparent"
          title="ลบรายการ"
        >
          <span class="text-2xl font-light leading-none">×</span>
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

const { isOnline } = useSync()

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
