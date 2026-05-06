<template>
  <button
    class="flex flex-col bg-surface-800 rounded-2xl overflow-hidden border border-surface-700 hover:border-primary-500 hover:ring-2 hover:ring-primary-500/50 transition-all text-left shadow-sm active:scale-95 group relative"
    @click="$emit('add', product)"
  >
    <!-- รูปภาพสินค้า (ลดความสูง 30%) -->
    <div class="h-[90px] w-full bg-surface-900 relative overflow-hidden">
      <img
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-surface-800 text-surface-500">
        <span class="text-2xl opacity-20">🍋</span>
      </div>

      <!-- Badge สินค้าโปร / สต็อกหมด / เตือนใกล้หมด -->
      <div class="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
        <span
          v-if="product.mappingType === 'promotion' || product.mappingType === 'bundle'"
          class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full bg-orange-500 text-white shadow-sm"
        >
          {{ product.mappingType === 'promotion' ? 'Promo' : 'Set' }}
        </span>
        <span
          v-if="product.trackInventory && product.stockQuantity <= 0"
          class="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-500 text-white shadow-sm"
        >
          หมด
        </span>
        <span
          v-else-if="product.trackInventory && product.stockQuantity <= (product.alertThreshold ?? 10)"
          class="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-yellow-500 text-black shadow-sm"
        >
          เหลือ {{ product.stockQuantity }}
        </span>
      </div>
    </div>

    <!-- รายละเอียดสินค้า -->
    <div class="p-2 flex flex-col flex-1 justify-between w-full">
      <h3 class="font-semibold text-surface-50 text-sm line-clamp-2 mb-1.5 leading-snug">
        {{ product.name }}
      </h3>

      <div class="flex items-end justify-between mt-auto">
        <span
          class="font-black text-sm px-2 py-0.5 rounded-lg"
          :style="{
            color: catColor || '#818cf8',
            backgroundColor: rgba(catColor || '#6366f1', 0.15),
          }"
        >
          ฿{{ product.salePrice.toLocaleString() }}
        </span>

        <!-- Favorite Button — มุมขวาล่าง ห่างจากพื้นที่กดหลัก -->
        <button
          @click.stop="toggleFavorite(props.product.id!)"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90"
          :class="isFavorite(props.product.id!)
            ? 'text-red-500'
            : 'text-surface-600 hover:text-surface-400'"
        >
          <Heart :size="14" :fill="isFavorite(props.product.id!) ? 'currentColor' : 'none'" />
        </button>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { ProductWithCategory } from '~/types'
import { Heart } from 'lucide-vue-next'
import { useFavorites } from '~/composables/useFavorites'

const props = defineProps<{ product: ProductWithCategory }>()
defineEmits<{ (e: 'add', item: ProductWithCategory): void }>()

const { isFavorite, toggleFavorite } = useFavorites()
const catColor = computed(() => props.product.category?.color || null)

function rgba(hex: string | null | undefined, alpha: number): string {
  if (!hex) return `rgba(99,102,241,${alpha})`
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
</script>
