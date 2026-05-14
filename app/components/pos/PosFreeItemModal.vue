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
          <div
            v-if="isOpen"
            class="bg-surface-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            :class="infoOnly ? 'border border-amber-500/30' : 'border border-green-500/30'"
          >
            <!-- Header -->
            <div
              class="flex items-center gap-3 px-6 py-4 border-b border-surface-800 shrink-0"
              :class="infoOnly ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-green-100 dark:bg-green-900/20'"
            >
              <span class="text-3xl">{{ infoOnly ? '🛒' : '🎁' }}</span>
              <div class="flex-1">
                <h2 class="text-lg font-black" :class="infoOnly ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'">
                  {{ infoOnly ? 'สินค้าที่เข้าร่วมโปร' : 'เลือกของแถมฟรี!' }}
                </h2>
                <p class="text-xs text-surface-600 dark:text-surface-400">
                  <template v-if="infoOnly">{{ promotion?.name }} — เพิ่มสินค้าเหล่านี้ให้ครบ {{ buyQtyForInfo }} ชิ้น เพื่อรับของแถมฟรี {{ freeQty }} ชิ้น</template>
                  <template v-else>{{ promotion?.name }} — เลือกสินค้าที่ต้องการ {{ freeQty }} ชิ้น</template>
                </p>
              </div>
            </div>

            <!-- Product Grid -->
            <div class="flex-1 overflow-y-auto p-4">
              <div v-if="eligibleProducts.length === 0" class="text-center text-surface-500 py-8">
                ไม่มีสินค้าในโปรนี้
              </div>
              <div v-else class="grid grid-cols-2 gap-3">
                <!-- Info mode: แสดงอย่างเดียว ไม่เลือก -->
                <template v-if="infoOnly">
                  <div
                    v-for="product in eligibleProducts"
                    :key="product.id"
                    class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-surface-700 bg-surface-800 text-center"
                  >
                    <div class="w-16 h-16 rounded-xl bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center">
                      <img v-if="product.imageUrl" :src="product.imageUrl" class="w-full h-full object-cover" />
                      <span v-else class="text-3xl opacity-30">🍋</span>
                    </div>
                    <div class="text-sm font-semibold text-surface-100 leading-tight">{{ product.name }}</div>
                    <span class="text-xs bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">ร่วมโปร</span>
                  </div>
                </template>

                <!-- Select mode: เลือกของแถม -->
                <template v-else>
                  <button
                    v-for="product in eligibleProducts"
                    :key="product.id"
                    @click="selectProduct(product)"
                    type="button"
                    class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 text-center"
                    :class="isSelected(product.id!)
                      ? 'border-green-400 dark:border-green-500 bg-green-100 dark:bg-green-600/20'
                      : 'border-surface-700 bg-surface-800 hover:border-green-400/50 dark:hover:border-green-500/50 hover:bg-surface-700'"
                  >
                    <div class="w-16 h-16 rounded-xl bg-surface-700 border border-surface-600 overflow-hidden flex items-center justify-center">
                      <img v-if="product.imageUrl" :src="product.imageUrl" class="w-full h-full object-cover" />
                      <span v-else class="text-3xl opacity-30">🍋</span>
                    </div>
                    <div class="text-sm font-semibold text-surface-100 leading-tight">{{ product.name }}</div>
                    <span class="text-xs bg-green-200 dark:bg-green-500/20 text-green-800 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">ฟรี!</span>
                  </button>
                </template>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center px-6 py-4 border-t border-surface-800 shrink-0" :class="infoOnly ? 'justify-end' : 'justify-between'">
              <button @click="$emit('close')" class="h-12 px-6 bg-surface-800 hover:bg-surface-700 text-surface-300 font-semibold rounded-xl transition-colors">
                {{ infoOnly ? 'ปิด' : 'ยกเลิก' }}
              </button>
              <button
                v-if="!infoOnly"
                @click="confirmSelection"
                :disabled="selectedItems.length === 0"
                class="h-12 px-6 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-colors flex items-center gap-2"
              >
                <span>รับของแถม {{ selectedItems.length }}/{{ freeQty }} ชิ้น</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Promotion, ProductWithCategory } from '~/types'

const props = defineProps<{
  isOpen: boolean
  promotion: Promotion | null
  eligibleProducts: ProductWithCategory[]
  freeQty: number
  infoOnly?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [items: Array<{ product: ProductWithCategory, qty: number, promotionId: number, promotionName: string }>]
}>()

const selectedItems = ref<ProductWithCategory[]>([])

const buyQtyForInfo = computed(() => (props.promotion?.config as any)?.buyQty ?? 0)

function isSelected(id: number) {
  return selectedItems.value.some(p => p.id === id)
}

function selectProduct(product: ProductWithCategory) {
  if (isSelected(product.id!)) {
    selectedItems.value = selectedItems.value.filter(p => p.id !== product.id)
  } else if (selectedItems.value.length < props.freeQty) {
    selectedItems.value.push(product)
  }
}

function confirmSelection() {
  if (!props.promotion || selectedItems.value.length === 0) return
  emit('confirm', selectedItems.value.map(product => ({
    product,
    qty: 1,
    promotionId: props.promotion!.id!,
    promotionName: props.promotion!.name,
  })))
  emit('close')
}

watch(() => props.isOpen, (open) => {
  if (!open) selectedItems.value = []
})
</script>
