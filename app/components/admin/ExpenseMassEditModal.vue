<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Save } from 'lucide-vue-next'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { useToast } from '~/composables/useToast'
import { db } from '~/db'
import type { Expense } from '~/types'

const props = defineProps<{
  isOpen: boolean
  expenseIds: number[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const toast = useToast()
const { categories: expenseCategories, fetchAll: fetchExpenseCategories } = useExpenseCategories()

const DEFAULT_UNITS = ['กรัม', 'กิโลกรัม', 'มิลลิลิตร', 'ลิตร', 'กล่อง', 'ชิ้น', 'แพ็ค', 'โหล', 'ถุง', 'ขวด']

const isSaving = ref(false)
const vendorOptions = ref<string[]>([])
const unitOptions = ref<string[]>([...DEFAULT_UNITS])

const enableDate = ref(false)
const enableCategory = ref(false)
const enableVendor = ref(false)
const enableUnit = ref(false)

const fieldDate = ref('')
const fieldCategoryId = ref<number | null>(null)
const fieldVendor = ref('')
const fieldUnit = ref('')

const expenseCount = computed(() => props.expenseIds.length)

const hasAnyChange = computed(() =>
  enableDate.value || enableCategory.value || enableVendor.value || enableUnit.value
)

watch(() => props.isOpen, async (open) => {
  if (!open) return
  enableDate.value = false
  enableCategory.value = false
  enableVendor.value = false
  enableUnit.value = false
  fieldDate.value = ''
  fieldCategoryId.value = null
  fieldVendor.value = ''
  fieldUnit.value = ''

  await fetchExpenseCategories()

  const all = await db.expenses.filter(e => !e.isDeleted).toArray()
  vendorOptions.value = [...new Set(all.map(e => e.vendor).filter((v): v is string => !!v))].sort()
  unitOptions.value = [...new Set([...DEFAULT_UNITS, ...all.map(e => e.unit).filter((v): v is string => !!v)])]
})

async function handleSave() {
  if (!hasAnyChange.value || isSaving.value) return
  isSaving.value = true
  try {
    const now = new Date()
    for (const id of props.expenseIds) {
      const payload: Partial<Expense> = { syncStatus: 'pending', updatedAt: now }
      if (enableDate.value && fieldDate.value) {
        payload.expenseDate = fieldDate.value
      }
      if (enableCategory.value && fieldCategoryId.value !== null) {
        const cat = expenseCategories.value.find(c => c.id === fieldCategoryId.value)
        if (cat) {
          payload.categoryId = cat.id
          payload.categoryUuid = cat.uuid || ''
        }
      }
      if (enableVendor.value) {
        payload.vendor = fieldVendor.value || undefined
      }
      if (enableUnit.value) {
        payload.unit = fieldUnit.value || undefined
      }
      await db.expenses.update(id, payload)
    }
    toast.success(`แก้ไข ${props.expenseIds.length} รายการเรียบร้อย`)
    emit('saved')
  } catch (err: any) {
    toast.error('แก้ไขล้มเหลว: ' + err.message)
  } finally {
    isSaving.value = false
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
        @click.self="$emit('close')"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div v-if="isOpen" class="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div>
                <h2 class="text-lg font-bold text-surface-50">แก้ไขหมู่</h2>
                <p class="text-xs text-surface-500 mt-0.5">เลือกแล้ว {{ expenseCount }} รายการ</p>
              </div>
              <button @click="$emit('close')" class="text-surface-400 hover:text-surface-200 p-2 rounded-xl hover:bg-surface-800 transition-colors">
                <X :size="20" />
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
              <p class="text-sm text-surface-400">เลือก field ที่ต้องการแก้ไข (field ที่ไม่ได้ติ๊กจะไม่ถูกเปลี่ยน)</p>

              <!-- วันที่จ่าย -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enableDate" class="w-4 h-4 accent-primary-500 mt-2.5 rounded shrink-0" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">วันที่จ่าย</label>
                  <input
                    type="date"
                    v-model="fieldDate"
                    :disabled="!enableDate"
                    class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-3 text-surface-50 disabled:opacity-40 disabled:cursor-not-allowed focus:border-primary-500 focus:outline-none transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              <!-- หมวดหมู่ -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enableCategory" class="w-4 h-4 accent-primary-500 mt-2.5 rounded shrink-0" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">หมวดหมู่</label>
                  <select
                    v-model.number="fieldCategoryId"
                    :disabled="!enableCategory"
                    class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-3 text-surface-50 disabled:opacity-40 disabled:cursor-not-allowed focus:border-primary-500 focus:outline-none transition-colors [color-scheme:dark]"
                  >
                    <option :value="null">-- เลือกหมวดหมู่ --</option>
                    <option v-for="cat in expenseCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Vendor -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enableVendor" class="w-4 h-4 accent-primary-500 mt-2.5 rounded shrink-0" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">Vendor (ร้านค้า)</label>
                  <select
                    v-model="fieldVendor"
                    :disabled="!enableVendor"
                    class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-3 text-surface-50 disabled:opacity-40 disabled:cursor-not-allowed focus:border-primary-500 focus:outline-none transition-colors [color-scheme:dark]"
                  >
                    <option value="">-- เลือก Vendor --</option>
                    <option v-for="v in vendorOptions" :key="v" :value="v">{{ v }}</option>
                  </select>
                </div>
              </div>

              <!-- หน่วย -->
              <div class="flex items-start gap-3">
                <input type="checkbox" v-model="enableUnit" class="w-4 h-4 accent-primary-500 mt-2.5 rounded shrink-0" />
                <div class="flex-1">
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">หน่วย</label>
                  <select
                    v-model="fieldUnit"
                    :disabled="!enableUnit"
                    class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-3 text-surface-50 disabled:opacity-40 disabled:cursor-not-allowed focus:border-primary-500 focus:outline-none transition-colors [color-scheme:dark]"
                  >
                    <option value="">-- เลือกหน่วย --</option>
                    <option v-for="u in unitOptions" :key="u" :value="u">{{ u }}</option>
                  </select>
                </div>
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
                <span v-if="isSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <Save v-else :size="16" />
                {{ isSaving ? 'กำลังบันทึก...' : `บันทึก (${expenseCount} รายการ)` }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
