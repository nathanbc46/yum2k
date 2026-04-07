<template>
  <button 
    class="flex flex-col bg-surface-800 rounded-2xl overflow-hidden border border-surface-700 hover:border-primary-500 hover:ring-2 hover:ring-primary-500/50 transition-all text-left shadow-sm active:scale-95 group relative"
    @click="$emit('add', product)"
  >
    <!-- รูปภาพสินค้า -->
    <div class="h-32 w-full bg-surface-900 relative overflow-hidden">
      <!-- ถ้าไม่มีรูป ให้โชว์กล่องสีดำเทา มีไอคอน หรือตัวหนังสือ -->
      <img 
        v-if="product.imageUrl" 
        :src="product.imageUrl" 
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-surface-800 text-surface-500">
        <span class="text-3xl opacity-20">🍋</span>
      </div>

      <!-- Badge สินค้าโปร / สต็อกหมด / เตือนใกล้หมด -->
      <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
        <span 
          v-if="product.mappingType === 'promotion' || product.mappingType === 'bundle'"
          class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-orange-500 text-white shadow-sm"
        >
          {{ product.mappingType === 'promotion' ? 'Promo' : 'Set' }}
        </span>
        
        <span 
          v-if="product.trackInventory && product.stockQuantity <= 0"
          class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white shadow-sm"
        >
          หมด
        </span>
        <span 
          v-else-if="product.trackInventory && product.stockQuantity <= (product.alertThreshold ?? 10)"
          class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500 text-black shadow-sm"
        >
          เหลือ {{ product.stockQuantity }}
        </span>
      </div>
    </div>

    <!-- รายละเอียดสินค้า -->
    <div class="p-3 flex flex-col flex-1 justify-between w-full">
      <h3 class="font-medium text-surface-50 text-sm line-clamp-2 mb-2 leading-snug">
        {{ product.name }}
      </h3>
      
      <div class="flex items-end justify-between mt-auto">
        <span class="font-bold text-primary-400 text-lg">฿{{ product.salePrice }}</span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { ProductWithCategory } from '~/types'

defineProps<{
  product: ProductWithCategory
}>()

defineEmits<{
  (e: 'add', item: ProductWithCategory): void
}>()
</script>
