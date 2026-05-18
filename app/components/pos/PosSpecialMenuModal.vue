<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('cancel')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <!-- Modal -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          leave-active-class="transition-all duration-150 ease-in"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          leave-to-class="opacity-0 scale-95 translate-y-2"
        >
          <div
            v-if="isOpen"
            class="relative w-full max-w-sm bg-surface-900 border border-surface-700 rounded-3xl shadow-2xl overflow-hidden"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
                  ✨
                </div>
                <div>
                  <h2 class="text-lg font-black text-surface-50">สเปเชียลเมนู</h2>
                  <p class="text-xs text-surface-500">กำหนดชื่อและราคาเอง</p>
                </div>
              </div>
              <button
                @click="$emit('cancel')"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-all active:scale-95"
              >
                <X :size="18" />
              </button>
            </div>

            <!-- Form -->
            <div class="px-6 py-5 space-y-4">
              <!-- ชื่อสินค้า -->
              <div>
                <label class="block text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                  ชื่อสินค้า / รายการ
                </label>
                <input
                  ref="nameInputRef"
                  v-model="customName"
                  type="text"
                  placeholder="เช่น ยำพิเศษ, เพิ่มเส้น, ค่าส่ง..."
                  maxlength="80"
                  class="w-full px-4 py-3 bg-surface-800 border border-surface-700 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-surface-100 placeholder-surface-600 text-sm font-medium transition-all outline-none"
                  @keydown.enter="focusPriceInput"
                />
              </div>

              <!-- ราคา -->
              <div>
                <label class="block text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                  ราคา (บาท)
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 font-bold text-sm">฿</span>
                  <input
                    ref="priceInputRef"
                    v-model="customPriceStr"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="w-full pl-8 pr-4 py-3 bg-surface-800 border border-surface-700 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-surface-100 placeholder-surface-600 text-sm font-bold transition-all outline-none"
                    @keydown.enter="handleConfirm"
                  />
                </div>
              </div>

              <!-- ปุ่มราคาด่วน -->
              <div>
                <label class="block text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                  ราคาด่วน
                </label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="price in quickPrices"
                    :key="price"
                    @click="customPriceStr = String(price)"
                    class="h-11 rounded-xl text-sm font-bold transition-all active:scale-95"
                    :class="[
                      Number(customPriceStr) === price
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-surface-800 hover:bg-surface-700 text-surface-300 border border-surface-700 hover:border-amber-500/40'
                    ]"
                  >
                    {{ price }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Error -->
            <div v-if="errorMsg" class="mx-6 mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p class="text-sm text-red-400 font-medium">{{ errorMsg }}</p>
            </div>

            <!-- Actions -->
            <div class="px-6 pb-6 flex gap-3">
              <button
                @click="$emit('cancel')"
                class="flex-1 h-12 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-300 font-bold text-sm transition-all active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                @click="handleConfirm"
                :disabled="!isValid"
                class="flex-[2] h-12 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                :class="isValid ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/30' : 'bg-surface-800 text-surface-500'"
              >
                <ShoppingCart :size="18" />
                เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X, ShoppingCart } from 'lucide-vue-next'
import { v4 as uuidv4 } from 'uuid'
import type { ProductWithCategory } from '~/types'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{
  cancel: []
  confirm: [product: ProductWithCategory]
}>()

const nameInputRef = ref<HTMLInputElement | null>(null)
const priceInputRef = ref<HTMLInputElement | null>(null)

const customName = ref('')
const customPriceStr = ref('')
const errorMsg = ref('')

const quickPrices = [10, 20, 30, 50, 60, 80, 100, 120]

const isValid = computed(() => {
  const price = Number(customPriceStr.value)
  return customName.value.trim().length > 0 && price > 0 && Number.isFinite(price)
})

function focusPriceInput() {
  priceInputRef.value?.focus()
  priceInputRef.value?.select()
}

function resetForm() {
  customName.value = ''
  customPriceStr.value = ''
  errorMsg.value = ''
}

function handleConfirm() {
  errorMsg.value = ''
  const name = customName.value.trim()
  const price = Number(customPriceStr.value)

  if (!name) {
    errorMsg.value = 'กรุณาระบุชื่อสินค้า'
    nameInputRef.value?.focus()
    return
  }
  if (!price || price <= 0) {
    errorMsg.value = 'กรุณาระบุราคาที่ถูกต้อง'
    priceInputRef.value?.focus()
    return
  }

  const specialProduct: ProductWithCategory = {
    uuid: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    categoryId: 0,
    name,
    salePrice: price,
    costPrice: 0,
    stockQuantity: 9999,
    alertThreshold: 0,
    trackInventory: false,
    isActive: true,
    sortOrder: 0,
    totalSold: 0,
    isSpecialMenu: true,
    category: {
      uuid: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      name: 'สเปเชียล',
      color: '#f59e0b',
      sortOrder: 0,
      isActive: true,
    },
  }

  emit('confirm', specialProduct)
  resetForm()
}

// โฟกัสช่องชื่อเมื่อ Modal เปิด
watch(() => props.isOpen, (val) => {
  if (val) {
    resetForm()
    nextTick(() => nameInputRef.value?.focus())
  }
})
</script>
