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
            : 'fixed inset-0 flex items-end md:items-start justify-center p-0 md:p-3'
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
              : 'relative w-full max-w-6xl h-[90vh] md:h-auto md:max-h-[92vh] border-t md:border-2 border-primary-500/30 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom md:zoom-in-95'
          ]"
        >
          <!-- Header -->
          <div 
            :class="[
              'border-b border-surface-800 flex items-center justify-between bg-gradient-to-r from-primary-500/10 to-transparent shrink-0',
              isInline ? 'px-4 py-2' : 'px-4 py-2'
            ]"
          >
            <div class="flex items-center gap-4">
              <div 
                :class="[
                  'bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-900/40',
                  isInline ? 'w-7 h-7 text-base' : 'w-7 h-7 text-base'
                ]"
              >
                🍱
              </div>
              <div>
                <h3 
                  :class="[
                    'font-black text-surface-50 tracking-tight leading-tight uppercase',
                    isInline ? 'text-sm' : 'text-sm'
                  ]"
                >
                  {{ selectedItem?.product.name }}
                </h3>
                <p class="text-[9px] md:text-[10px] text-primary-400 font-black tracking-widest uppercase opacity-80 [.light-mode_&]:text-primary-600">ปรับแต่งตัวเลือกเสริม</p>
              </div>
            </div>
            
            <button 
              @click="posStore.setSelectedCartItemIndex(null)"
              class="w-7 h-7 flex items-center justify-center bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-400 hover:text-white transition-all active:scale-90"
            >
              <span class="text-lg font-light">×</span>
            </button>
          </div>

          <!-- Addon Groups Body -->
          <div 
            class="overflow-y-auto scrollbar-thin bg-surface-950/30"
            :class="{ 'flex-1': !isInline }"
          >
            <div
              :class="[
                'grid gap-2 md:gap-3',
                isInline ? 'p-2' : 'p-2',
                'grid-cols-1'
              ]"
            >
              <div
                v-for="group in mergedAddonGroups"
                :key="group.id"
                class="flex items-start gap-2 bg-surface-900/60 rounded-xl border border-surface-800/50 hover:border-surface-700/50 transition-colors px-2 py-1.5"
              >
                <!-- Group Label (คอลัมน์ซ้าย fixed width) -->
                <div class="w-20 shrink-0 flex flex-col gap-1 pt-2.5">
                  <div class="flex items-center gap-1">
                    <div class="w-1 h-3.5 bg-primary-500 rounded-full shrink-0" />
                    <span class="text-[11px] font-black text-surface-300 uppercase tracking-tight leading-tight">{{ group.name }}</span>
                  </div>
                  <div class="flex items-center gap-1 pl-2">
                    <span
                      v-if="group.isRequired"
                      class="text-[8px] bg-red-500 text-white px-1 py-0.5 rounded-full font-black animate-pulse"
                    >บังคับ</span>
                    <span v-if="group.maxSelect" class="text-[8px] text-surface-500 font-bold bg-surface-800 px-1.5 py-0.5 rounded">
                      {{ group.maxSelect }}
                    </span>
                  </div>
                </div>

                <!-- Option Buttons (4-column grid) -->
                <div class="flex-1 grid grid-cols-4 gap-1.5">
                  <button
                    v-for="opt in group.options"
                    :key="opt.id"
                    @click="toggleAddon(group.id, opt)"
                    class="flex items-center justify-between px-2.5 py-2 rounded-xl border font-bold transition-all relative overflow-hidden group/opt"
                    :class="[
                      isSelected(group.id, opt.id)
                        ? 'bg-primary-500 border-primary-400 text-white shadow-md active:scale-95'
                        : 'bg-surface-800 border-surface-700 text-surface-50 hover:border-surface-600 hover:bg-surface-750 [.light-mode_&]:bg-surface-800 [.light-mode_&]:text-surface-50 active:scale-98'
                    ]"
                  >
                    <span class="text-xs leading-tight font-black">{{ opt.name }}</span>
                    <span
                      v-if="opt.price > 0"
                      class="text-[10px] font-black shrink-0 ml-1"
                      :class="isSelected(group.id, opt.id) ? 'text-primary-100' : 'text-primary-500 [.light-mode_&]:text-primary-600'"
                    >
                      +฿{{ opt.price }}
                    </span>
                    <div class="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/opt:opacity-100 transition-opacity pointer-events-none" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="bg-surface-900 border-t border-surface-800 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] shrink-0 px-3 py-2 flex flex-col gap-1.5">
            <!-- แถวแจ้งเตือน / ยอด addons -->
            <div v-if="!isSelectionValid" class="flex items-center gap-2 text-red-400 animate-pulse">
              <span>⚠️</span>
              <span class="text-[11px] font-black uppercase tracking-tighter">กรุณาเลือกรายการที่บังคับให้ครบถ้วน</span>
            </div>
            <div v-else-if="(selectedItem?.addonsTotal ?? 0) > 0" class="flex items-center gap-2">
              <span class="text-[10px] text-surface-500 font-black uppercase tracking-widest">ท็อปปิ้งเพิ่มเติม:</span>
              <span class="text-base font-black text-primary-400 tracking-tighter [.light-mode_&]:text-primary-600">+฿{{ selectedItem?.addonsTotal }}</span>
              <span class="text-[10px] text-surface-500 font-bold uppercase opacity-60">/ รายการ</span>
            </div>

            <!-- แถวหมายเหตุ + ปุ่ม -->
            <div class="flex items-center gap-2">
              <div class="flex items-center flex-1 min-w-0 bg-surface-950 border border-surface-700 rounded-lg focus-within:border-primary-500 transition-colors">
                <input
                  v-model="localNote"
                  @input="handleNoteInput"
                  type="text"
                  placeholder="หมายเหตุ เช่น ไม่ใส่ผักชี"
                  class="flex-1 min-w-0 bg-transparent pl-3 py-1.5 text-xs text-surface-200 placeholder-surface-600 outline-none"
                />
                <button
                  v-if="localNote"
                  type="button"
                  tabindex="-1"
                  @click.stop="clearNote"
                  class="shrink-0 px-2 py-1.5 text-surface-500 hover:text-surface-300 transition-colors"
                >
                  <X :size="13" />
                </button>
              </div>
              <button
                @click="handleClear"
                :disabled="hasRequiredGroups"
                :class="[
                  'shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95',
                  hasRequiredGroups
                    ? 'bg-surface-800 text-surface-500 cursor-not-allowed border border-surface-700'
                    : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                ]"
              >
                🗑️ เคลียร์
              </button>
              <button
                @click="isSelectionValid ? posStore.setSelectedCartItemIndex(null) : null"
                :disabled="!isSelectionValid"
                :class="[
                  'shrink-0 px-4 py-1.5 rounded-lg text-sm font-black shadow-lg transition-all active:scale-95 flex items-center gap-1.5',
                  isSelectionValid
                    ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-900/40 ring-4 ring-primary-500/10'
                    : 'bg-surface-800 text-surface-600 cursor-not-allowed opacity-50 grayscale'
                ]"
              >
                <span>{{ isSelectionValid ? '✅' : '🔒' }}</span>
                <span>ยืนยัน</span>
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
import { X } from 'lucide-vue-next'
import { usePosStore } from '~/stores/pos'
import { useCart } from '~/composables/useCart'
import type { AddonOption } from '~/types'

const props = defineProps<{
  isInline?: boolean
}>()

const posStore = usePosStore()
const { cartItems, updateItemAddons, updateItemNote, getAddonKey } = useCart()

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

const localNote = ref('')

watch(() => posStore.selectedCartItemIndex, () => {
  localNote.value = selectedItem.value?.itemNote ?? ''
}, { immediate: true })

async function handleNoteInput() {
  const idx = posStore.selectedCartItemIndex
  if (idx === null || !selectedItem.value) return
  await updateItemNote(
    selectedItem.value.product.id!,
    getAddonKey(selectedItem.value),
    localNote.value,
    idx
  )
}

function clearNote() {
  const idx = posStore.selectedCartItemIndex
  if (idx === null || !selectedItem.value) return
  localNote.value = ''
  updateItemNote(selectedItem.value.product.id!, getAddonKey(selectedItem.value), '', idx)
}

// รวม add-on groups จาก category (ทั่วไป) + product (เฉพาะสินค้า)
const mergedAddonGroups = computed(() => {
  if (!selectedItem.value) return []
  const catAddons = selectedItem.value.product.category?.addonGroups ?? []
  const prodAddons = selectedItem.value.product.addonGroups ?? []
  return [...catAddons, ...prodAddons]
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

// ตรวจสอบว่าเลือกตัวเลือกที่บังคับครบถ้วนหรือไม่
const isSelectionValid = computed(() => {
  if (!selectedItem.value) return true
  const addonGroups = mergedAddonGroups.value
  
  // กรองหากลุ่มที่บังคับเลือก
  const requiredGroups = addonGroups.filter(g => g.isRequired)
  
  // ตรวจสอบว่าในแต่ละกลุ่มที่บังคับ มีการเลือกอย่างน้อย 1 อย่างหรือไม่
  return requiredGroups.every(group => {
    return selectedItem.value?.addons.some(selected => 
      group.options.some(opt => opt.id === selected.id)
    )
  })
})

function isSelected(groupId: string, optId: string): boolean {
  if (!selectedItem.value) return false
  return selectedItem.value.addons.some(a => a.id === optId)
}

// ตรวจสอบว่าสินค้ามีกลุ่มที่บังคับเลือกหรือไม่
const hasRequiredGroups = computed(() => {
  if (!selectedItem.value) return false
  return mergedAddonGroups.value.some(g => g.isRequired)
})

async function handleClear() {
  const idx = posStore.selectedCartItemIndex
  if (idx === null || !selectedItem.value || hasRequiredGroups.value) return

  const product = selectedItem.value.product
  const oldKey = getAddonKey(selectedItem.value)

  // ล้าง note ก่อน (ก่อนที่ updateItemAddons อาจ merge/splice item)
  localNote.value = ''
  updateItemNote(product.id!, oldKey, '', idx)

  await updateItemAddons(product.id!, oldKey, [], 0)
}

async function toggleAddon(groupId: string, opt: AddonOption) {
  if (!selectedItem.value || posStore.selectedCartItemIndex === null) return
  
  const currentAddons = [...selectedItem.value.addons]
  const idx = currentAddons.findIndex(a => a.id === opt.id)
  const product = selectedItem.value.product
  const group = mergedAddonGroups.value.find(g => g.id === groupId)
  
  if (idx !== -1) {
    // กรณีจะเอาออก
    if (group?.isRequired) {
      // ตรวจสอบว่าในกลุ่มนี้ มีตัวเลือกอื่นที่ถูกเลือกอยู่อีกไหม (นอกจากตัวที่จะเอาออก)
      const currentGroupOptionsIds = group.options.map(o => o.id)
      const otherSelectedInGroup = currentAddons.filter(a => a.id !== opt.id && currentGroupOptionsIds.includes(a.id))
      
      if (otherSelectedInGroup.length === 0) {
        // ถ้าเอาตัวนี้ออกแล้วจะไม่เหลือตัวเลือกเลยในกลุ่มที่บังคับ -> ห้ามเอาออกเด็ดขาด
        return
      }
    }
    currentAddons.splice(idx, 1)
  } else {
    // กรณีจะเพิ่มเข้า
    if (group?.maxSelect) {
      const currentGroupOptionsIds = group.options.map(o => o.id)
      const currentGroupCount = currentAddons.filter(a => currentGroupOptionsIds.includes(a.id)).length
      const maxSelect = Number(group.maxSelect)
      
      if (maxSelect === 1) {
        // 📻 โหมด Radio: ลบตัวเก่า "ทั้งหมด" ในกลุ่มนี้ออกก่อน
        // (ใช้ filter เพื่อความแน่นอนว่าไม่หลงเหลือแม้จะมี Bug ข้อมูลซ้ำ)
        for (let i = currentAddons.length - 1; i >= 0; i--) {
          const addon = currentAddons[i]
          if (addon && currentGroupOptionsIds.includes(addon.id)) {
            currentAddons.splice(i, 1)
          }
        }
      } else if (currentGroupCount >= maxSelect) {
        // ถ้าเต็มโควตาแล้ว ห้ามเลือกเพิ่ม
        return
      }
    }
    currentAddons.push(opt)
  }
  
  const newAddonsTotal = currentAddons.reduce((sum, a) => sum + (a.price || 0), 0)
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
