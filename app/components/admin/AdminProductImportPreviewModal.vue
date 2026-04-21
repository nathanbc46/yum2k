<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-5xl max-h-[90vh] bg-surface-900 border border-surface-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
      
      <!-- Header -->
      <header class="px-8 py-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/50">
        <div>
          <h2 class="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <span>📋 ตรวจสอบข้อมูลก่อนนำเข้า</span>
            <span class="text-sm font-normal text-surface-400 bg-surface-800 px-3 py-1 rounded-full uppercase tracking-wider">PREVIEW</span>
          </h2>
          <p class="text-sm text-surface-500 mt-1">กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยันการบันทึกลงฐานข้อมูล</p>
        </div>
        <button @click="$emit('close')" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-800 text-surface-400 transition-all">✕</button>
      </header>

      <!-- Stats Area -->
      <div class="px-8 py-4 bg-surface-950/30 flex items-center gap-6 border-b border-surface-800">
        <div class="flex flex-col">
          <span class="text-[10px] text-surface-500 uppercase font-bold tracking-widest">ทั้งหมด</span>
          <span class="text-xl font-bold text-surface-50">{{ items.length }} รายการ</span>
        </div>
        <div class="w-px h-8 bg-surface-800"></div>
        <div class="flex flex-col">
          <span class="text-[10px] text-success uppercase font-bold tracking-widest">เพิ่มใหม่</span>
          <span class="text-xl font-bold text-success">{{ stats.new }}</span>
        </div>
        <div class="w-px h-8 bg-surface-800"></div>
        <div class="flex flex-col">
          <span class="text-[10px] text-blue-400 uppercase font-bold tracking-widest">อัปเดต</span>
          <span class="text-xl font-bold text-blue-400">{{ stats.update }}</span>
        </div>
        <div v-if="stats.invalid > 0" class="w-px h-8 bg-surface-800"></div>
        <div v-if="stats.invalid > 0" class="flex flex-col">
          <span class="text-[10px] text-red-400 uppercase font-bold tracking-widest">ไม่ถูกต้อง</span>
          <span class="text-xl font-bold text-red-400">{{ stats.invalid }}</span>
        </div>
      </div>

      <!-- Table Area -->
      <div class="flex-1 overflow-auto p-4">
        <table class="w-full text-left text-sm border-separate border-spacing-y-2">
          <thead>
            <tr class="text-surface-500 text-[11px] uppercase tracking-widest">
              <th class="px-4 py-2">สถานะ</th>
              <th class="px-4 py-2">ชื่อสินค้า</th>
              <th class="px-4 py-2">SKU</th>
              <th class="px-4 py-2">หมวดหมู่</th>
              <th class="px-4 py-2 text-right">ราคาขาย</th>
              <th class="px-4 py-2 text-center">สต็อก</th>
              <th class="px-4 py-2 text-center">การตั้งค่าพิเศษ</th>
              <th class="px-4 py-2">ข้อมูลเพิ่มเติม</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(item, idx) in items" 
              :key="idx"
              class="bg-surface-800/40 border border-surface-700/50 rounded-xl hover:bg-surface-800/70 transition-all group"
            >
              <!-- Status Badge -->
              <td class="px-4 py-3 first:rounded-l-2xl">
                <span 
                  class="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border"
                  :class="{
                    'bg-success/10 text-success border-success/20': item.status === 'new',
                    'bg-blue-500/10 text-blue-400 border-blue-500/20': item.status === 'update',
                    'bg-red-500/10 text-red-400 border-red-500/20': item.status === 'invalid'
                  }"
                >
                  <span v-if="item.status === 'new'">✨ NEW</span>
                  <span v-else-if="item.status === 'update'">🔄 UPDATE</span>
                  <span v-else>⚠️ INVALID</span>
                </span>
              </td>

              <!-- Name -->
              <td class="px-4 py-3 font-bold text-surface-50">
                {{ item.product.name || '-' }}
              </td>

              <!-- SKU -->
              <td class="px-4 py-3 font-mono text-xs text-surface-400">
                {{ item.product.sku || '-' }}
              </td>

              <!-- Category -->
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-surface-700 text-surface-300 rounded text-xs">
                  {{ item.categoryName }}
                </span>
              </td>

              <!-- Price -->
              <td class="px-4 py-3 text-right font-bold text-primary-400">
                ฿{{ item.product.salePrice?.toLocaleString() || 0 }}
              </td>

              <!-- Stock -->
              <td class="px-4 py-3 text-center">
                <span v-if="item.product.trackInventory" class="text-surface-50 font-bold">
                  {{ item.product.stockQuantity }}
                </span>
                <span v-else class="text-surface-500">-</span>
              </td>

              <!-- Extra Settings (Addons, Mapping) -->
              <td class="px-4 py-3">
                <div class="flex flex-col gap-2 min-w-[140px]">
                  <!-- Addons -->
                  <div v-if="item.product.addonGroups?.length" class="flex flex-col gap-1">
                    <span class="text-[9px] text-surface-500 font-bold uppercase tracking-tighter">Add-ons:</span>
                    <div class="flex flex-wrap gap-1">
                      <span 
                        v-for="(group, gIdx) in item.product.addonGroups"
                        :key="gIdx"
                        class="px-1.5 py-0.5 rounded bg-amber-500/10 text-[9px] text-amber-400 border border-amber-500/20 cursor-help"
                        :title="group.options?.map((opt: any) => `${opt.name} (+${opt.price || 0})`).join('\n')"
                      >
                        {{ group.name }}
                      </span>
                    </div>
                  </div>

                  <!-- Inventory Mapping -->
                  <div v-if="item.product.inventoryMappings?.length" class="flex flex-col gap-1">
                    <span class="text-[9px] text-surface-500 font-bold uppercase tracking-tighter">สต็อกหลัก:</span>
                    <div class="flex flex-col gap-0.5">
                      <span 
                        v-for="(map, mIdx) in item.product.inventoryMappings"
                        :key="mIdx"
                        class="text-[9px] text-blue-400 flex items-center gap-1"
                      >
                        <span class="opacity-50">🔗</span>
                        <span class="truncate max-w-[120px]">{{ (map as any).sourceProductName }}</span>
                        <span class="font-bold">x{{ map.quantity }}</span>
                      </span>
                    </div>
                  </div>

                  <span v-if="!item.product.addonGroups?.length && !item.product.inventoryMappings?.length" class="text-[10px] text-surface-600 italic text-center">
                    - ไม่มี -
                  </span>
                </div>
              </td>

              <!-- Error/Note -->
              <td class="px-4 py-3 last:rounded-r-2xl">
                <span v-if="item.error" class="text-[10px] text-red-400 font-bold italic">{{ item.error }}</span>
                <span v-else class="text-[10px] text-surface-500 truncate max-w-[150px] inline-block">
                  {{ item.product.description || '' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <footer class="px-8 py-6 border-t border-surface-800 bg-surface-900/50 flex items-center justify-between">
        <button 
          @click="$emit('close')"
          class="px-6 py-3 rounded-2xl text-sm font-bold text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all border border-transparent hover:border-surface-700"
        >
          ยกเลิก
        </button>
        <button 
          @click="$emit('confirm')"
          :disabled="validItemsCount === 0"
          class="px-10 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xl shadow-primary-900/20 transition-all active:scale-95 flex items-center gap-3"
        >
          <span>🚀 บันทึกข้อมูล {{ validItemsCount }} รายการ</span>
        </button>
      </footer>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImportPreviewItem } from '~/composables/useProductExcel'

const props = defineProps<{
  isOpen: boolean
  items: ImportPreviewItem[]
}>()

defineEmits(['close', 'confirm'])

const stats = computed(() => {
  return {
    new: props.items.filter(i => i.status === 'new').length,
    update: props.items.filter(i => i.status === 'update').length,
    invalid: props.items.filter(i => i.status === 'invalid').length,
  }
})

const validItemsCount = computed(() => stats.value.new + stats.value.update)
</script>
