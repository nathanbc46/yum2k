<template>
  <div class="flex-1 flex flex-col h-full bg-surface-950 overflow-hidden">
    <!-- Header -->
    <div class="p-6 bg-surface-900 border-b border-surface-800 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-400">
          <Banknote :size="24" />
        </div>
        <div>
          <h1 class="text-2xl font-black text-surface-50">จัดการรายจ่าย</h1>
          <p class="text-sm text-surface-500">บันทึกต้นทุนและค่าใช้จ่ายอื่นๆ ของร้าน</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
          @click="showReportModal = true"
          class="h-12 px-5 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 border border-surface-700"
        >
          <BarChart3 :size="20" />
          <span>รายงานรายเดือน</span>
        </button>
        <button 
          @click="showAddModal = true"
          class="h-12 px-6 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-primary-900/20"
        >
          <Plus :size="20" />
          <span>เพิ่มรายจ่าย</span>
        </button>
      </div>
    </div>

    <!-- Main Content: Expense List -->
    <div class="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
      <!-- Filter Bar -->
      <div class="flex items-center gap-4 bg-surface-900 p-4 rounded-2xl border border-surface-800 shrink-0">
        <div class="flex items-center gap-2 px-3 h-11 bg-surface-950 rounded-xl border border-surface-800">
          <span class="text-[10px] font-black text-surface-500 uppercase">เริ่ม</span>
          <input 
            type="date" 
            v-model="startDate"
            class="bg-transparent border-none text-surface-50 focus:ring-0 text-sm"
          />
        </div>
        <div class="flex items-center gap-2 px-3 h-11 bg-surface-950 rounded-xl border border-surface-800">
          <span class="text-[10px] font-black text-surface-500 uppercase">ถึง</span>
          <input 
            type="date" 
            v-model="endDate"
            class="bg-transparent border-none text-surface-50 focus:ring-0 text-sm"
          />
        </div>
        <div class="flex-1 flex items-center gap-2 px-4 h-11 bg-surface-950 rounded-xl border border-surface-800">
          <Filter :size="16" class="text-surface-600" />
          <select 
            v-model="filterCategory"
            class="bg-transparent border-none text-surface-50 focus:ring-0 w-full text-sm"
          >
            <option value="">ทุกหมวดหมู่</option>
            <option v-for="(label, key) in categoryLabels" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Expense Table Container -->
      <div class="flex-1 min-h-0 bg-surface-900 border border-surface-800 rounded-[2rem] overflow-hidden shadow-xl flex flex-col">
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-left border-collapse relative">
            <thead class="sticky top-0 z-10 bg-surface-800 shadow-sm">
              <tr>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">วันที่</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">หมวดหมู่</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">คำอธิบาย</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">ผู้บันทึก</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800 text-right">จำนวนเงิน</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800">
            <tr v-if="filteredExpenses.length === 0">
              <td colspan="6" class="px-6 py-20 text-center text-surface-600">
                <div class="flex flex-col items-center gap-4">
                  <Banknote :size="48" class="opacity-20" />
                  <p class="font-bold">ไม่พบข้อมูลรายจ่ายในช่วงนี้</p>
                </div>
              </td>
            </tr>
            <tr 
              v-for="expense in filteredExpenses" 
              :key="expense.id"
              class="hover:bg-surface-800/30 transition-colors group"
            >
              <td class="px-6 py-4 text-sm text-surface-400 font-medium">
                {{ formatThaiDate(expense.expenseDate) }}
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider"
                  :class="getCategoryStyles(expense.category)"
                >
                  {{ categoryLabels[expense.category] }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-surface-200 font-bold">
                {{ expense.description }}
              </td>
              <td class="px-6 py-4 text-sm text-surface-500">
                {{ expense.recordedBy }}
              </td>
              <td class="px-6 py-4 text-sm text-right font-black text-surface-50">
                ฿{{ expense.amount.toLocaleString() }}
              </td>
              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button 
                    @click="openEditModal(expense)"
                    class="p-2 text-surface-600 hover:text-primary-500 hover:bg-primary-500/10 rounded-xl transition-all"
                    title="แก้ไขรายจ่าย"
                  >
                    <Save :size="18" />
                  </button>
                  <button 
                    @click="handleDelete(expense)"
                    class="p-2 text-surface-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="ลบรายจ่าย"
                  >
                    <Trash2 :size="18" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="paginatedExpenses.length > 0" class="sticky bottom-0 bg-surface-800 shadow-[0_-1px_0_rgba(0,0,0,0.5)]">
            <tr>
              <td colspan="4" class="px-6 py-4 text-sm font-black text-surface-400 text-right uppercase">รวมรายจ่ายในหน้านี้:</td>
              <td class="px-6 py-4 text-xl font-black text-primary-400 text-right">
                ฿{{ pageTotalAmount.toLocaleString() }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="shrink-0 flex items-center justify-between bg-surface-900 px-6 py-4 border-t border-surface-800 rounded-b-[2rem]">
        <div class="text-xs text-surface-500 font-medium">
          แสดง {{ startIndex + 1 }} - {{ Math.min(endIndex, filteredExpenses.length) }} จากทั้งหมด {{ filteredExpenses.length }} รายการ
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="currentPage--" 
            :disabled="currentPage === 1"
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-800 text-surface-400 disabled:opacity-30 hover:bg-surface-700 transition-colors"
          >
            <ChevronLeft :size="20" />
          </button>
          <div class="flex items-center gap-1">
            <button 
              v-for="p in totalPages" 
              :key="p"
              @click="currentPage = p"
              class="w-10 h-10 rounded-xl font-black text-sm transition-all"
              :class="currentPage === p ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-500 hover:bg-surface-700'"
            >
              {{ p }}
            </button>
          </div>
          <button 
            @click="currentPage++" 
            :disabled="currentPage === totalPages"
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-800 text-surface-400 disabled:opacity-30 hover:bg-surface-700 transition-colors"
          >
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Add Expense -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div v-if="showAddModal" class="bg-surface-900 border border-surface-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <!-- Modal Header -->
              <div class="px-8 pt-8 pb-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400">
                    <Save v-if="editingId" :size="20" />
                    <Plus v-else :size="20" />
                  </div>
                  <h3 class="text-xl font-black text-surface-50">
                    {{ editingId ? 'แก้ไขข้อมูลรายจ่าย' : 'บันทึกรายจ่ายใหม่' }}
                  </h3>
                </div>
                <button 
                  @click="showAddModal = false"
                  class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X :size="20" />
                </button>
              </div>

              <!-- Form Content -->
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
                    <select 
                      v-model="form.category"
                      required
                      class="w-full h-14 bg-surface-800 border border-surface-700 rounded-2xl px-4 text-surface-50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none"
                    >
                      <option v-for="(label, key) in categoryLabels" :key="key" :value="key">
                        {{ label }}
                      </option>
                    </select>
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
                    required
                    rows="3"
                    placeholder="เช่น ซื้อมะนาว 5 กิโล, จ่ายค่าไฟเดือนเมษา"
                    class="w-full bg-surface-800 border border-surface-700 rounded-2xl p-4 text-surface-50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <!-- Footer Buttons -->
                <div class="pt-4 flex gap-3">
                  <button 
                    type="button"
                    @click="showAddModal = false"
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
                    <span>{{ editingId ? 'ยืนยันการแก้ไข' : 'บันทึกข้อมูล' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Modal: Monthly Report Chart -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showReportModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div v-if="showReportModal" class="bg-surface-900 border border-surface-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden">
              <!-- Modal Header -->
              <div class="px-8 pt-8 pb-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400">
                    <BarChart3 :size="20" />
                  </div>
                  <div>
                    <h3 class="text-xl font-black text-surface-50">สรุปรายจ่ายรายเดือน</h3>
                    <p class="text-xs text-surface-500">เปรียบเทียบมูลค่ารวมแยกตามเดือน</p>
                  </div>
                </div>
                <button 
                  @click="showReportModal = false"
                  class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X :size="20" />
                </button>
              </div>

              <!-- Chart Content -->
              <div class="p-8">
                <div class="bg-surface-950/50 border border-surface-800 rounded-3xl p-6 h-[400px]">
                  <ClientOnly>
                    <apexchart 
                      v-if="monthlyChartData.categories.length > 0"
                      type="bar"
                      height="100%"
                      :options="monthlyChartOptions"
                      :series="monthlyChartData.series"
                    />
                    <div v-else class="h-full flex flex-col items-center justify-center text-surface-600 gap-4">
                      <BarChart3 :size="48" class="opacity-20" />
                      <p class="font-bold">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
                    </div>
                  </ClientOnly>
                </div>
              </div>
              
              <div class="px-8 pb-8 flex justify-end">
                <button 
                  @click="showReportModal = false"
                  class="px-8 h-12 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-xl transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Banknote, Plus, Calendar, Filter, Trash2, X, Save, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-vue-next'
import { useProfitability } from '~/composables/useProfitability'
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import { db } from '~/db'
import type { Expense, ExpenseCategory } from '~/types'

definePageMeta({
  layout: 'admin'
})

const { addExpense, updateExpense } = useProfitability()
const authStore = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
const { lastPullTimestamp } = useMasterDataSync()

// --- State ---
const showAddModal = ref(false)
const showReportModal = ref(false)
const editingId = ref<number | null>(null)
const isSubmitting = ref(false)
const expenses = ref<Expense[]>([])
const currentYear = new Date().getFullYear() > 2400 ? new Date().getFullYear() - 543 : new Date().getFullYear()
const startDate = ref(`${currentYear}-01-01`)
const endDate = ref(`${currentYear}-12-31`)
const filterCategory = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

const form = ref({
  expenseDate: new Date().toISOString().slice(0, 10),
  category: 'ingredient' as ExpenseCategory,
  amount: 0,
  description: ''
})

const categoryLabels: Record<ExpenseCategory, string> = {
  ingredient: 'วัตถุดิบ',
  utility: 'ค่าน้ำ/ไฟ/แก๊ส',
  wage: 'ค่าจ้างพนักงาน',
  rent: 'ค่าเช่าที่',
  supplies: 'วัสดุสิ้นเปลือง',
  other: 'อื่นๆ'
}

// --- Methods ---
async function loadExpenses() {
  // กรองรายการที่ยังไม่ได้ถูกลบ (isDeleted เป็น false หรือ 0)
  const all = await db.expenses.reverse().toArray()
  expenses.value = all.filter(e => !e.isDeleted)
}

const filteredExpenses = computed(() => {
  return expenses.value.filter(exp => {
    const matchStart = !startDate.value || exp.expenseDate >= startDate.value
    const matchEnd = !endDate.value || exp.expenseDate <= endDate.value
    const matchCat = !filterCategory.value || exp.category === filterCategory.value
    return matchStart && matchEnd && matchCat
  })
})

const totalPages = computed(() => Math.ceil(filteredExpenses.value.length / itemsPerPage))
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage)
const endIndex = computed(() => startIndex.value + itemsPerPage)

const paginatedExpenses = computed(() => {
  return filteredExpenses.value.slice(startIndex.value, endIndex.value)
})

const pageTotalAmount = computed(() => {
  return paginatedExpenses.value.reduce((sum, exp) => sum + exp.amount, 0)
})

// --- Chart Data & Options ---
const monthlyChartData = computed(() => {
  const monthMap: Record<string, Record<ExpenseCategory, number>> = {}
  const allCats = Object.keys(categoryLabels) as ExpenseCategory[]
  
  expenses.value.forEach(e => {
    const month = e.expenseDate.slice(0, 7)
    if (!monthMap[month]) {
      const newMonthData = {} as Record<ExpenseCategory, number>
      allCats.forEach(c => newMonthData[c] = 0)
      monthMap[month] = newMonthData
    }
    monthMap[month]![e.category] += e.amount
  })
  
  const sortedMonths = Object.keys(monthMap).sort().slice(-12)
  
  const series = allCats.map(cat => ({
    name: categoryLabels[cat],
    data: sortedMonths.map(m => monthMap[m]![cat] || 0)
  }))
    
  return {
    categories: sortedMonths.map(m => {
      const [y, mm] = m.split('-')
      return new Date(Number(y), Number(mm) - 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
    }),
    series
  }
})

const monthlyChartOptions = computed(() => ({
  chart: { 
    type: 'bar',
    stacked: true,
    toolbar: { show: false }, 
    background: 'transparent',
    fontFamily: 'Inter, sans-serif',
    foreColor: '#a8a29e'
  },
  colors: ['#06b6d4', '#3b82f6', '#f97316', '#a855f7', '#0891b2', '#64748b'], // เรียงตามหมวดหมู่
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: '50%',
      dataLabels: {
        total: {
          enabled: true,
          style: {
            fontSize: '11px',
            fontWeight: '900',
            color: '#06b6d4'
          },
          formatter: (v: number) => `฿${v.toLocaleString()}`
        }
      }
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number, opts: any) => {
      if (val < 500) return '' // ซ่อนถ้าค่าน้อยเกินไปเพื่อไม่ให้เบียดกัน
      const name = opts.w.globals.seriesNames[opts.seriesIndex]
      return `${name}\n฿${val.toLocaleString()}`
    },
    style: { 
      fontSize: '9px', 
      fontWeight: 'bold', 
      colors: ['#fff'] 
    },
    dropShadow: { enabled: true, blur: 1, opacity: 0.5 }
  },
  xaxis: {
    categories: monthlyChartData.value.categories,
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: { formatter: (v: number) => `฿${v.toLocaleString()}` }
  },
  grid: { borderColor: '#292524', strokeDashArray: 4 },
  legend: { position: 'top', horizontalAlign: 'right' },
  tooltip: { 
    theme: 'dark',
    y: { formatter: (v: number) => `฿${v.toLocaleString()}` }
  }
}))

// รีเซ็ตหน้าเมื่อตัวกรองเปลี่ยน
watch([startDate, endDate, filterCategory], () => {
  currentPage.value = 1
})

function getCategoryStyles(category: ExpenseCategory) {
  const styles: Record<ExpenseCategory, string> = {
    ingredient: 'bg-primary-500/10 text-primary-400',
    utility: 'bg-blue-500/10 text-blue-400',
    wage: 'bg-orange-500/10 text-orange-400',
    rent: 'bg-purple-500/10 text-purple-400',
    supplies: 'bg-cyan-500/10 text-cyan-400',
    other: 'bg-surface-700 text-surface-400'
  }
  return styles[category] || styles.other
}

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: '2-digit' 
  })
}

async function handleSubmit() {
  if (form.value.amount <= 0) {
    toast.error('กรุณาระบุจำนวนเงินให้ถูกต้อง')
    return
  }

  isSubmitting.value = true
  try {
    const user = authStore.currentUser
    
    if (editingId.value) {
      // โหมดแก้ไข
      await updateExpense(editingId.value, {
        ...form.value,
        updatedAt: new Date(),
        syncStatus: 'pending'
      })
      toast.success('อัปเดตข้อมูลรายจ่ายเรียบร้อยแล้ว')
    } else {
      // โหมดเพิ่มใหม่
      await addExpense({
        ...form.value,
        recordedBy: user?.displayName || 'Unknown',
        staffId: user?.id || 0,
        staffUuid: user?.uuid || '',
        syncStatus: 'pending'
      })
      toast.success('บันทึกรายจ่ายเรียบร้อยแล้ว')
    }

    showAddModal.value = false
    resetForm()
    await loadExpenses()
  } catch (e) {
    console.error(e)
    toast.error('ดำเนินการไม่สำเร็จ')
  } finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  editingId.value = null
  form.value = {
    expenseDate: new Date().toISOString().slice(0, 10),
    category: 'ingredient',
    amount: 0,
    description: ''
  }
}

function openEditModal(expense: Expense) {
  editingId.value = expense.id!
  form.value = {
    expenseDate: expense.expenseDate,
    category: expense.category,
    amount: expense.amount,
    description: expense.description
  }
  showAddModal.value = true
}

// ล้างฟอร์มเมื่อปิด Modal
watch(showAddModal, (val) => {
  if (!val) {
    setTimeout(resetForm, 300) // รอ Transition จบก่อนล้าง
  }
})

async function handleDelete(expense: Expense) {
  const confirmed = await confirm({
    title: 'ยืนยันการลบรายจ่าย',
    message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายการ "${expense.description}"?\n(ยอดเงิน ฿${expense.amount.toLocaleString()})`,
    confirmText: 'ลบรายการ',
    type: 'danger'
  })
  if (!confirmed) return

  try {
    await db.expenses.update(expense.id!, { 
      isDeleted: true,
      updatedAt: new Date()
    })
    toast.success('ลบรายการเรียบร้อยแล้ว')
    await loadExpenses()
  } catch (e) {
    toast.error('ลบไม่สำเร็จ')
  }
}

// โหลดข้อมูลเมื่อมีการ Pull จาก Cloud
watch(lastPullTimestamp, () => {
  loadExpenses()
})

onMounted(() => {
  loadExpenses()
})
</script>
