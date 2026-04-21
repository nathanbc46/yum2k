<!-- =============================================================================
  PosAddonSelection.vue
  พื้นที่สำหรับเลือกตัวเลือกเสริม (Add-ons)
  - รองรับ 2 โหมด: 
    1. Modal Mode (Default): สำหรับมือถือ (ใช้ Teleport)
    2. Inline Mode: สำหรับแท็บเล็ต/เดสก์ท็อป (ฝังใน Grid สินค้า)
============================================================================= -->
<template>
  <Teleport to="body" :disabled="isInline">
    <Transition :name="isInline ? '' : 'modal-fade'">
      <div 
        v-if="shouldRender" 
        :class="[
          'z-[100]',
          isInline 
            ? 'w-full h-full flex items-center justify-center p-4' 
            : 'fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-10'
        ]"
      >
        <!-- Backdrop (แสดงเฉพาะโหมด Modal) -->
        <div 
          v-if="!isInline"
          class="absolute inset-0 bg-surface-950/80 backdrop-blur-md"
          @click="posStore.setSelectedCartItemIndex(null)"
        />

        <!-- Content Box -->
        <div 
          ref="modalContent"
          @click.stop 
          :class="[
            'bg-surface-900 overflow-hidden flex flex-col transition-all duration-300',
            isInline 
              ? 'w-full max-w-5xl h-fit max-h-full rounded-3xl border border-surface-800 shadow-xl' 
              : 'relative w-full max-w-6xl h-[90vh] md:h-auto md:max-h-[85vh] border-t md:border-2 border-primary-500/30 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom md:zoom-in-95'
          ]"
        >
          <!-- Header -->
          <div 
            :class="[
              'border-b border-surface-800 flex items-center justify-between bg-gradient-to-r from-primary-500/10 to-transparent shrink-0',
              isInline ? 'px-6 py-3.5' : 'px-6 md:px-8 py-4 md:py-5'
            ]"
          >
            <div class="flex items-center gap-4">
              <div 
                :class="[
                  'bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-900/40',
                  isInline ? 'w-8 h-8 text-lg' : 'w-10 h-10 md:w-12 md:h-12 text-xl md:text-2xl'
                ]"
              >
                🍱
              </div>
              <div>
                <h3 
                  :class="[
                    'font-black text-surface-50 tracking-tight leading-tight uppercase',
                    isInline ? 'text-base' : 'text-base md:text-xl'
                  ]"
                >
                  {{ selectedItem?.product.name }}
                </h3>
                <p class="text-[9px] md:text-[10px] text-primary-400 font-black tracking-widest uppercase opacity-80 [.light-mode_&]:text-primary-600">ปรับแต่งตัวเลือกเสริม</p>
              </div>
            </div>
            
            <button 
              @click="posStore.setSelectedCartItemIndex(null)"
              class="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-400 hover:text-white transition-all active:scale-90"
            >
              <span class="text-xl md:text-2xl font-light">×</span>
            </button>
          </div>

          <!-- Addon Groups Body -->
          <div 
            class="overflow-y-auto scrollbar-thin bg-surface-950/30"
            :class="{ 'flex-1': !isInline }"
          >
            <div 
              :class="[
                'flex gap-4 md:gap-5',
                isInline ? 'flex-row flex-wrap justify-center p-5 md:p-6' : 'flex-col md:flex-row px-5 md:px-8 py-6 md:py-8'
              ]"
            >
              <div 
                v-for="group in selectedItem?.product.addonGroups" 
                :key="group.id"
                class="flex flex-col bg-surface-900/60 rounded-3xl border border-surface-800/50 shadow-inner h-fit hover:border-surface-700/50 transition-colors"
                :class="[
                  isInline ? 'p-4 min-w-[260px] max-w-[320px]' : 'p-5 w-full md:min-w-[280px] md:max-w-[450px]'
                ]"
              >
                <!-- Group Header -->
                <div class="flex items-center justify-between mb-3 px-1">
                  <div class="flex items-center gap-2">
                    <div class="w-1.5 h-5 bg-primary-500 rounded-full" />
                    <span class="text-sm font-black text-surface-50 uppercase tracking-tight">{{ group.name }}</span>
                    <span 
                      v-if="group.isRequired"
                      class="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse"
                    >บังคับ</span>
                  </div>
                  <span v-if="group.maxSelect" class="text-[9px] text-surface-500 font-bold uppercase tracking-widest bg-surface-800 px-2 py-0.5 rounded-md">
                    {{ group.maxSelect }}
                  </span>
                </div>

                <!-- Options List (Compact Grid Layout) -->
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="opt in group.options"
                    :key="opt.id"
                    @click="toggleAddon(group.id, opt)"
                    class="w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl border font-bold transition-all relative overflow-hidden group/opt"
                    :class="[
                      isSelected(group.id, opt.id)
                        ? 'bg-primary-500 border-primary-400 text-white shadow-md active:scale-95'
                        : 'bg-surface-800 border-surface-700 text-surface-50 hover:border-surface-600 hover:bg-surface-750 [.light-mode_&]:bg-surface-800 [.light-mode_&]:text-surface-50 active:scale-98'
                    ]"
                  >
                    <span class="text-[10px] md:text-[11px] leading-tight text-left font-bold">{{ opt.name }}</span>
                    <span 
                      class="text-[9px] font-black shrink-0 ml-1"
                      :class="isSelected(group.id, opt.id) ? 'text-primary-100' : 'text-primary-500 [.light-mode_&]:text-primary-600'"
                    >
                      {{ opt.price > 0 ? `+฿${opt.price}` : 'ฟรี' }}
                    </span>
                    
                    <div class="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/opt:opacity-100 transition-opacity pointer-events-none" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div 
            :class="[
              'bg-surface-900 border-t border-surface-800 flex items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] shrink-0',
              isInline ? 'px-6 py-3.5' : 'px-6 md:px-8 py-5 md:py-6 flex-col md:flex-row'
            ]"
          >
            <div class="w-full md:w-auto">
              <div v-if="(selectedItem?.addonsTotal ?? 0) > 0" class="flex items-center justify-between md:flex-col md:items-start leading-tight">
                <span class="text-[9px] md:text-[10px] text-surface-500 font-black uppercase tracking-widest">ยอดรวมท็อปปิ้งเพิ่มเติม</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-xl md:text-2xl font-black text-primary-400 tracking-tighter [.light-mode_&]:text-primary-600">+฿{{ selectedItem?.addonsTotal }}</span>
                  <span class="text-[10px] md:text-xs text-surface-500 font-bold uppercase opacity-60">/ รายการ</span>
                </div>
              </div>
              <div v-else class="hidden md:flex items-center gap-2 text-surface-500">
                <span class="text-xl opacity-30">✨</span>
                <div class="text-[11px] font-medium italic">เลือกปรับแต่งยำของคุณได้ตามใจชอบ</div>
              </div>
            </div>

            <div 
              :class="[
                'flex gap-2.5',
                isInline ? 'w-auto' : 'w-full md:w-auto'
              ]"
            >
              <button 
                @click="handleClear"
                :class="[
                  'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold transition-all active:scale-95',
                  isInline ? 'px-5 py-3 rounded-2xl text-base' : 'flex-1 md:flex-none px-6 md:px-8 py-4 md:py-4 rounded-2xl md:rounded-3xl text-base md:text-lg'
                ]"
              >
                🗑️ เคลียร์
              </button>
              <button 
                @click="posStore.setSelectedCartItemIndex(null)"
                :class="[
                  'bg-primary-600 hover:bg-primary-500 text-white font-black shadow-xl shadow-primary-900/40 hover:shadow-primary-900/60 transition-all active:scale-95 flex items-center justify-center gap-2.5 ring-4 ring-primary-500/10 hover:ring-primary-500/20',
                  isInline ? 'px-8 py-3 rounded-2xl text-lg' : 'flex-[2] md:flex-none px-10 md:px-14 py-4 md:py-4 rounded-2xl md:rounded-3xl text-lg md:text-xl'
                ]"
              >
                <span class="text-xl">✅</span>
                <span>ยืนยันตัวเลือก</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import { usePosStore } from '~/stores/pos'
import { useCart } from '~/composables/useCart'
import type { AddonOption } from '~/types'

const props = defineProps<{
  isInline?: boolean
}>()

const posStore = usePosStore()
const { cartItems, updateItemAddons, getAddonKey } = useCart()

// ส่วนอ้างอิงถึง Div ของกล่องปรับแต่ง
const modalContent = ref<HTMLElement | null>(null)

// สรุปสถานะการแสดงผล
const isMobile = ref(false)

const updateBreakpoint = () => {
  isMobile.value = window.innerWidth < 768
}

const selectedItem = computed(() => {
  if (posStore.selectedCartItemIndex === null) return null
  return cartItems.value[posStore.selectedCartItemIndex] ?? null
})

// เงื่อนไขในการ Render: 
// 1. ถ้าเป็นโหมด Inline (บน Tablet) ให้แสดงเสมอเมื่อมีข้อมูล
// 2. ถ้าเป็นโหมด Modal (บน Mobile) ให้แสดงเฉพาะเมื่อขนาดหน้าจอเป็นมือถือจริงๆ
const shouldRender = computed(() => {
  if (!selectedItem.value) return false
  return props.isInline || isMobile.value
})

/** ดักจับการคลิกที่ "ข้างนอก" กล่องปรับแต่ง */
const handleGlobalClick = (e: MouseEvent) => {
  // ถ้าไม่ได้เปิดอยู่ หรือไม่มี Ref ให้ข้ามไป
  if (!shouldRender.value || !modalContent.value) return

  // ถ้าจุดที่คลิก ไม่ได้อยู่ในกล่อง (modalContent) ให้ปิด
  if (!modalContent.value.contains(e.target as Node)) {
    posStore.setSelectedCartItemIndex(null)
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    posStore.setSelectedCartItemIndex(null)
  }
}

onMounted(() => {
  updateBreakpoint()
  window.addEventListener('resize', updateBreakpoint)
  window.addEventListener('keydown', handleKeyDown)
  
  // ดีเลย์นิดเดียวเพื่อไม่ให้ดักจับ Event ตอนเปิดตัวมันเองขึ้นมา
  setTimeout(() => {
    window.addEventListener('click', handleGlobalClick)
  }, 50)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateBreakpoint)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('click', handleGlobalClick)
})

function isSelected(groupId: string, optId: string): boolean {
  if (!selectedItem.value) return false
  return selectedItem.value.addons.some(a => a.id === optId)
}

async function handleClear() {
  if (posStore.selectedCartItemIndex === null || !selectedItem.value) return
  
  const product = selectedItem.value.product
  const oldKey = getAddonKey(selectedItem.value)
  
  await updateItemAddons(product.id!, oldKey, [], 0)
}

async function toggleAddon(groupId: string, opt: AddonOption) {
  if (!selectedItem.value || posStore.selectedCartItemIndex === null) return
  
  const currentAddons = [...selectedItem.value.addons]
  const idx = currentAddons.findIndex(a => a.id === opt.id)
  
  if (idx !== -1) {
    currentAddons.splice(idx, 1)
  } else {
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

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .animate-in {
  transform: translateY(100px);
}
@media (min-width: 768px) {
  .modal-fade-enter-from .animate-in {
    transform: scale(0.9) translateY(0);
  }
}
</style>
