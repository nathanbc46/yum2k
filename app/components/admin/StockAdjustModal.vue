<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <div class="relative bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-5 border-b border-surface-800">
            <div>
              <h2 class="font-bold text-lg text-surface-50">📦 ปรับสต็อกสินค้า</h2>
              <p class="text-sm text-primary-400 font-medium mt-0.5">{{ product?.name }}</p>
            </div>
            <button
              @click="$emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >×</button>
          </div>

          <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
            <!-- แสดงสต็อกปัจจุบัน -->
            <div class="bg-surface-950 rounded-xl px-4 py-3 border border-surface-800 text-center">
              <div class="text-xs text-surface-500 mb-1">สต็อกปัจจุบัน</div>
              <div class="text-3xl font-bold text-surface-50">{{ product?.stockQuantity ?? 0 }}</div>
              <div class="text-xs text-surface-500">ชิ้น</div>
            </div>

            <!-- เหตุผล -->
            <div>
              <label class="block text-xs text-surface-400 mb-2 font-semibold uppercase tracking-wider">เหตุผลการปรับ</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="(label, key) in ADJUST_REASON_LABELS"
                  :key="key"
                  type="button"
                  @click="reason = key as StockAdjustReason"
                  class="py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-left"
                  :class="reason === key
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-surface-700 bg-surface-950 text-surface-400 hover:border-surface-500'"
                >
                  {{ label }}
                </button>
              </div>
            </div>

            <!-- จำนวนที่ปรับ -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">จำนวนที่ปรับเปลี่ยน</label>
              <div class="flex gap-3">
                <!-- ลด -->
                <button
                  type="button"
                  @click="deltaSign = -1"
                  class="flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all"
                  :class="deltaSign === -1
                    ? 'border-danger bg-danger/10 text-danger'
                    : 'border-surface-700 text-surface-400 hover:border-surface-500'"
                >
                  − ลดสต็อก
                </button>
                <!-- เพิ่ม -->
                <button
                  type="button"
                  @click="deltaSign = 1"
                  class="flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all"
                  :class="deltaSign === 1
                    ? 'border-success bg-success/10 text-success'
                    : 'border-surface-700 text-surface-400 hover:border-surface-500'"
                >
                  + เพิ่มสต็อก
                </button>
              </div>
              <input
                v-model.number="deltaAbs"
                type="number"
                min="1"
                required
                placeholder="ใส่จำนวน เช่น 10"
                class="mt-3 w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none transition-all placeholder:text-surface-600 text-center text-xl font-bold"
              />
            </div>

            <!-- Preview ผลลัพธ์ -->
            <div
              v-if="deltaAbs > 0"
              class="flex items-center justify-between bg-surface-950 rounded-xl px-5 py-3 border border-surface-800"
            >
              <div class="text-center">
                <div class="text-xs text-surface-500">ก่อนปรับ</div>
                <div class="text-xl font-bold text-surface-300">{{ product?.stockQuantity ?? 0 }}</div>
              </div>
              <div class="text-2xl text-surface-500">→</div>
              <div class="text-center">
                <div class="text-xs text-surface-500">หลังปรับ</div>
                <div
                  class="text-xl font-bold"
                  :class="afterStock < 0 ? 'text-danger' : (afterStock <= (product?.alertThreshold ?? 10) ? 'text-amber-400' : 'text-success')"
                >
                  {{ Math.max(0, afterStock) }}
                </div>
              </div>
            </div>

            <p v-if="errorMsg" class="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
              ⚠️ {{ errorMsg }}
            </p>

            <!-- หมายเหตุ (ไปบันทึกใน Audit Log) -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">หมายเหตุ (ไม่บังคับ)</label>
              <input
                v-model="note"
                type="text"
                placeholder="เช่น รับสินค้าจากซัพพลายเออร์, ของเสียจากน้ำท่วม..."
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 outline-none transition-all placeholder:text-surface-600"
              />
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                type="button"
                @click="$emit('close')"
                class="flex-1 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                :disabled="isSaving || deltaAbs <= 0"
                class="flex-1 py-3 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg"
                :class="deltaSign === -1 ? 'bg-danger hover:bg-danger/80 shadow-danger/20' : 'bg-success hover:bg-success/80 shadow-success/20'"
              >
                {{ isSaving ? 'กำลังบันทึก...' : 'ยืนยันการปรับสต็อก' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useProducts, ADJUST_REASON_LABELS, type StockAdjustReason } from '~/composables/useProducts'
import type { Product } from '~/types'

const props = defineProps<{
  isOpen: boolean
  product?: Product | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { adjustStock } = useProducts()

const reason = ref<StockAdjustReason>('restock')
const deltaSign = ref<1 | -1>(1)   // +1 เพิ่ม / -1 ลด
const deltaAbs = ref<number>(0)     // ตัวเลขบวกเสมอ
const note = ref<string>('')        // หมายเหตุ
const isSaving = ref(false)
const errorMsg = ref('')

// Preview สต็อกหลังปรับ
const afterStock = computed(() => {
  return (props.product?.stockQuantity ?? 0) + deltaSign.value * deltaAbs.value
})

// Reset เมื่อเปิด Modal ใหม่
watch(() => props.isOpen, (open) => {
  if (!open) return
  reason.value = 'restock'
  deltaSign.value = 1
  deltaAbs.value = 0
  note.value = ''
  errorMsg.value = ''
})

async function handleSubmit() {
  if (!props.product?.id) return
  if (!deltaAbs.value || deltaAbs.value <= 0) {
    errorMsg.value = 'กรุณาใส่จำนวนที่ต้องการปรับ'
    return
  }

  isSaving.value = true
  errorMsg.value = ''
  try {
    const finalDelta = deltaSign.value * deltaAbs.value
    await adjustStock(props.product.id, finalDelta, reason.value, note.value || undefined)
    emit('saved')
    emit('close')
  } catch (e: any) {
    errorMsg.value = e.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
