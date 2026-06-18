<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { X, Plus, Trash2, Save, AlertTriangle, Maximize2, Minimize2 } from 'lucide-vue-next'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { useProfitability } from '~/composables/useProfitability'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { db } from '~/db'
import CreatableSelect from '~/components/admin/CreatableSelect.vue'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { categories: expenseCategories, fetchAll: fetchCategories, addCategory, deleteCategory } = useExpenseCategories()
const { addExpense } = useProfitability()
const authStore = useAuthStore()
const toast = useToast()

// ---------------------------------------------------------------------------
// Batch rows
// ---------------------------------------------------------------------------

interface BatchRow {
  categoryName: string | null
  description: string
  vendor: string
  unit: string
  quantity: string
  amount: string
}

const DEFAULT_UNITS = ['กรัม', 'กิโลกรัม', 'มิลลิลิตร', 'ลิตร', 'กล่อง', 'ชิ้น', 'แพ็ค', 'โหล', 'ถุง', 'ขวด']

const isExpanded = ref(false)
const today = new Date().toISOString().slice(0, 10)
const expenseDate = ref(today)
const rows = ref<BatchRow[]>([])
const isSubmitting = ref(false)
const vendorOptions = ref<string[]>([])
const unitOptions = ref<string[]>([...DEFAULT_UNITS])

function emptyRow(): BatchRow {
  return { categoryName: null, description: '', vendor: '', unit: '', quantity: '', amount: '' }
}

function initRows() {
  rows.value = Array.from({ length: 5 }, emptyRow)
}

function addRow() {
  rows.value.push(emptyRow())
}

function removeRow(index: number) {
  if (rows.value.length === 1) return
  rows.value.splice(index, 1)
}

// ---------------------------------------------------------------------------
// Select options
// ---------------------------------------------------------------------------

const categoryOptions = computed(() =>
  expenseCategories.value.map(c => ({
    value: c.name,
    label: c.name,
    color: c.color
  }))
)

const vendorSelectOptions = computed(() =>
  vendorOptions.value.map(v => ({ value: v, label: v }))
)

const unitSelectOptions = computed(() =>
  unitOptions.value.map(u => ({ value: u, label: u }))
)

function randomColor() {
  const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316']
  return palette[Math.floor(Math.random() * palette.length)]
}

// ---------------------------------------------------------------------------
// CreatableSelect handlers
// ---------------------------------------------------------------------------

async function handleCategoryCreate(name: string, rowIndex: number) {
  await addCategory(name, randomColor())
  const row = rows.value[rowIndex]
  if (row) row.categoryName = name
}

async function handleVendorCreate(name: string, rowIndex: number) {
  if (!vendorOptions.value.includes(name)) vendorOptions.value.push(name)
  const row = rows.value[rowIndex]
  if (row) row.vendor = name
}

async function handleUnitCreate(name: string, rowIndex: number) {
  if (!unitOptions.value.includes(name)) unitOptions.value.push(name)
  const row = rows.value[rowIndex]
  if (row) row.unit = name
}

// ---------------------------------------------------------------------------
// Delete + Replace modal
// ---------------------------------------------------------------------------

type DeleteType = 'category' | 'vendor' | 'unit'

interface DeleteModalState {
  isOpen: boolean
  type: DeleteType | null
  deletingValue: string
  replacementValue: string | null
  replaceOptions: { value: string; label: string; color?: string }[]
}

const deleteModal = ref<DeleteModalState>({
  isOpen: false,
  type: null,
  deletingValue: '',
  replacementValue: null,
  replaceOptions: []
})
const isDeleting = ref(false)

function handleCategoryDelete(name: string) {
  deleteModal.value = {
    isOpen: true,
    type: 'category',
    deletingValue: name,
    replacementValue: null,
    replaceOptions: categoryOptions.value.filter(o => o.value !== name)
  }
}

function handleVendorDelete(name: string) {
  deleteModal.value = {
    isOpen: true,
    type: 'vendor',
    deletingValue: name,
    replacementValue: null,
    replaceOptions: vendorSelectOptions.value.filter(o => o.value !== name)
  }
}

function handleUnitDelete(name: string) {
  deleteModal.value = {
    isOpen: true,
    type: 'unit',
    deletingValue: name,
    replacementValue: null,
    replaceOptions: unitSelectOptions.value.filter(o => o.value !== name)
  }
}

async function confirmDelete() {
  const { type, deletingValue, replacementValue } = deleteModal.value
  isDeleting.value = true

  try {
    if (type === 'category') {
      const deletingCat = expenseCategories.value.find(c => c.name === deletingValue)
      if (deletingCat) {
        if (replacementValue) {
          const replaceCat = expenseCategories.value.find(c => c.name === replacementValue)
          const affected = await db.expenses.where('categoryId').equals(deletingCat.id!).toArray()
          await Promise.all(affected.map(e =>
            db.expenses.update(e.id!, {
              categoryId: replaceCat?.id ?? undefined,
              categoryUuid: replaceCat?.uuid ?? undefined,
              syncStatus: 'pending'
            })
          ))
        }
        await deleteCategory(deletingCat.id!)
      }
      rows.value.forEach(r => {
        if (r.categoryName === deletingValue) r.categoryName = replacementValue ?? null
      })
      await fetchCategories()
    }

    if (type === 'vendor') {
      if (replacementValue) {
        const affected = await db.expenses.filter(e => e.vendor === deletingValue && !e.isDeleted).toArray()
        await Promise.all(affected.map(e =>
          db.expenses.update(e.id!, { vendor: replacementValue, syncStatus: 'pending' })
        ))
      }
      vendorOptions.value = vendorOptions.value.filter(v => v !== deletingValue)
      rows.value.forEach(r => { if (r.vendor === deletingValue) r.vendor = replacementValue ?? '' })
    }

    if (type === 'unit') {
      if (replacementValue) {
        const affected = await db.expenses.filter(e => e.unit === deletingValue && !e.isDeleted).toArray()
        await Promise.all(affected.map(e =>
          db.expenses.update(e.id!, { unit: replacementValue, syncStatus: 'pending' })
        ))
      }
      unitOptions.value = unitOptions.value.filter(u => u !== deletingValue)
      rows.value.forEach(r => { if (r.unit === deletingValue) r.unit = replacementValue ?? '' })
    }

    toast.success(`ลบ "${deletingValue}" เรียบร้อยแล้ว`)
    deleteModal.value.isOpen = false
  } catch (e) {
    console.error(e)
    toast.error('ลบไม่สำเร็จ กรุณาลองใหม่')
  } finally {
    isDeleting.value = false
  }
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

const validRows = computed(() =>
  rows.value.filter(r => r.amount && Number(r.amount) > 0)
)

async function handleSave() {
  if (!validRows.value.length) {
    toast.error('กรุณาระบุจำนวนเงินอย่างน้อย 1 รายการ')
    return
  }

  isSubmitting.value = true
  try {
    const user = authStore.currentUser

    const newCatNames = [...new Set(
      validRows.value
        .filter(r => r.categoryName && !expenseCategories.value.find(c => c.name === r.categoryName))
        .map(r => r.categoryName!)
    )]
    for (const name of newCatNames) {
      await addCategory(name, randomColor())
    }
    await fetchCategories()

    for (const row of validRows.value) {
      const cat = expenseCategories.value.find(c => c.name === row.categoryName)
      await addExpense({
        expenseDate: expenseDate.value,
        categoryId: cat?.id,
        categoryUuid: cat?.uuid,
        category: undefined as any,
        description: row.description,
        vendor: row.vendor || undefined,
        unit: row.unit || undefined,
        quantity: row.quantity ? Number(row.quantity) : undefined,
        amount: Number(row.amount),
        recordedBy: user?.displayName || 'Unknown',
        staffId: user?.id || 0,
        staffUuid: user?.uuid || '',
        syncStatus: 'pending'
      })
    }

    toast.success(`บันทึกรายจ่าย ${validRows.value.length} รายการเรียบร้อยแล้ว`)
    emit('saved')
    emit('close')
  } catch (e) {
    console.error(e)
    toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่')
  } finally {
    isSubmitting.value = false
  }
}

// ---------------------------------------------------------------------------
// Load options
// ---------------------------------------------------------------------------

async function loadVendorOptions() {
  const all = await db.expenses.filter(e => !e.isDeleted && !!e.vendor).toArray()
  vendorOptions.value = [...new Set(all.map(e => e.vendor!).filter(Boolean))]

  const allUnits = await db.expenses.filter(e => !e.isDeleted && !!e.unit).toArray()
  unitOptions.value = [...new Set([...DEFAULT_UNITS, ...allUnits.map(e => e.unit!).filter(Boolean)])]
}

watch(() => props.isOpen, async (val) => {
  if (val) {
    isExpanded.value = false
    initRows()
    expenseDate.value = today
    await fetchCategories()
    await loadVendorOptions()
  }
})

onMounted(() => {
  if (props.isOpen) {
    initRows()
    fetchCategories()
    loadVendorOptions()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="fixed inset-0 z-50">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-surface-950/90" />

        <!-- Modal Box -->
        <div
          class="absolute bg-surface-950 flex flex-col transition-all duration-300"
          :class="isExpanded
            ? 'inset-0'
            : 'inset-x-[12%] inset-y-[8%] rounded-[2rem] border border-surface-800 shadow-2xl'"
        >

        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-surface-800 bg-surface-900 shrink-0"
          :class="isExpanded ? '' : 'rounded-t-[2rem]'"
        >
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-bold text-surface-50">บันทึกรายจ่าย</h2>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-surface-400">วันที่:</label>
              <input
                v-model="expenseDate"
                type="date"
                class="text-sm px-3 py-2 border border-surface-700 rounded-lg bg-surface-800 text-surface-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              @click="handleSave"
              :disabled="isSubmitting"
              class="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 shadow"
              type="button"
            >
              <Save :size="16" />
              <span>{{ isSubmitting ? 'กำลังบันทึก...' : `บันทึก (${validRows.length} รายการ)` }}</span>
            </button>
            <button
              @click="isExpanded = !isExpanded"
              class="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-100 transition-colors"
              :title="isExpanded ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ'"
              type="button"
            >
              <Minimize2 v-if="isExpanded" :size="18" />
              <Maximize2 v-else :size="18" />
            </button>
            <button
              @click="emit('close')"
              class="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-100 transition-colors"
              type="button"
            >
              <X :size="20" />
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="flex-1 overflow-auto p-6">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-surface-800">
                <th class="w-10 px-3 py-3 text-left text-xs font-semibold text-surface-400 border border-surface-700">#</th>
                <th class="w-48 px-3 py-3 text-left text-xs font-semibold text-surface-400 border border-surface-700">หมวดหมู่</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-surface-400 border border-surface-700">คำอธิบาย</th>
                <th class="w-44 px-3 py-3 text-left text-xs font-semibold text-surface-400 border border-surface-700">Vendor (ร้านค้า)</th>
                <th class="w-28 px-3 py-3 text-right text-xs font-semibold text-surface-400 border border-surface-700">จำนวน</th>
                <th class="w-36 px-3 py-3 text-left text-xs font-semibold text-surface-400 border border-surface-700">หน่วย</th>
                <th class="w-36 px-3 py-3 text-right text-xs font-semibold text-surface-400 border border-surface-700">จำนวนเงิน (฿)</th>
                <th class="w-12 px-3 py-3 border border-surface-700"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in rows"
                :key="i"
                class="group transition-colors"
                :class="row.amount && Number(row.amount) > 0
                  ? 'bg-emerald-950/30 hover:bg-emerald-950/50'
                  : 'hover:bg-surface-800/50'"
              >
                <!-- # -->
                <td class="px-3 py-2 border border-surface-700 text-center text-xs text-surface-500 font-mono">
                  {{ i + 1 }}
                </td>

                <!-- Category -->
                <td class="px-2 py-1.5 border border-surface-700">
                  <CreatableSelect
                    :model-value="row.categoryName"
                    :options="categoryOptions"
                    placeholder="หมวดหมู่..."
                    :allow-delete="true"
                    @update:model-value="(v) => row.categoryName = v"
                    @create="(name) => handleCategoryCreate(name, i)"
                    @delete="handleCategoryDelete"
                  />
                </td>

                <!-- Description -->
                <td class="px-2 py-1.5 border border-surface-700">
                  <input
                    v-model="row.description"
                    type="text"
                    class="w-full px-2 py-1.5 text-sm border border-transparent rounded bg-transparent text-surface-100 placeholder-surface-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:bg-surface-800 outline-none transition-all hover:border-surface-600"
                    placeholder="คำอธิบาย เช่น ซื้อมะนาว 5 กิโล"
                  />
                </td>

                <!-- Vendor -->
                <td class="px-2 py-1.5 border border-surface-700">
                  <CreatableSelect
                    :model-value="row.vendor || null"
                    :options="vendorSelectOptions"
                    placeholder="ร้านค้า/ผู้จำหน่าย..."
                    :allow-delete="true"
                    @update:model-value="(v) => row.vendor = v ?? ''"
                    @create="(name) => handleVendorCreate(name, i)"
                    @delete="handleVendorDelete"
                  />
                </td>

                <!-- Quantity -->
                <td class="px-2 py-1.5 border border-surface-700">
                  <input
                    v-model="row.quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-2 py-1.5 text-sm text-right border border-transparent rounded bg-transparent text-surface-100 placeholder-surface-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:bg-surface-800 outline-none transition-all hover:border-surface-600"
                    placeholder="เช่น 5"
                  />
                </td>

                <!-- Unit -->
                <td class="px-2 py-1.5 border border-surface-700">
                  <CreatableSelect
                    :model-value="row.unit || null"
                    :options="unitSelectOptions"
                    placeholder="หน่วย..."
                    :allow-delete="true"
                    @update:model-value="(v) => row.unit = v ?? ''"
                    @create="(name) => handleUnitCreate(name, i)"
                    @delete="handleUnitDelete"
                  />
                </td>

                <!-- Amount -->
                <td class="px-2 py-1.5 border border-surface-700">
                  <input
                    v-model="row.amount"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-2 py-1.5 text-sm text-right border border-transparent rounded bg-transparent text-surface-100 placeholder-surface-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:bg-surface-800 outline-none transition-all hover:border-surface-600"
                    placeholder="0.00"
                  />
                </td>

                <!-- Delete row -->
                <td class="px-2 py-1.5 border border-surface-700 text-center">
                  <button
                    @click="removeRow(i)"
                    :disabled="rows.length === 1"
                    type="button"
                    class="p-1.5 rounded hover:bg-red-500/10 hover:text-red-400 text-surface-700 opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-all"
                  >
                    <Trash2 :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Add Row Button -->
          <button
            @click="addRow"
            type="button"
            class="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
          >
            <Plus :size="16" />
            <span>เพิ่มแถว</span>
          </button>
        </div>

        <!-- Footer summary -->
        <div class="px-6 py-3 border-t border-surface-800 bg-surface-900 flex items-center justify-between shrink-0" :class="isExpanded ? '' : 'rounded-b-[2rem]'">
          <p class="text-sm text-surface-500">
            กรอกแล้ว <span class="font-bold text-surface-200">{{ validRows.length }}</span> / {{ rows.length }} แถว
          </p>
          <p class="text-sm font-bold text-surface-400">
            รวม:
            <span class="text-indigo-400 text-base ml-1">
              ฿{{ validRows.reduce((s, r) => s + Number(r.amount), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}
            </span>
          </p>
        </div>

      </div>
      </div>
    </Transition>

    <!-- Replace Modal -->
    <Transition name="modal-fade">
      <div v-if="deleteModal.isOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75">
        <div class="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <!-- Header -->
          <div class="px-6 pt-6 pb-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle :size="20" class="text-red-400" />
              </div>
              <div>
                <h3 class="font-bold text-surface-50">ลบ "{{ deleteModal.deletingValue }}"</h3>
                <p class="text-sm text-surface-400 mt-1">
                  รายจ่ายที่ใช้
                  <span class="font-semibold text-surface-200">"{{ deleteModal.deletingValue }}"</span>
                  จะถูกเปลี่ยนเป็น:
                </p>
              </div>
            </div>
          </div>

          <!-- Replace select -->
          <div class="px-6 pb-4">
            <select
              v-model="deleteModal.replacementValue"
              class="w-full px-3 py-2.5 border border-surface-600 rounded-xl bg-surface-800 text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option :value="null">— ล้างค่า (ไม่เปลี่ยน) —</option>
              <option
                v-for="opt in deleteModal.replaceOptions"
                :key="opt.value"
                :value="opt.value"
              >{{ opt.label }}</option>
            </select>
            <p class="text-xs text-surface-500 mt-2">
              หากเลือก "ล้างค่า" รายจ่ายที่ใช้ค่านี้จะไม่มีหมวดหมู่/ค่านั้นๆ อีกต่อไป
            </p>
          </div>

          <!-- Actions -->
          <div class="px-6 pb-6 flex gap-3">
            <button
              type="button"
              @click="deleteModal.isOpen = false"
              class="flex-1 h-11 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-xl transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              @click="confirmDelete"
              :disabled="isDeleting"
              class="flex-1 h-11 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Trash2 :size="15" />
              <span>{{ isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

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
