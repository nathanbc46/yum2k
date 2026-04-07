<!-- =============================================================================
  PosAddonModal.vue
  Modal สำหรับเลือกตัวเลือกเสริม (Add-ons) ก่อนเพิ่มสินค้าลงตะกร้า
  - แสดงเมื่อสินค้ามี addonGroups
  - Touch-friendly สำหรับแท็บเล็ต
============================================================================= -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen && product"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="handleCancel"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/75 backdrop-blur-sm" />

        <!-- Modal Box -->
        <div class="relative bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-surface-800 shrink-0">
            <div>
              <h2 class="font-bold text-base text-surface-50">🛒 {{ product.name }}</h2>
              <p class="text-xs text-surface-400 mt-0.5">เลือกตัวเลือกเสริม</p>
            </div>
            <button
              @click="handleCancel"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors text-xl"
            >×</button>
          </div>

          <!-- Addon Group List -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            <div
              v-for="group in product.addonGroups"
              :key="group.id"
            >
              <div class="flex items-center gap-2 mb-2.5">
                <span class="text-sm font-bold text-surface-100">{{ group.name }}</span>
                <span
                  v-if="group.isRequired"
                  class="text-[10px] bg-danger/20 text-danger border border-danger/30 px-2 py-0.5 rounded-full font-semibold"
                >บังคับ</span>
                <span
                  v-else
                  class="text-[10px] bg-surface-800 text-surface-400 px-2 py-0.5 rounded-full"
                >ไม่บังคับ</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="opt in group.options"
                  :key="opt.id"
                  type="button"
                  @click="toggleOption(group.id, opt)"
                  :class="[
                    'flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
                    isSelected(group.id, opt.id)
                      ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                      : 'border-surface-700 bg-surface-950 text-surface-300 hover:border-surface-500 active:scale-95'
                  ]"
                >
                  <span>{{ opt.name }}</span>
                  <span
                    :class="opt.price > 0 ? 'text-success text-xs font-bold' : 'text-surface-500 text-xs'"
                  >
                    {{ opt.price > 0 ? `+${opt.price}฿` : 'ฟรี' }}
                  </span>
                </button>
              </div>
              <!-- Validation Error -->
              <p v-if="group.isRequired && !hasSelection(group.id)" class="text-xs text-danger mt-1.5">
                ⚠️ กรุณาเลือกอย่างน้อย 1 ตัวเลือก
              </p>
            </div>

            <!-- ราคารวม Addons -->
            <div
              v-if="addonsTotal > 0"
              class="flex items-center justify-between px-4 py-3 bg-surface-950 rounded-xl border border-surface-800"
            >
              <span class="text-sm text-surface-400">ราคาสินค้า (ตัวเลือกเสริม)</span>
              <span class="font-bold text-primary-400">+{{ addonsTotal }}฿</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex gap-3 px-5 py-4 border-t border-surface-800 shrink-0">
            <button
              @click="handleCancel"
              class="flex-1 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              @click="handleConfirm"
              class="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-900/20"
            >
              ✅ บันทึก / เพิ่มลงตะกร้า
              <span v-if="addonsTotal > 0" class="opacity-80 font-normal">(+{{ addonsTotal }}฿)</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Product, AddonOption } from '~/types'

const props = defineProps<{
  isOpen: boolean
  product: Product | null
  initialAddons?: AddonOption[]
}>()

const emit = defineEmits<{
  cancel: []
  confirm: [selectedAddons: AddonOption[], addonsTotal: number]
}>()

// selectedMap: { [groupId: string]: AddonOption[] }
const selectedMap = ref<Record<string, AddonOption[]>>({})

// Reset เมื่อเปิด Modal ใหม่ และโหลด initial (ถ้ามี)
watch(() => props.isOpen, (open) => {
  if (open) {
    selectedMap.value = {}
    if (props.initialAddons && props.initialAddons.length > 0 && props.product?.addonGroups) {
      props.initialAddons.forEach(opt => {
        // หาว่า opt ตัวนี้อยู่กรุ๊ปไหน
        const group = props.product!.addonGroups!.find(g => g.options.some(o => o.id === opt.id))
        if (group) {
          const groupArr = selectedMap.value[group.id] || []
          if (!groupArr.some(o => o.id === opt.id)) {
            groupArr.push(opt)
          }
          selectedMap.value[group.id] = groupArr
        }
      })
    }
  }
})

function isSelected(groupId: string, optId: string): boolean {
  return selectedMap.value[groupId]?.some(o => o.id === optId) ?? false
}

function hasSelection(groupId: string): boolean {
  return (selectedMap.value[groupId]?.length ?? 0) > 0
}

function toggleOption(groupId: string, opt: AddonOption) {
  if (!selectedMap.value[groupId]) {
    selectedMap.value[groupId] = []
  }
  const idx = selectedMap.value[groupId].findIndex(o => o.id === opt.id)
  if (idx >= 0) {
    // deselect
    selectedMap.value[groupId].splice(idx, 1)
  } else {
    selectedMap.value[groupId].push(opt)
  }
}

// คำนวณ addonsTotal จาก selected options
const addonsTotal = computed(() => {
  return Object.values(selectedMap.value)
    .flat()
    .reduce((sum, opt) => sum + (opt.price || 0), 0)
})

function handleCancel() {
  emit('cancel')
}

function handleConfirm() {
  // ตรวจว่า required groups ทุกกลุ่มมีการเลือกหรือยัง
  const groups = props.product?.addonGroups ?? []
  const hasUnfilled = groups.some(g => g.isRequired && !hasSelection(g.id))
  if (hasUnfilled) return  // ไม่ปิด Modal ถ้ายังไม่ครบ

  const allSelected = Object.values(selectedMap.value).flat()
  emit('confirm', allSelected, addonsTotal.value)
}
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
</style>
