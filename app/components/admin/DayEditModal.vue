<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Save, Trash2, X, Maximize2, Minimize2 } from 'lucide-vue-next'
import CreatableSelect from '~/components/admin/CreatableSelect.vue'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { db } from '~/db'
import { v4 as uuidv4 } from 'uuid'
import type { Expense } from '~/types'

const props = defineProps<{
  isOpen: boolean
  date: string | null
  expenses: Expense[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const authStore = useAuthStore()
const toast = useToast()
const { categories: expenseCategories, fetchAll: fetchExpenseCategories, addCategory } = useExpenseCategories()

const DEFAULT_UNITS = ['กรัม', 'กิโลกรัม', 'มิลลิลิตร', 'ลิตร', 'กล่อง', 'ชิ้น', 'แพ็ค', 'โหล', 'ถุง', 'ขวด']
const vendorOptions = ref<string[]>([])
const unitOptions = ref<string[]>([...DEFAULT_UNITS])

const categoryOptions = computed(() => expenseCategories.value.map(c => ({ value: c.name, label: c.name, color: c.color })))
const vendorSelectOptions = computed(() => vendorOptions.value.map(v => ({ value: v, label: v })))
const unitSelectOptions = computed(() => unitOptions.value.map(u => ({ value: u, label: u })))

interface DayEditRow {
  id?: number
  categoryName: string
  categoryId: number | undefined
  categoryUuid: string
  description: string
  vendor: string
  unit: string
  quantity: number | undefined
  amount: number
  _deleted: boolean
  _isNew: boolean
}

const expanded = ref(false)
const rows = ref<DayEditRow[]>([])
const saving = ref(false)

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

function randomColor() {
  const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316']
  return palette[Math.floor(Math.random() * palette.length)]
}

async function initRows() {
  if (!expenseCategories.value.length) await fetchExpenseCategories()
  rows.value = props.expenses.map(e => ({
    id: e.id!,
    categoryName: getCategoryName(e),
    categoryId: e.categoryId,
    categoryUuid: e.categoryUuid || '',
    description: e.description,
    vendor: e.vendor || '',
    unit: e.unit || '',
    quantity: e.quantity,
    amount: e.amount,
    _deleted: false,
    _isNew: false,
  }))
}

async function loadLocalVendorUnitOptions() {
  const all = await db.expenses.filter(e => !e.isDeleted && !!e.vendor).toArray()
  vendorOptions.value = [...new Set(all.map(e => e.vendor!).filter(Boolean))]
  const allUnits = await db.expenses.filter(e => !e.isDeleted && !!e.unit).toArray()
  unitOptions.value = [...new Set([...DEFAULT_UNITS, ...allUnits.map(e => e.unit!).filter(Boolean)])]
}

watch(() => props.isOpen, async (open) => {
  if (open) {
    expanded.value = false
    await initRows()
    loadLocalVendorUnitOptions()
  }
})

function addRow() {
  const defaultCat = expenseCategories.value[0]
  rows.value.push({
    categoryName: defaultCat?.name || '',
    categoryId: defaultCat?.id,
    categoryUuid: defaultCat?.uuid || '',
    description: '',
    vendor: '',
    unit: '',
    quantity: undefined,
    amount: 0,
    _deleted: false,
    _isNew: true,
  })
}

function handleVendorCreate(name: string, row: DayEditRow) {
  if (!vendorOptions.value.includes(name)) vendorOptions.value.push(name)
  row.vendor = name
}

function handleUnitCreate(name: string, row: DayEditRow) {
  if (!unitOptions.value.includes(name)) unitOptions.value.push(name)
  row.unit = name
}

const total = computed(() =>
  rows.value.filter(r => !r._deleted).reduce((sum, r) => sum + (r.amount || 0), 0)
)

const saveCount = computed(() => {
  const deletes = rows.value.filter(r => r._deleted && !r._isNew).length
  const creates = rows.value.filter(r => r._isNew && !r._deleted && r.amount > 0).length
  const updates = rows.value.filter(r => !r._isNew && !r._deleted).length
  return deletes + creates + updates
})

async function save() {
  saving.value = true
  try {
    const user = authStore.currentUser
    const toDelete = rows.value.filter(r => r._deleted && !r._isNew)
    const toUpdate = rows.value.filter(r => !r._deleted && !r._isNew)
    const toCreate = rows.value.filter(r => r._isNew && !r._deleted && r.amount > 0)

    await Promise.all([
      ...toDelete.map(r =>
        db.expenses.update(r.id!, { isDeleted: true, syncStatus: 'pending', updatedAt: new Date() })
      ),
      ...toUpdate.map(r => {
        const cat = expenseCategories.value.find(c => c.name === r.categoryName)
        return db.expenses.update(r.id!, {
          categoryId: cat?.id ?? r.categoryId,
          categoryUuid: cat?.uuid ?? r.categoryUuid ?? undefined,
          description: r.description,
          vendor: r.vendor || undefined,
          unit: r.unit || undefined,
          quantity: r.quantity || undefined,
          amount: r.amount,
          syncStatus: 'pending' as const,
          updatedAt: new Date(),
        })
      }),
      ...toCreate.map(r => {
        const cat = expenseCategories.value.find(c => c.name === r.categoryName)
        return db.expenses.add({
          uuid: uuidv4(),
          expenseDate: props.date!,
          categoryId: cat?.id,
          categoryUuid: cat?.uuid,
          description: r.description,
          vendor: r.vendor || undefined,
          unit: r.unit || undefined,
          quantity: r.quantity || undefined,
          amount: r.amount,
          recordedBy: user?.displayName || 'Unknown',
          staffId: user?.id || 0,
          staffUuid: user?.uuid || '',
          isDeleted: false,
          syncStatus: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Expense)
      }),
    ])

    toast.success('บันทึกสำเร็จ')
    emit('saved')
    emit('close')
  } catch {
    toast.error('บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
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
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div
            v-if="isOpen"
            class="bg-surface-900 border border-surface-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
            :class="expanded
              ? 'fixed inset-3 rounded-[1.5rem]'
              : 'relative w-full max-w-4xl max-h-[90vh] rounded-[2rem]'"
          >
            <!-- Header -->
            <div class="px-7 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-surface-800">
              <div>
                <h3 class="text-xl font-black text-surface-50">แก้ไขรายจ่าย: {{ date ? formatThaiDate(date) : '' }}</h3>
                <p class="text-xs text-surface-500 mt-0.5">{{ rows.filter(r => !r._deleted).length }} รายการ</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="expanded = !expanded"
                  class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 rounded-xl flex items-center justify-center transition-colors"
                  :title="expanded ? 'ย่อหน้าต่าง' : 'ขยายหน้าต่าง'"
                >
                  <Minimize2 v-if="expanded" :size="18" />
                  <Maximize2 v-else :size="18" />
                </button>
                <button
                  @click="emit('close')"
                  class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X :size="20" />
                </button>
              </div>
            </div>

            <!-- Table -->
            <div class="flex-1 overflow-auto">
              <table class="w-full text-left text-sm border-separate border-spacing-0">
                <thead class="sticky top-0 z-10 bg-surface-800">
                  <tr class="text-[10px] font-black uppercase tracking-widest text-surface-500">
                    <th class="px-4 py-3 border-b border-surface-700">หมวดหมู่</th>
                    <th class="px-4 py-3 border-b border-surface-700">คำอธิบาย</th>
                    <th class="px-4 py-3 border-b border-surface-700">Vendor</th>
                    <th class="px-4 py-3 border-b border-surface-700 text-right w-28">จำนวน</th>
                    <th class="px-4 py-3 border-b border-surface-700">หน่วย</th>
                    <th class="px-4 py-3 border-b border-surface-700 text-right w-36">จำนวนเงิน</th>
                    <th class="px-4 py-3 border-b border-surface-700 text-center w-16">ลบ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-800">
                  <tr
                    v-for="(row, idx) in rows"
                    :key="row.id ?? `new-${idx}`"
                    class="transition-colors"
                    :class="row._deleted ? 'opacity-40 bg-red-500/5' : row._isNew ? 'bg-emerald-500/5' : 'hover:bg-surface-800/30'"
                  >
                    <!-- Category -->
                    <td class="px-4 py-2 min-w-[150px]">
                      <CreatableSelect
                        :model-value="row.categoryName || null"
                        :options="categoryOptions"
                        :disabled="row._deleted"
                        placeholder="หมวดหมู่..."
                        @update:model-value="(v) => { row.categoryName = v ?? '' }"
                        @create="async (name) => { await addCategory(name, randomColor()); await fetchExpenseCategories(); row.categoryName = name }"
                      />
                    </td>

                    <!-- Description -->
                    <td class="px-4 py-2 min-w-[180px]">
                      <input
                        type="text"
                        v-model="row.description"
                        :disabled="row._deleted"
                        class="w-full h-9 bg-surface-800 border border-surface-700 rounded-lg px-3 text-surface-50 text-xs focus:ring-1 focus:ring-primary-500 outline-none disabled:opacity-50"
                        :class="row._deleted ? 'line-through' : ''"
                      />
                    </td>

                    <!-- Vendor -->
                    <td class="px-4 py-2 min-w-[150px]">
                      <CreatableSelect
                        :model-value="row.vendor || null"
                        :options="vendorSelectOptions"
                        :disabled="row._deleted"
                        placeholder="ร้านค้า..."
                        @update:model-value="(v) => { row.vendor = v ?? '' }"
                        @create="(name) => handleVendorCreate(name, row)"
                      />
                    </td>

                    <!-- Quantity -->
                    <td class="px-4 py-2">
                      <input
                        type="number"
                        v-model.number="row.quantity"
                        :disabled="row._deleted"
                        min="0"
                        step="0.01"
                        placeholder="เช่น 5"
                        class="w-full h-9 bg-surface-800 border border-surface-700 rounded-lg px-3 text-surface-50 text-xs text-right focus:ring-1 focus:ring-primary-500 outline-none disabled:opacity-50"
                      />
                    </td>

                    <!-- Unit -->
                    <td class="px-4 py-2 min-w-[120px]">
                      <CreatableSelect
                        :model-value="row.unit || null"
                        :options="unitSelectOptions"
                        :disabled="row._deleted"
                        placeholder="หน่วย..."
                        @update:model-value="(v) => { row.unit = v ?? '' }"
                        @create="(name) => handleUnitCreate(name, row)"
                      />
                    </td>

                    <!-- Amount -->
                    <td class="px-4 py-2">
                      <input
                        type="number"
                        v-model.number="row.amount"
                        :disabled="row._deleted"
                        min="0"
                        step="0.01"
                        class="w-full h-9 bg-surface-800 border border-surface-700 rounded-lg px-3 text-surface-50 text-xs font-bold text-right focus:ring-1 focus:ring-primary-500 outline-none disabled:opacity-50"
                      />
                    </td>

                    <!-- Delete Toggle -->
                    <td class="px-4 py-2 text-center">
                      <button
                        v-if="!row._deleted"
                        @click="row._deleted = true"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors mx-auto"
                        title="ลบรายการ"
                      >
                        <Trash2 :size="15" />
                      </button>
                      <button
                        v-else
                        @click="row._deleted = false"
                        class="text-[10px] font-bold text-surface-500 hover:text-surface-300 transition-colors"
                      >
                        ยกเลิก
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="px-7 py-4 border-t border-surface-800 bg-surface-900/50 flex items-center justify-between shrink-0 gap-4">
              <div class="flex items-center gap-5">
                <div class="flex flex-col gap-0.5">
                  <span class="text-[10px] font-black uppercase tracking-widest text-surface-500">ยอดรวม (หลังลบ)</span>
                  <span class="text-xl font-black text-primary-400">฿{{ total.toLocaleString() }}</span>
                </div>
                <button
                  @click="addRow"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95"
                >
                  <Plus :size="16" /> เพิ่มรายการ
                </button>
              </div>
              <div class="flex items-center gap-3">
                <button
                  @click="emit('close')"
                  class="px-6 py-3 rounded-2xl text-sm font-bold text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
                >
                  ปิด
                </button>
                <button
                  @click="save"
                  :disabled="saving || saveCount === 0"
                  class="px-8 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xl shadow-primary-900/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <Save v-else :size="16" />
                  <span>บันทึก{{ saveCount > 0 ? ` (${saveCount} รายการ)` : '' }}</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
