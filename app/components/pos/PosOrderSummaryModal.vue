<script setup lang="ts">
import type { PaymentMethod } from '~/types'
import type { CartItem } from '~/composables/useCart'

const props = defineProps<{
  isOpen: boolean
  items: CartItem[]
  subtotal: number
  discount: number
  totalAmount: number
  note: string
  deliveryRef: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', paymentMethod: PaymentMethod, amountReceived: number): void
}>()

const selectedPayment = ref<PaymentMethod>('cash')
const amountReceived = ref<number>(0)
const cashHistory = ref<number[]>([]) // เก็บประวัติการกดเพื่อ Undo

const changeAmount = computed(() => {
  return Math.max(0, amountReceived.value - props.totalAmount)
})

const isAmountEnough = computed(() => {
  if (selectedPayment.value === 'unpaid' || selectedPayment.value === 'promptpay') return true
  return amountReceived.value >= props.totalAmount
})

const addCash = (value: number) => {
  amountReceived.value += value
  cashHistory.value.push(value)
}

const undoCash = () => {
  const lastValue = cashHistory.value.pop()
  if (lastValue !== undefined) {
    amountReceived.value = Math.max(0, amountReceived.value - lastValue)
  }
}

const clearCash = () => {
  amountReceived.value = 0
  cashHistory.value = []
}

const setExactAmount = () => {
  amountReceived.value = props.totalAmount
  cashHistory.value = [] // ล้างประวัติเพื่อไม่ให้ undo กลับไปมั่ว
}

const confirmSale = () => {
  // สำหรับ PromptPay หรือ Unpaid ให้ใช้ยอดพอดี (เพื่อความสมบูรณ์ของข้อมูล)
  const finalAmount = selectedPayment.value === 'cash' ? amountReceived.value : props.totalAmount
  emit('confirm', selectedPayment.value, finalAmount)
}

// เมื่อเปลี่ยนวิธีการชำระเงิน ให้รีเซ็ตค่าถ้าเป็น Cash
watch(selectedPayment, (newVal) => {
  if (newVal === 'cash') {
    amountReceived.value = 0
    cashHistory.value = []
  }
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="bg-surface-900 border border-surface-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-surface-800 bg-surface-950/50 flex justify-between items-center shrink-0">
          <h3 class="text-xl font-bold flex items-center gap-2 text-surface-50">
            <span>📝</span>
            <span>สรุปคำสั่งซื้อ</span>
          </h3>
          <button @click="emit('close')" class="text-surface-500 hover:text-surface-50 transition-colors text-2xl font-bold">&times;</button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          <!-- Items List -->
          <div class="space-y-3">
            <h4 class="text-xs uppercase tracking-widest text-surface-500 font-bold">รายการสินค้า</h4>
            <div class="bg-surface-950/50 rounded-2xl border border-surface-800 p-4 space-y-3">
              <div v-for="item in items" :key="item.product.id" class="flex justify-between items-start text-sm">
                <div class="flex-1 pr-4">
                  <div class="text-surface-100 font-medium leading-tight">{{ item.product.name }}</div>
                  
                  <!-- แสดง Add-ons ที่เลือก -->
                  <div v-if="item.addons && item.addons.length > 0" class="flex flex-wrap gap-1 mt-1.5 mb-1">
                    <span
                      v-for="addon in item.addons"
                      :key="addon.id"
                      class="text-[10px] bg-surface-800 text-surface-400 px-1.5 py-0.5 rounded-md"
                    >
                      {{ addon.name }}{{ addon.price > 0 ? ` +${addon.price}฿` : '' }}
                    </span>
                  </div>

                  <div class="text-xs text-surface-500 mt-1">฿{{ item.unitPrice + item.addonsTotal }} x {{ item.quantity }}</div>
                </div>
                <div class="font-bold text-surface-100 text-right">฿{{ item.totalPrice.toLocaleString() }}</div>
              </div>
            </div>
          </div>

          <!-- Note & Delivery Ref -->
          <div v-if="note || deliveryRef" class="grid grid-cols-2 gap-4">
            <div v-if="note">
              <h4 class="text-xs uppercase tracking-widest text-surface-500 font-bold mb-2">หมายเหตุ</h4>
              <p class="text-sm bg-surface-800/50 p-2 rounded-lg border border-surface-700 italic text-surface-300">"{{ note }}"</p>
            </div>
            <div v-if="deliveryRef">
              <h4 class="text-xs uppercase tracking-widest text-surface-500 font-bold mb-2">Delivery Ref</h4>
              <p class="text-sm bg-orange-500/10 p-2 rounded-lg border border-orange-500/20 text-orange-400 font-bold">{{ deliveryRef }}</p>
            </div>
          </div>

          <!-- Total Summary -->
          <div class="border-t border-dashed border-surface-700 pt-4 space-y-2">
            <div class="flex justify-between text-sm text-surface-400">
              <span>ยอดสั่งซื้อ</span>
              <span>฿{{ subtotal.toLocaleString() }}</span>
            </div>
            <div v-if="discount > 0" class="flex justify-between text-sm text-success">
              <span>ส่วนลด</span>
              <span>-฿{{ discount.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-2xl font-black text-surface-50 pt-2">
              <span>ยอดสุทธิ</span>
              <span class="text-primary-400">฿{{ totalAmount.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Cash Payment Details (แสดงเมื่อเลือกเงินสด) -->
          <Transition name="fade">
            <div v-if="selectedPayment === 'cash'" class="p-4 bg-surface-950/40 rounded-3xl border border-surface-800 space-y-4">
              <div class="flex justify-between items-end">
                <h4 class="text-xs uppercase tracking-widest text-surface-500 font-bold">รับเงินสด</h4>
                <div class="flex gap-2">
                  <button @click="clearCash" class="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">ล้าง</button>
                  <button @click="undoCash" class="text-[10px] px-2 py-1 bg-surface-800 text-surface-400 border border-surface-700 rounded-lg hover:bg-surface-700 transition-colors">ย้อนกลับ (⌫)</button>
                </div>
              </div>

              <!-- Input & Change Display -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <span class="text-[10px] text-surface-500">จำนวนเงินที่รับ</span>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 font-bold">฿</span>
                    <input 
                      v-model.number="amountReceived"
                      type="number"
                      ref="cashInput"
                      class="w-full bg-surface-900 border-2 border-surface-700 rounded-2xl py-3 pl-8 pr-4 text-2xl font-black text-primary-400 focus:border-primary-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div class="space-y-1">
                  <span class="text-[10px] text-surface-500">เงินทอน</span>
                  <div class="bg-surface-900 border-2 border-dashed border-surface-700 rounded-2xl py-3 px-4 flex items-center justify-between">
                    <span class="text-surface-500 font-bold">฿</span>
                    <span class="text-2xl font-black" :class="changeAmount > 0 ? 'text-orange-400' : 'text-surface-600'">
                      {{ changeAmount.toLocaleString() }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Denominations Grid -->
              <div class="grid grid-cols-5 gap-2">
                <button 
                  v-for="val in [1, 2, 5, 10, 20, 50, 100, 500, 1000]" 
                  :key="val"
                  @click="addCash(val)"
                  class="py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 font-bold text-sm hover:bg-surface-700 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5"
                >
                  <span class="text-[10px] text-surface-500">{{ val < 20 ? 'เหรียญ' : 'ธนบัตร' }}</span>
                  <span>{{ val.toLocaleString() }}</span>
                </button>
                <button 
                  @click="setExactAmount"
                  class="py-3 rounded-xl bg-primary-600/20 border border-primary-500/30 text-primary-400 font-bold text-sm hover:bg-primary-600/30 active:scale-95 transition-all flex items-center justify-center"
                >
                  จ่ายพอดี
                </button>
              </div>

              <!-- Warning if not enough -->
              <div v-if="amountReceived > 0 && amountReceived < totalAmount" class="text-center py-1">
                <span class="text-[10px] text-red-400 font-bold animate-pulse italic">⚠️ ยอดเงินรับไม่เพียงพอ ขาดอีก ฿{{ (totalAmount - amountReceived).toLocaleString() }}</span>
              </div>
            </div>
          </Transition>

          <!-- Payment Selection -->
          <div class="space-y-3 pt-4">
            <h4 class="text-xs uppercase tracking-widest text-surface-500 font-bold">ช่องทางการชำระเงิน</h4>
            <div class="grid grid-cols-3 gap-3">
              <button 
                @click="selectedPayment = 'cash'"
                class="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group"
                :class="selectedPayment === 'cash' ? 'bg-primary-600/10 border-primary-500 shadow-lg shadow-primary-900/20' : 'bg-surface-800 border-surface-700 hover:border-surface-600 grayscale opacity-80'"
              >
                <span class="text-2xl group-active:scale-90 transition-transform">💵</span>
                <span class="text-xs font-bold" :class="selectedPayment === 'cash' ? 'text-primary-400' : 'text-surface-400'">เงินสด</span>
              </button>
              <button 
                @click="selectedPayment = 'promptpay'"
                class="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group"
                :class="selectedPayment === 'promptpay' ? 'bg-secondary-500/10 border-secondary-500 shadow-lg shadow-secondary-900/10' : 'bg-surface-800 border-surface-700 hover:border-surface-600 grayscale opacity-80'"
              >
                <span class="text-2xl group-active:scale-90 transition-transform">📱</span>
                <span class="text-xs font-bold" :class="selectedPayment === 'promptpay' ? 'text-secondary-400' : 'text-surface-400'">พร้อมเพย์</span>
              </button>
              <button 
                @click="selectedPayment = 'unpaid'"
                class="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group"
                :class="selectedPayment === 'unpaid' ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/20' : 'bg-surface-800 border-surface-700 hover:border-surface-600 grayscale opacity-80'"
              >
                <span class="text-2xl group-active:scale-90 transition-transform">⏳</span>
                <span class="text-xs font-bold" :class="selectedPayment === 'unpaid' ? 'text-blue-400' : 'text-surface-400'">ยังไม่ชำระ</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Buttons -->
        <div class="px-6 py-6 border-t border-surface-800 flex gap-4 shrink-0 bg-surface-950/30">
          <button 
            @click="emit('close')"
            class="flex-1 btn-touch bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-2xl transition-all"
          >
            กลับไปแก้ไข
          </button>
          <button 
            @click="confirmSale"
            :disabled="!isAmountEnough"
            class="flex-[2] btn-touch text-white font-bold text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
            :class="isAmountEnough ? 'bg-primary-600 hover:bg-primary-500 shadow-primary-900/30' : 'bg-surface-800 text-surface-500'"
          >
            <span>ยืนยันและปริ้น</span>
            <span class="text-xl">🖨️</span>
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
