<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { usePromotionCodes } from '~/composables/usePromotionCodes'
import { useToast } from '~/composables/useToast'
import type { Product } from '~/types'

const props = defineProps<{
  isOpen: boolean
  products: Product[]
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const toast = useToast()
const { generateBatch } = usePromotionCodes()

const isCreating = ref(false)
const backdropMousedown = ref(false)
const productSearch = ref('')

const form = reactive<{ name: string; productUuids: string[]; count: number; expiresAt: string }>({
  name: '',
  productUuids: [],
  count: 50,
  expiresAt: '',
})

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase()
  if (!q) return props.products
  return props.products.filter(p => p.name.toLowerCase().includes(q))
})

watch(() => props.isOpen, (open) => {
  if (open) {
    form.name = ''
    form.productUuids = []
    form.count = 50
    form.expiresAt = ''
    productSearch.value = ''
  }
})

function onBackdropClick() {
  if (backdropMousedown.value) emit('close')
  backdropMousedown.value = false
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

async function handleCreate() {
  if (!form.name || form.productUuids.length === 0 || form.count < 1) return
  isCreating.value = true
  try {
    const selectedProducts = props.products.filter(p => form.productUuids.includes(p.uuid))
    await generateBatch(
      form.name,
      form.productUuids,
      selectedProducts.map(p => p.name),
      form.count,
      form.expiresAt ? new Date(form.expiresAt) : undefined
    )
    toast.success(`สร้างโค้ด ${form.count} ใบสำเร็จ 🎟️`)
    emit('created')
    emit('close')
  } catch (e: any) {
    toast.error('สร้างโค้ดล้มเหลว: ' + e.message)
  } finally {
    isCreating.value = false
  }
}
</script>

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
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/90"
        @mousedown.self="backdropMousedown = true"
        @click.self="onBackdropClick"
      >
        <div class="w-full max-w-lg bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          <div class="p-6 border-b border-surface-800 shrink-0 flex items-center justify-between">
            <h2 class="text-lg font-black text-surface-50">สร้างชุดโค้ดใหม่</h2>
            <button @click="emit('close')" class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
              <X :size="16" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <div>
              <label class="text-xs font-bold text-surface-400 mb-1.5 block">ชื่อชุดโค้ด *</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="เช่น โปรเปิดร้านใหม่ ม.ค. 69"
                class="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold text-surface-400">สินค้าที่แลกได้ * <span class="text-surface-500 font-normal">(เลือกได้หลายรายการ ลูกค้าเลือก 1 อย่าง)</span></label>
                <span class="text-xs text-primary-400 font-bold">เลือกแล้ว {{ form.productUuids.length }}</span>
              </div>
              <input
                v-model="productSearch"
                type="text"
                placeholder="ค้นหาสินค้า..."
                class="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors mb-2"
              />
              <div class="border border-surface-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-surface-950">
                <label
                  v-for="p in filteredProducts"
                  :key="p.uuid"
                  class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-surface-800"
                  :class="form.productUuids.includes(p.uuid) ? 'bg-primary-600/10' : ''"
                >
                  <input
                    type="checkbox"
                    :value="p.uuid"
                    v-model="form.productUuids"
                    class="w-4 h-4 accent-primary-500 shrink-0"
                  />
                  <span class="flex-1 text-sm font-medium text-surface-200">{{ p.name }}</span>
                  <span class="text-xs text-surface-500 shrink-0">฿{{ p.salePrice }}</span>
                </label>
                <div v-if="filteredProducts.length === 0" class="px-4 py-6 text-center text-sm text-surface-600">
                  ไม่พบสินค้าที่ค้นหา
                </div>
              </div>
            </div>

            <div>
              <label class="text-xs font-bold text-surface-400 mb-1.5 block">จำนวนโค้ด (1–500) *</label>
              <input
                v-model.number="form.count"
                type="number"
                min="1"
                max="500"
                placeholder="50"
                class="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label class="text-xs font-bold text-surface-400 mb-1.5 block">วันหมดอายุ (ไม่บังคับ)</label>
              <input
                v-model="form.expiresAt"
                type="date"
                class="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div class="p-6 border-t border-surface-800 flex gap-3 shrink-0">
            <button
              @click="emit('close')"
              class="flex-1 h-11 bg-surface-800 text-surface-300 font-bold rounded-xl hover:bg-surface-700 transition-all active:scale-95"
            >
              ยกเลิก
            </button>
            <button
              @click="handleCreate"
              :disabled="isCreating || !form.name || form.productUuids.length === 0 || form.count < 1"
              class="flex-1 h-11 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-800 disabled:text-surface-500 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              {{ isCreating ? 'กำลังสร้าง...' : `สร้าง ${form.count} โค้ด` }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
