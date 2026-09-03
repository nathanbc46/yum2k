<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
          class="w-full max-w-2xl max-h-[90vh] bg-surface-900 rounded-3xl border border-surface-800 shadow-2xl flex flex-col overflow-hidden"
          @mousedown.stop
        >
          <!-- Header -->
          <div class="p-6 border-b border-surface-800 flex items-center justify-between shrink-0">
            <div>
              <h2 class="text-xl font-black text-surface-50">รายจ่ายประจำ</h2>
              <p class="text-sm text-surface-500 mt-0.5">กำหนดรายจ่ายที่สร้างอัตโนมัติทุกวัน หรือทุกวันที่กำหนดของเดือน</p>
            </div>
            <button @click="$emit('close')" class="w-10 h-10 rounded-xl bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-50 transition-all">
              <X :size="20" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <!-- Form เพิ่ม/แก้ไข -->
            <div class="bg-surface-800/50 rounded-2xl p-5 border border-surface-700/50">
              <h3 class="text-sm font-bold text-surface-300 mb-4">{{ editingId ? 'แก้ไข Template' : 'เพิ่ม Template ใหม่' }}</h3>

              <div class="space-y-4">
                <!-- ชื่อรายจ่าย -->
                <div>
                  <label class="text-xs font-bold text-surface-400 mb-1.5 block">ชื่อรายจ่าย *</label>
                  <input
                    v-model="form.description"
                    type="text"
                    placeholder="เช่น น้ำแข็ง, ค่าเช่า"
                    class="w-full h-11 px-4 bg-surface-900 border border-surface-700 rounded-xl text-surface-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <!-- จำนวนเงิน + หน่วย -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-bold text-surface-400 mb-1.5 block">จำนวนเงิน (บาท) *</label>
                    <input
                      v-model.number="form.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      class="w-full h-11 px-4 bg-surface-900 border border-surface-700 rounded-xl text-surface-50 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-bold text-surface-400 mb-1.5 block">หมวดหมู่</label>
                    <select
                      v-model="form.categoryUuid"
                      class="w-full h-11 px-4 bg-surface-900 border border-surface-700 rounded-xl text-surface-50 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      <option v-for="cat in categories" :key="cat.uuid" :value="cat.uuid">{{ cat.name }}</option>
                    </select>
                  </div>
                </div>

                <!-- ความถี่ -->
                <div>
                  <label class="text-xs font-bold text-surface-400 mb-1.5 block">ความถี่</label>
                  <div class="flex gap-3">
                    <button
                      @click="form.frequency = 'daily'"
                      class="flex-1 h-11 rounded-xl border text-sm font-bold transition-all"
                      :class="form.frequency === 'daily'
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-surface-900 border-surface-700 text-surface-400 hover:border-surface-500'"
                    >
                      ทุกวัน
                    </button>
                    <button
                      @click="form.frequency = 'monthly'"
                      class="flex-1 h-11 rounded-xl border text-sm font-bold transition-all"
                      :class="form.frequency === 'monthly'
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-surface-900 border-surface-700 text-surface-400 hover:border-surface-500'"
                    >
                      ทุกเดือน
                    </button>
                  </div>
                </div>

                <!-- วันที่ของเดือน (แสดงเมื่อ monthly) -->
                <div v-if="form.frequency === 'monthly'">
                  <label class="text-xs font-bold text-surface-400 mb-1.5 block">วันที่ของเดือน (1–28)</label>
                  <input
                    v-model.number="form.dayOfMonth"
                    type="number"
                    min="1"
                    max="28"
                    placeholder="เช่น 1 = ทุกวันที่ 1 ของเดือน"
                    class="w-full h-11 px-4 bg-surface-900 border border-surface-700 rounded-xl text-surface-50 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <!-- Vendor + ปริมาณ -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-bold text-surface-400 mb-1.5 block">ร้านค้า/ผู้จำหน่าย</label>
                    <input
                      v-model="form.vendor"
                      type="text"
                      placeholder="ชื่อร้านค้า"
                      class="w-full h-11 px-4 bg-surface-900 border border-surface-700 rounded-xl text-surface-50 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-bold text-surface-400 mb-1.5 block">ปริมาณ / หน่วย</label>
                    <div class="flex gap-2">
                      <input
                        v-model.number="form.quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="จำนวน"
                        class="flex-1 h-11 px-3 bg-surface-900 border border-surface-700 rounded-xl text-surface-50 text-sm focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        v-model="form.unit"
                        type="text"
                        placeholder="หน่วย"
                        class="w-20 h-11 px-3 bg-surface-900 border border-surface-700 rounded-xl text-surface-50 text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <!-- ปุ่ม save/cancel -->
                <div class="flex gap-3 pt-1">
                  <button
                    v-if="editingId"
                    @click="resetForm"
                    class="h-11 px-5 bg-surface-800 hover:bg-surface-700 text-surface-300 font-bold rounded-xl transition-all border border-surface-700"
                  >
                    ยกเลิก
                  </button>
                  <button
                    @click="handleSave"
                    :disabled="!form.description || !form.amount"
                    class="flex-1 h-11 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                  >
                    {{ editingId ? 'บันทึกการแก้ไข' : 'เพิ่ม Template' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- รายการ Template ที่มีอยู่ -->
            <div v-if="templates.length > 0" class="space-y-2">
              <h3 class="text-sm font-bold text-surface-400 px-1">Templates ที่ตั้งค่าไว้</h3>
              <div
                v-for="tpl in templates"
                :key="tpl.id"
                class="bg-surface-800/50 rounded-xl p-4 border transition-all"
                :class="tpl.isActive ? 'border-surface-700/50' : 'border-surface-800 opacity-60'"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-surface-50 text-sm">{{ tpl.description }}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full font-bold"
                        :class="tpl.frequency === 'daily' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'"
                      >
                        {{ tpl.frequency === 'daily' ? 'ทุกวัน' : `ทุกวันที่ ${tpl.dayOfMonth}` }}
                      </span>
                      <span v-if="!tpl.isActive" class="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-500 font-bold">ปิดอยู่</span>
                    </div>
                    <div class="text-lg font-black text-primary-400 mt-1">฿{{ tpl.amount.toLocaleString() }}</div>
                    <div class="flex items-center gap-3 mt-1 text-xs text-surface-500 flex-wrap">
                      <span v-if="tpl.vendor">{{ tpl.vendor }}</span>
                      <span v-if="tpl.quantity && tpl.unit">{{ tpl.quantity }} {{ tpl.unit }}</span>
                      <span v-if="tpl.lastGeneratedDate">สร้างล่าสุด: {{ tpl.lastGeneratedDate }}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <!-- Toggle Active -->
                    <button
                      @click="handleToggle(tpl)"
                      class="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      :class="tpl.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-surface-700 text-surface-500 hover:bg-surface-600'"
                      :title="tpl.isActive ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'"
                    >
                      <component :is="tpl.isActive ? CheckCircle : Circle" :size="18" />
                    </button>
                    <!-- Edit -->
                    <button
                      @click="handleEdit(tpl)"
                      class="w-9 h-9 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-surface-50 flex items-center justify-center transition-all"
                    >
                      <Pencil :size="16" />
                    </button>
                    <!-- Delete -->
                    <button
                      @click="handleDelete(tpl)"
                      class="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                    >
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 text-surface-600 text-sm">
              ยังไม่มี Template รายจ่ายประจำ — เพิ่มได้จากฟอร์มด้านบน
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Pencil, Trash2, CheckCircle, Circle } from 'lucide-vue-next'
import { useRecurringExpenses } from '~/composables/useRecurringExpenses'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { useToast } from '~/composables/useToast'
import type { RecurringExpense, RecurringFrequency } from '~/types'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { loadRecurringExpenses, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, toggleActiveRecurringExpense } = useRecurringExpenses()
const { categories, fetchAll: loadCategories } = useExpenseCategories()
const toast = useToast()

const templates = ref<RecurringExpense[]>([])
const editingId = ref<number | null>(null)

const defaultForm = () => ({
  description: '',
  amount: 0,
  frequency: 'daily' as RecurringFrequency,
  dayOfMonth: undefined as number | undefined,
  categoryUuid: '',
  vendor: '',
  unit: '',
  quantity: undefined as number | undefined,
  isActive: true,
})
const form = ref(defaultForm())

async function refresh() {
  templates.value = await loadRecurringExpenses()
}

watch(() => props.isOpen, async (open) => {
  if (open) {
    await Promise.all([refresh(), loadCategories()])
    resetForm()
  }
})

function resetForm() {
  form.value = defaultForm()
  editingId.value = null
}

function handleEdit(tpl: RecurringExpense) {
  editingId.value = tpl.id!
  form.value = {
    description:  tpl.description,
    amount:       tpl.amount,
    frequency:    tpl.frequency,
    dayOfMonth:   tpl.dayOfMonth,
    categoryUuid: tpl.categoryUuid ?? '',
    vendor:       tpl.vendor ?? '',
    unit:         tpl.unit ?? '',
    quantity:     tpl.quantity,
    isActive:     tpl.isActive,
  }
}

async function handleSave() {
  if (!form.value.description || !form.value.amount) return

  // หา category name จาก uuid
  const cat = categories.value.find(c => c.uuid === form.value.categoryUuid)

  const data = {
    description:  form.value.description.trim(),
    amount:       form.value.amount,
    frequency:    form.value.frequency,
    dayOfMonth:   form.value.frequency === 'monthly' ? form.value.dayOfMonth : undefined,
    categoryUuid: form.value.categoryUuid || undefined,
    category:     cat?.name,
    vendor:       form.value.vendor || undefined,
    unit:         form.value.unit || undefined,
    quantity:     form.value.quantity || undefined,
    isActive:     true,
  }

  if (editingId.value) {
    await updateRecurringExpense(editingId.value, data)
    toast.success('แก้ไข Template สำเร็จ')
  } else {
    await addRecurringExpense(data)
    toast.success('เพิ่ม Template สำเร็จ')
  }

  resetForm()
  await refresh()
}

async function handleToggle(tpl: RecurringExpense) {
  await toggleActiveRecurringExpense(tpl.id!, !tpl.isActive)
  await refresh()
}

async function handleDelete(tpl: RecurringExpense) {
  await deleteRecurringExpense(tpl.id!)
  toast.info(`ลบ Template "${tpl.description}" แล้ว`)
  await refresh()
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
