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
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @mousedown.self="backdropMousedown = true" @mouseup.self="backdropMousedown && $emit('close'); backdropMousedown = false" @mouseleave="backdropMousedown = false">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div v-if="isOpen" class="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div>
                <h2 class="text-lg font-bold text-surface-50">แก้ไขหมู่</h2>
                <p class="text-xs text-surface-500 mt-0.5">เลือกแล้ว {{ productCount }} รายการ</p>
              </div>
              <button @click="$emit('close')" class="text-surface-400 hover:text-surface-200 p-2 rounded-xl hover:bg-surface-800 transition-colors">
                <X :size="20" />
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
              <p class="text-sm text-surface-400">
                เลือก field ที่ต้องการแก้ไข (field ที่ไม่ได้ติ๊กจะไม่ถูกเปลี่ยน)
              </p>

              <!-- หมวดหมู่ -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enableCategory" class="w-4 h-4 accent-primary-500 mt-2.5 rounded" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">หมวดหมู่</label>
                  <select
                    v-model.number="payload.categoryId"
                    :disabled="!enableCategory"
                    class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-3 text-surface-50 disabled:opacity-40 disabled:cursor-not-allowed focus:border-primary-500 focus:outline-none transition-colors"
                  >
                    <option :value="undefined">-- เลือกหมวดหมู่ --</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
              </div>

              <!-- สถานะ -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enableIsActive" class="w-4 h-4 accent-primary-500 mt-2.5 rounded" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">สถานะ</label>
                  <div class="flex gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        :value="true"
                        v-model="payload.isActive"
                        :disabled="!enableIsActive"
                        class="accent-green-500"
                      />
                      <span class="text-sm text-green-400" :class="{ 'opacity-40': !enableIsActive }">เปิดขาย</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        :value="false"
                        v-model="payload.isActive"
                        :disabled="!enableIsActive"
                        class="accent-surface-500"
                      />
                      <span class="text-sm text-surface-400" :class="{ 'opacity-40': !enableIsActive }">ซ่อน</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- ปรับราคา -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enablePrice" class="w-4 h-4 accent-primary-500 mt-2.5 rounded" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">ปรับราคา (%)</label>
                  <div class="flex items-center gap-2">
                    <input
                      v-model.number="payload.priceAdjustPercent"
                      type="number"
                      :disabled="!enablePrice"
                      placeholder="เช่น +10 หรือ -5"
                      class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 disabled:opacity-40 disabled:cursor-not-allowed focus:border-primary-500 focus:outline-none transition-colors"
                    />
                    <span class="text-surface-400 text-sm shrink-0">%</span>
                  </div>
                  <p v-if="enablePrice && payload.priceAdjustPercent" class="text-xs text-surface-500 mt-1">
                    {{ payload.priceAdjustPercent > 0 ? 'เพิ่มราคา' : 'ลดราคา' }}
                    {{ Math.abs(payload.priceAdjustPercent) }}% จากราคาปัจจุบัน
                  </p>
                </div>
              </div>

              <!-- ติดตามสต็อก -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enableTrackInventory" class="w-4 h-4 accent-primary-500 mt-2.5 rounded" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">ติดตามสต็อก</label>
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        :value="true"
                        v-model="payload.trackInventory"
                        :disabled="!enableTrackInventory"
                        class="accent-primary-500"
                      />
                      <span class="text-sm text-primary-400" :class="{ 'opacity-40': !enableTrackInventory }">📦 เปิดติดตาม</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        :value="false"
                        v-model="payload.trackInventory"
                        :disabled="!enableTrackInventory"
                        class="accent-surface-500"
                      />
                      <span class="text-sm text-surface-400" :class="{ 'opacity-40': !enableTrackInventory }">🚫 ปิดติดตาม</span>
                    </label>
                  </div>
                  <p v-if="enableTrackInventory && payload.trackInventory === false" class="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                    <span>⚠️</span> สินค้าจะไม่แสดงสต็อกและไม่แจ้งเตือนเมื่อสินค้าใกล้หมด
                  </p>
                </div>
              </div>

              <!-- ข้อผิดพลาด -->
              <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {{ error }}
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-800">
              <button
                @click="$emit('close')"
                class="h-11 px-6 bg-surface-800 hover:bg-surface-700 text-surface-200 font-semibold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                @click="handleSave"
                :disabled="isSaving || !hasAnyChange"
                class="h-11 px-6 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <span v-if="isSaving" class="animate-spin">⏳</span>
                {{ isSaving ? 'กำลังบันทึก...' : `แก้ไขสินค้าที่เลือก (${productCount} รายการ)` }}
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
import { useMassEdit } from '~/composables/useMassEdit'
import type { Category, MassEditPayload } from '~/types'

const props = defineProps<{
  isOpen: boolean
  productIds: number[]
  categories: Category[]
}>()

const emit = defineEmits<{
  close: []
  saved: [count: number]
}>()

const backdropMousedown = ref(false)

const productCount = computed(() => props.productIds.length)
const { applyMassEdit } = useMassEdit()

const isSaving = ref(false)
const error = ref('')

const enableCategory = ref(false)
const enableIsActive = ref(false)
const enablePrice = ref(false)
const enableTrackInventory = ref(false)

const payload = ref<MassEditPayload>({
  categoryId: undefined,
  isActive: undefined,
  priceAdjustPercent: undefined,
  trackInventory: undefined,
})

const hasAnyChange = computed(() =>
  (enableCategory.value && payload.value.categoryId !== undefined)
  || enableIsActive.value
  || (enablePrice.value && payload.value.priceAdjustPercent !== 0 && payload.value.priceAdjustPercent !== undefined)
  || (enableTrackInventory.value && payload.value.trackInventory !== undefined)
)

watch(() => props.isOpen, (open) => {
  if (!open) return
  enableCategory.value = false
  enableIsActive.value = false
  enablePrice.value = false
  enableTrackInventory.value = false
  payload.value = { categoryId: undefined, isActive: undefined, priceAdjustPercent: undefined, trackInventory: undefined }
  error.value = ''
})

async function handleSave() {
  error.value = ''
  const finalPayload: MassEditPayload = {}

  if (enableCategory.value && payload.value.categoryId !== undefined) {
    finalPayload.categoryId = payload.value.categoryId
  }
  if (enableIsActive.value && payload.value.isActive !== undefined) {
    finalPayload.isActive = payload.value.isActive
  }
  if (enablePrice.value && payload.value.priceAdjustPercent !== undefined) {
    finalPayload.priceAdjustPercent = payload.value.priceAdjustPercent
  }
  if (enableTrackInventory.value && payload.value.trackInventory !== undefined) {
    finalPayload.trackInventory = payload.value.trackInventory
  }

  if (Object.keys(finalPayload).length === 0) {
    error.value = 'กรุณาเลือกอย่างน้อย 1 field ที่ต้องการแก้ไข'
    return
  }

  isSaving.value = true
  try {
    const count = await applyMassEdit(props.productIds, finalPayload)
    emit('saved', count)
    emit('close')
  } catch (e: any) {
    error.value = 'เกิดข้อผิดพลาด: ' + (e.message || e)
  } finally {
    isSaving.value = false
  }
}
</script>
