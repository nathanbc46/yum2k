<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div v-if="isOpen" class="bg-surface-900 border border-pink-500/30 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="flex items-center gap-3 px-6 py-4 border-b border-surface-800 shrink-0 bg-pink-900/20">
              <span class="text-3xl">🎂</span>
              <div class="flex-1">
                <h2 class="text-lg font-black text-pink-400">โปรโมชันวันเกิด</h2>
                <p class="text-xs text-surface-400">เลือกโปรโมชันและสินค้าที่ต้องการ</p>
              </div>
              <button @click="$emit('close')" class="text-surface-400 hover:text-surface-200 p-2 rounded-xl hover:bg-surface-800 transition-colors">
                <X :size="20" />
              </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto">
              <!-- Step 1: เลือกโปรโมชัน -->
              <div v-if="!selectedPromotion" class="p-4 space-y-3">
                <p class="text-sm text-surface-400 px-1">เลือกโปรโมชันวันเกิดที่ต้องการใช้</p>
                <div
                  v-for="promo in birthdayPromotions"
                  :key="promo.id"
                  class="rounded-2xl border-2 p-4 transition-all cursor-pointer"
                  :class="isPromoExhausted(promo)
                    ? 'border-surface-700 bg-surface-800/50 opacity-60 cursor-not-allowed'
                    : 'border-pink-500/30 bg-pink-900/10 hover:border-pink-400/50 hover:bg-pink-900/20 active:scale-[0.99]'"
                  @click="!isPromoExhausted(promo) && selectPromo(promo)"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-bold text-surface-100">{{ promo.name }}</div>
                      <div class="text-sm text-surface-400 mt-0.5">
                        แจกฟรี {{ (promo.config as BirthdayConfig).freeQty }} ชิ้น
                      </div>
                    </div>
                    <div class="text-right">
                      <div
                        class="text-xs font-bold px-2 py-1 rounded-full"
                        :class="isPromoExhausted(promo)
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-pink-500/20 text-pink-400'"
                      >
                        {{ isPromoExhausted(promo) ? 'แจกหมดแล้ว' : `เหลือ ${getRemaining(promo)} ชิ้น` }}
                      </div>
                      <div class="text-[10px] text-surface-500 mt-1">
                        ใช้ไป {{ (promo.config as BirthdayConfig).totalGiven || 0 }}/{{ (promo.config as BirthdayConfig).maxGiven }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 2: เลือกสินค้า -->
              <div v-else class="p-4">
                <div class="flex items-center gap-2 mb-4">
                  <button @click="selectedPromotion = null" class="text-pink-400 hover:text-pink-300 text-sm flex items-center gap-1 transition-colors">
                    ← กลับ
                  </button>
                  <span class="text-surface-500 text-sm">|</span>
                  <span class="text-sm font-semibold text-surface-300">{{ selectedPromotion.name }}</span>
                </div>

                <p class="text-sm text-surface-400 mb-3">
                  เลือกสินค้าที่ต้องการ {{ (selectedPromotion.config as BirthdayConfig).freeQty }} ชิ้น
                </p>

                <div v-if="eligibleProducts.length === 0" class="text-center text-surface-500 py-8">
                  ไม่มีสินค้าในโปรนี้
                </div>
                <div v-else class="grid grid-cols-2 gap-3">
                  <button
                    v-for="product in eligibleProducts"
                    :key="product.id"
                    @click="toggleProductSelect(product)"
                    type="button"
                    class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 text-center"
                    :class="isProductSelected(product.id!)
                      ? 'border-pink-500 bg-pink-600/20'
                      : 'border-surface-700 bg-surface-800 hover:border-pink-500/50 hover:bg-surface-700'"
                  >
                    <div class="w-16 h-16 rounded-xl bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center">
                      <img v-if="product.imageUrl" :src="product.imageUrl" class="w-full h-full object-cover" />
                      <span v-else class="text-3xl opacity-30">🍋</span>
                    </div>
                    <div class="text-sm font-semibold text-surface-100 leading-tight">{{ product.name }}</div>
                    <span class="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full font-bold">ฟรี!</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="selectedPromotion" class="flex items-center justify-between px-6 py-4 border-t border-surface-800 shrink-0">
              <button @click="$emit('close')" class="h-12 px-6 bg-surface-800 hover:bg-surface-700 text-surface-300 font-semibold rounded-xl transition-colors">
                ยกเลิก
              </button>
              <button
                @click="confirmSelection"
                :disabled="selectedProducts.length === 0"
                class="h-12 px-6 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-colors"
              >
                รับสินค้าฟรี {{ selectedProducts.length }}/{{ (selectedPromotion.config as BirthdayConfig).freeQty }} ชิ้น
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { db } from '~/db'
import type { Promotion, ProductWithCategory, BirthdayConfig } from '~/types'

const props = defineProps<{
  isOpen: boolean
  birthdayPromotions: Promotion[]
}>()

const emit = defineEmits<{
  close: []
  confirm: [items: Array<{ product: ProductWithCategory, qty: number, promotionId: number, promotionName: string }>]
}>()

const selectedPromotion = ref<Promotion | null>(null)
const eligibleProducts = ref<ProductWithCategory[]>([])
const selectedProducts = ref<ProductWithCategory[]>([])

function isPromoExhausted(promo: Promotion) {
  const c = promo.config as BirthdayConfig
  return (c.totalGiven || 0) >= c.maxGiven
}

function getRemaining(promo: Promotion) {
  const c = promo.config as BirthdayConfig
  return c.maxGiven - (c.totalGiven || 0)
}

async function selectPromo(promo: Promotion) {
  selectedPromotion.value = promo
  selectedProducts.value = []
  if (promo.eligibleProductIds.length === 0) {
    eligibleProducts.value = []
    return
  }
  const products = await db.products.where('id').anyOf(promo.eligibleProductIds).filter(p => !p.isDeleted && p.isActive).toArray()
  const catIds = [...new Set(products.map(p => p.categoryId))]
  const cats = await db.categories.where('id').anyOf(catIds).toArray()
  const catMap = new Map(cats.map(c => [c.id!, c]))
  eligibleProducts.value = products.map(p => ({ ...p, category: catMap.get(p.categoryId)! }))
}

function isProductSelected(id: number) {
  return selectedProducts.value.some(p => p.id === id)
}

function toggleProductSelect(product: ProductWithCategory) {
  if (isProductSelected(product.id!)) {
    selectedProducts.value = selectedProducts.value.filter(p => p.id !== product.id)
  } else {
    const freeQty = (selectedPromotion.value!.config as BirthdayConfig).freeQty
    if (selectedProducts.value.length < freeQty) {
      selectedProducts.value.push(product)
    }
  }
}

function confirmSelection() {
  if (!selectedPromotion.value || selectedProducts.value.length === 0) return
  emit('confirm', selectedProducts.value.map(product => ({
    product,
    qty: 1,
    promotionId: selectedPromotion.value!.id!,
    promotionName: selectedPromotion.value!.name,
  })))
  emit('close')
}

watch(() => props.isOpen, (open) => {
  if (!open) {
    selectedPromotion.value = null
    selectedProducts.value = []
    eligibleProducts.value = []
  }
})
</script>
