<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Save, X } from 'lucide-vue-next'
import CreatableSelect from '~/components/admin/CreatableSelect.vue'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { useProfitability } from '~/composables/useProfitability'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { db } from '~/db'
import type { Expense } from '~/types'

const props = defineProps<{
  isOpen: boolean
  editingExpense: Expense | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { addExpense, updateExpense } = useProfitability()
const authStore = useAuthStore()
const toast = useToast()
const { categories: expenseCategories, fetchAll: fetchExpenseCategories, addCategory } = useExpenseCategories()

const DEFAULT_UNITS = ['กรัม', 'กิโลกรัม', 'มิลลิลิตร', 'ลิตร', 'กล่อง', 'ชิ้น', 'แพ็ค', 'โหล', 'ถุง', 'ขวด']
const vendorOptions = ref<string[]>([])
const unitOptions = ref<string[]>([...DEFAULT_UNITS])

const categoryOptions = computed(() =>
  expenseCategories.value.map(c => ({ value: c.name, label: c.name, color: c.color }))
)
const vendorSelectOptions = computed(() => vendorOptions.value.map(v => ({ value: v, label: v })))
const unitSelectOptions = computed(() => unitOptions.value.map(u => ({ value: u, label: u })))

function randomColor() {
  const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316']
  return palette[Math.floor(Math.random() * palette.length)]
}

const legacyLabels: Record<string, string> = {
  ingredient: 'วัตถุดิบ', utility: 'ค่าน้ำ/ไฟ/แก๊ส', wage: 'ค่าจ้างพนักงาน',
  rent: 'ค่าเช่าที่', supplies: 'วัสดุสิ้นเปลือง', other: 'อื่นๆ'
}

function getCategoryName(expense: Expense) {
  if (expense.categoryId) {
    const cat = expenseCategories.value.find(c => c.id === expense.categoryId)
    if (cat) return cat.name
  }
  return legacyLabels[expense.category!] || 'อื่นๆ'
}

const isSubmitting = ref(false)

const form = ref({
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryName: '',
  categoryId: undefined as number | undefined,
  categoryUuid: '',
  category: undefined as any,
  amount: 0,
  description: '',
  vendor: '',
  unit: '',
  quantity: undefined as number | undefined,
})

function resetForm() {
  const defaultCat = expenseCategories.value[0]
  form.value = {
    expenseDate: new Date().toISOString().slice(0, 10),
    categoryName: defaultCat?.name || '',
    categoryId: defaultCat?.id,
    categoryUuid: defaultCat?.uuid || '',
    category: undefined as any,
    amount: 0,
    description: '',
    vendor: '',
    unit: '',
    quantity: undefined,
  }
}

async function loadVendorUnitOptions() {
  const all = await db.expenses.filter(e => !e.isDeleted && !!e.vendor).toArray()
  vendorOptions.value = [...new Set(all.map(e => e.vendor!).filter(Boolean))]
  const allUnits = await db.expenses.filter(e => !e.isDeleted && !!e.unit).toArray()
  unitOptions.value = [...new Set([...DEFAULT_UNITS, ...allUnits.map(e => e.unit!).filter(Boolean)])]
}

watch(() => props.isOpen, async (open) => {
  if (open) {
    if (!expenseCategories.value.length) await fetchExpenseCategories()
    if (props.editingExpense) {
      const e = props.editingExpense
      form.value = {
        expenseDate: e.expenseDate,
        categoryName: getCategoryName(e),
        categoryId: e.categoryId,
        categoryUuid: e.categoryUuid || '',
        category: e.category,
        amount: e.amount,
        description: e.description,
        vendor: e.vendor || '',
        unit: e.unit || '',
        quantity: e.quantity,
      }
    } else {
      resetForm()
    }
    loadVendorUnitOptions()
  }
})

function handleVendorCreate(name: string) {
  if (!vendorOptions.value.includes(name)) vendorOptions.value.push(name)
  form.value.vendor = name
}

function handleUnitCreate(name: string) {
  if (!unitOptions.value.includes(name)) unitOptions.value.push(name)
  form.value.unit = name
}

async function handleSubmit() {
  if (form.value.amount <= 0) {
    toast.error('กรุณาระบุจำนวนเงินให้ถูกต้อง')
    return
  }

  isSubmitting.value = true
  try {
    const user = authStore.currentUser

    let resolvedCategoryId = form.value.categoryId
    let resolvedCategoryUuid = form.value.categoryUuid
    if (form.value.categoryName) {
      let cat = expenseCategories.value.find(c => c.name === form.value.categoryName)
      if (!cat) {
        await addCategory(form.value.categoryName, randomColor())
        await fetchExpenseCategories()
        cat = expenseCategories.value.find(c => c.name === form.value.categoryName)
      }
      resolvedCategoryId = cat?.id
      resolvedCategoryUuid = cat?.uuid || ''
    }

    const payload = {
      expenseDate: form.value.expenseDate,
      categoryId: resolvedCategoryId,
      categoryUuid: resolvedCategoryUuid,
      description: form.value.description,
      vendor: form.value.vendor || undefined,
      unit: form.value.unit || undefined,
      quantity: form.value.quantity || undefined,
      amount: form.value.amount,
    }

    if (props.editingExpense) {
      await updateExpense(props.editingExpense.id!, { ...payload, updatedAt: new Date(), syncStatus: 'pending' })
      toast.success('อัปเดตข้อมูลรายจ่ายเรียบร้อยแล้ว')
    } else {
      await addExpense({
        ...payload,
        recordedBy: user?.displayName || 'Unknown',
        staffId: user?.id || 0,
        staffUuid: user?.uuid || '',
        syncStatus: 'pending'
      })
      toast.success('บันทึกรายจ่ายเรียบร้อยแล้ว')
    }

    emit('saved')
    emit('close')
  } catch (e) {
    console.error(e)
    toast.error('ดำเนินการไม่สำเร็จ')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/90">
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div v-if="isOpen" class="bg-surface-900 border border-surface-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <!-- Header -->
            <div class="px-8 pt-8 pb-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400">
                  <Save v-if="editingExpense" :size="20" />
                  <Plus v-else :size="20" />
                </div>
                <h3 class="text-xl font-black text-surface-50">
                  {{ editingExpense ? 'แก้ไขข้อมูลรายจ่าย' : 'บันทึกรายจ่ายใหม่' }}
                </h3>
              </div>
              <button
                @click="emit('close')"
                class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 rounded-xl flex items-center justify-center transition-colors"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="p-8 space-y-6">
              <!-- Date -->
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">วันที่จ่าย</label>
                <input
                  type="date"
                  v-model="form.expenseDate"
                  required
                  class="w-full h-14 bg-surface-800 border border-surface-700 rounded-2xl px-4 text-surface-50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Category -->
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">หมวดหมู่</label>
                  <CreatableSelect
                    :model-value="form.categoryName || null"
                    :options="categoryOptions"
                    placeholder="หมวดหมู่..."
                    @update:model-value="(v) => form.categoryName = v ?? ''"
                    @create="async (name) => { await addCategory(name, randomColor()); await fetchExpenseCategories(); form.categoryName = name }"
                  />
                </div>

                <!-- Amount -->
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    v-model.number="form.amount"
                    required
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full h-14 bg-surface-800 border border-surface-700 rounded-2xl px-4 text-surface-50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none font-black text-lg"
                  />
                </div>
              </div>

              <!-- Description -->
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">คำอธิบาย</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  placeholder="เช่น ซื้อมะนาว 5 กิโล, จ่ายค่าไฟเดือนเมษา"
                  class="w-full bg-surface-800 border border-surface-700 rounded-2xl p-4 text-surface-50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none resize-none"
                ></textarea>
              </div>

              <!-- Vendor + จำนวน + Unit -->
              <div class="grid grid-cols-3 gap-4">
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">Vendor (ร้านค้า)</label>
                  <CreatableSelect
                    :model-value="form.vendor || null"
                    :options="vendorSelectOptions"
                    placeholder="ร้านค้า/ผู้จำหน่าย..."
                    @update:model-value="(v) => form.vendor = v ?? ''"
                    @create="(name) => handleVendorCreate(name)"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">จำนวน</label>
                  <input
                    type="number"
                    v-model.number="form.quantity"
                    min="0"
                    step="0.01"
                    placeholder="เช่น 5"
                    class="w-full h-14 bg-surface-800 border border-surface-700 rounded-2xl px-4 text-surface-50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">หน่วย</label>
                  <CreatableSelect
                    :model-value="form.unit || null"
                    :options="unitSelectOptions"
                    placeholder="หน่วย..."
                    @update:model-value="(v) => form.unit = v ?? ''"
                    @create="(name) => handleUnitCreate(name)"
                  />
                </div>
              </div>

              <!-- Buttons -->
              <div class="pt-4 flex gap-3">
                <button
                  type="button"
                  @click="emit('close')"
                  class="flex-1 h-14 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-2xl transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="flex-[2] h-14 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-primary-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save v-if="!isSubmitting" :size="20" />
                  <span v-if="isSubmitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>{{ editingExpense ? 'ยืนยันการแก้ไข' : 'บันทึกข้อมูล' }}</span>
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
