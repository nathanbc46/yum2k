<!-- =============================================================================
  PosAddonSelection.vue
  พื้นที่สำหรับเลือกตัวเลือกเสริม (Add-ons) แบบ Inline
  - แสดงผลในพื้นที่ "Red Box" ด้านล่างของ Grid สินค้า
  - เชื่อมโยงกับรายการในตะกร้าที่ถูกเลือก
============================================================================= -->
<template>
  <div 
    v-if="selectedItem" 
    @click.stop 
    class="h-full flex flex-col bg-surface-900 border-2 border-primary-500/50 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300"
  >
    <!-- Header -->
    <div class="px-6 py-3 border-b border-surface-800 flex items-center justify-between bg-gradient-to-r from-primary-500/10 dark:from-primary-500/10 to-transparent">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-primary-900/40">
          🍱
        </div>
        <div>
          <h3 class="font-black text-surface-50 text-base tracking-tight font-black">{{ selectedItem.product.name }}</h3>
          <p class="text-[11px] text-primary-400 font-bold tracking-widest uppercase opacity-80 [.light-mode_&]:text-primary-600">ปรับแต่งตัวเลือกเสริม</p>
        </div>
      </div>
      
      <!-- Close Button (Mobile/Tablet Friendly) -->
      <button 
        @click="posStore.setSelectedCartItemIndex(null)"
        class="w-10 h-10 flex items-center justify-center bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-400 hover:text-white transition-all active:scale-90 [.light-mode_&]:bg-surface-800 [.light-mode_&]:text-surface-400"
      >
        <span class="text-2xl font-light">×</span>
      </button>
    </div>

    <!-- Addon Groups Body -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin flex gap-10 px-8 py-4 bg-surface-950/30">
      <div 
        v-for="group in selectedItem.product.addonGroups" 
        :key="group.id"
        class="min-w-[320px] max-w-[450px] flex flex-col h-full bg-surface-900/40 p-5 rounded-3xl border border-surface-800/50 shadow-inner"
      >
        <div class="flex items-center justify-between mb-6 px-1">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-primary-500 rounded-full font-black" />
            <span class="text-base font-black text-surface-50 uppercase tracking-tight">{{ group.name }}</span>
            <span 
              v-if="group.isRequired"
              class="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse"
            >บังคับ</span>
          </div>
          <span v-if="group.maxSelect" class="text-[10px] text-surface-500 font-bold uppercase tracking-widest bg-surface-800 px-2 py-1 rounded-lg font-black">
            สูงสุด {{ group.maxSelect }}
          </span>
        </div>

        <!-- Options List (Compact Grid Layout) -->
        <div class="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-2">
          <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <button
              v-for="opt in group.options"
              :key="opt.id"
              @click="toggleAddon(group.id, opt)"
              class="w-full flex items-center justify-between px-3 py-3 rounded-xl border font-bold transition-all relative overflow-hidden group/opt"
              :class="[
                isSelected(group.id, opt.id)
                  ? 'bg-primary-500 border-primary-400 text-white shadow-md -translate-y-0.5'
                  : 'bg-surface-800 border-surface-700 text-surface-50 hover:border-surface-600 hover:bg-surface-750 [.light-mode_&]:bg-surface-800 [.light-mode_&]:text-surface-50'
              ]"
            >
              <span class="text-xs leading-tight text-left font-bold">{{ opt.name }}</span>
              <span 
                class="text-[10px] font-black shrink-0 ml-1"
                :class="isSelected(group.id, opt.id) ? 'text-primary-100' : 'text-primary-500 [.light-mode_&]:text-primary-600'"
              >
                {{ opt.price > 0 ? `+฿${opt.price}` : 'ฟรี' }}
              </span>
              
              <!-- Glow Effect on Hover -->
              <div class="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/opt:opacity-100 transition-opacity pointer-events-none" />
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer with OK Button -->
    <div class="px-8 py-4 bg-surface-900 border-t border-surface-800 flex items-center justify-between shadow-2xl relative z-10">
      <div v-if="selectedItem.addonsTotal > 0" class="flex flex-col">
        <span class="text-[11px] text-surface-500 font-bold uppercase tracking-widest mb-1">ยอดรวมท็อปปิ้งเพิ่มเติม</span>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-black text-primary-400 tracking-tighter cursor-default [.light-mode_&]:text-primary-600">+฿{{ selectedItem.addonsTotal }}</span>
          <span class="text-sm text-surface-500 font-medium font-black">/ รายการ</span>
        </div>
      </div>
      <div v-else class="flex items-center gap-3 text-surface-500">
        <span class="text-2xl opacity-30">✨</span>
        <div class="text-sm font-medium italic">เลือกปรับแต่งยำของคุณได้ตามใจชอบ</div>
      </div>

      <div class="flex gap-3">
        <button 
          @click="handleClear"
          class="px-8 py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-3xl font-bold text-lg transition-all active:scale-95 border border-red-500/20"
        >
          🗑️ เคลียร์
        </button>
        <button 
          @click="posStore.setSelectedCartItemIndex(null)"
          class="px-14 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-3xl font-black text-xl shadow-xl shadow-primary-900/40 hover:shadow-primary-900/60 transition-all active:scale-95 flex items-center gap-3 ring-4 ring-primary-500/10 hover:ring-primary-500/20 font-black"
        >
          <span class="text-2xl">✅</span>
          <span>ยืนยันตัวเลือก</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePosStore } from '~/stores/pos'
import { useCart } from '~/composables/useCart'
import type { AddonOption } from '~/types'

const posStore = usePosStore()
const { cartItems, updateItemAddons, getAddonKey } = useCart()

const selectedItem = computed(() => {
  if (posStore.selectedCartItemIndex === null) return null
  return cartItems.value[posStore.selectedCartItemIndex] ?? null
})

// --- จัดการการคลิกข้างนอกเพื่อปิด ---
const handleOutsideClick = () => {
  posStore.setSelectedCartItemIndex(null)
}

/** รีเซ็ตค่าหากมีการสลับรายการ */
watch(() => posStore.selectedCartItemIndex, (newIdx) => {
  // ไม่ต้องใช้ rollback แล้ว
}, { immediate: true })

onMounted(() => {
  // ดีเลย์นิดหน่อยเพื่อไม่ให้ดักจับ Event ที่ใช้เปิดตัวเอง
  setTimeout(() => {
    window.addEventListener('click', handleOutsideClick)
  }, 10)
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
})

function isSelected(groupId: string, optId: string): boolean {
  if (!selectedItem.value) return false
  return selectedItem.value.addons.some(a => a.id === optId)
}

async function handleClear() {
  if (posStore.selectedCartItemIndex === null || !selectedItem.value) return
  
  const product = selectedItem.value.product
  const oldKey = getAddonKey(selectedItem.value)
  
  // ล้าง Add-on ทั้งหมดและ Update ตะกร้าทันที
  await updateItemAddons(product.id!, oldKey, [], 0)
}

async function toggleAddon(groupId: string, opt: AddonOption) {
  if (!selectedItem.value || posStore.selectedCartItemIndex === null) return
  
  const currentAddons = [...selectedItem.value.addons]
  const idx = currentAddons.findIndex(a => a.id === opt.id)
  
  if (idx !== -1) {
    currentAddons.splice(idx, 1)
  } else {
    // ตรวจสอบ maxSelect (ถ้ามี)
    const product = selectedItem.value.product
    const group = product.addonGroups?.find(g => g.id === groupId)
    if (group?.maxSelect) {
      const currentGroupCount = currentAddons.filter(a => group.options.some(o => o.id === a.id)).length
      if (currentGroupCount >= group.maxSelect) {
        return
      }
    }
    currentAddons.push(opt)
  }
  
  const newAddonsTotal = currentAddons.reduce((sum, a) => sum + (a.price || 0), 0)
  const product = selectedItem.value.product
  const oldKey = getAddonKey(selectedItem.value)
  
  await updateItemAddons(product.id!, oldKey, currentAddons, newAddonsTotal)
}
</script>
