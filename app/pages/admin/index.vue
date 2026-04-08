<template>
  <div class="p-6 h-full flex flex-col overflow-hidden bg-surface-950 text-surface-50">
    
    <!-- Header: Period Selector -->
    <div class="flex items-center justify-between mb-6 shrink-0">
      <div>
        <h1 class="text-2xl font-bold">📊 หน้าแรก (Dashboard)</h1>
        <p class="text-sm text-surface-400 mt-1">สรุปยอดขายและภาพรวมของร้าน</p>
      </div>

      <div class="flex items-center gap-4">
        <NuxtLink 
          to="/admin/reports"
          class="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded-xl border border-primary-500/30 text-sm font-bold transition-all"
        >
          <span>📈</span>
          <span>ดูรายงานแบบละเอียด</span>
        </NuxtLink>

        <div class="flex items-center gap-2 bg-surface-900 p-1 rounded-xl border border-surface-800">
          <button 
            v-for="p in periods" 
            :key="p.id"
            @click="selectPeriod(p.id)"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="selectedPeriod === p.id ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto pr-2 scrollbar-thin">
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-surface-400">
        <span class="text-4xl animate-spin mb-4">⌛</span>
        <p>กำลังโหลดสถิติ...</p>
      </div>

      <template v-else>
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- Revenue -->
          <div class="bg-surface-900 rounded-2xl p-4 sm:p-5 border border-surface-800 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-2xl transition-transform group-hover:scale-150" />
            <div class="text-surface-400 text-[10px] sm:text-sm font-medium mb-1 relative uppercase tracking-wider">ยอดขายรวม</div>
            <div class="text-2xl sm:text-3xl font-black text-success relative">฿{{ summary.revenue.toLocaleString() }}</div>
          </div>
          
          <!-- Profit -->
          <div class="bg-surface-900 rounded-2xl p-4 sm:p-5 border border-surface-800 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl transition-transform group-hover:scale-150" />
            <div class="text-surface-400 text-[10px] sm:text-sm font-medium mb-1 relative uppercase tracking-wider">กำไรขั้นต้น</div>
            <div class="text-2xl sm:text-3xl font-black text-primary-400 relative">฿{{ summary.profit.toLocaleString() }}</div>
          </div>

          <!-- Cost -->
          <div class="bg-surface-900 rounded-2xl p-4 sm:p-5 border border-surface-800 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-warning/10 rounded-full blur-2xl transition-transform group-hover:scale-150" />
            <div class="text-surface-400 text-[10px] sm:text-sm font-medium mb-1 relative uppercase tracking-wider">ต้นทุนสินค้า</div>
            <div class="text-2xl sm:text-3xl font-black text-warning relative">฿{{ summary.cost.toLocaleString() }}</div>
          </div>

          <!-- Bills -->
          <div class="bg-surface-900 rounded-2xl p-4 sm:p-5 border border-surface-800 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-info/10 rounded-full blur-2xl transition-transform group-hover:scale-150" />
            <div class="text-surface-400 text-[10px] sm:text-sm font-medium mb-1 relative uppercase tracking-wider">จำนวนบิลสุทธิ</div>
            <div class="text-2xl sm:text-3xl font-black text-info relative">{{ summary.orderCount.toLocaleString() }} <span class="text-xs sm:text-base font-normal">บิล</span></div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Top Products -->
          <div class="bg-surface-900 rounded-2xl border border-surface-800 flex flex-col h-96">
            <div class="px-5 py-4 border-b border-surface-800 flex justify-between items-center">
              <h2 class="font-bold flex items-center gap-2">⭐ สินค้าขายดี (Top 10)</h2>
            </div>
            <div class="flex-1 overflow-y-auto p-2 scrollbar-thin">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="text-surface-500 sticky top-0 bg-surface-900">
                    <th class="py-3 px-4 font-medium rounded-tl-lg">อันดับ</th>
                    <th class="py-3 px-4 font-medium">ชื่อสินค้า</th>
                    <th class="py-3 px-4 font-medium text-right">จำนวนขาย</th>
                    <th class="py-3 px-4 font-medium text-right rounded-tr-lg">ยอดขาย</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="topProducts.length === 0">
                    <td colspan="4" class="text-center py-8 text-surface-500">ไม่มีข้อมูลการขายในช่วงเวลานี้</td>
                  </tr>
                  <tr 
                    v-for="(product, idx) in topProducts.slice(0, 10)" 
                    :key="product.productId"
                    class="border-b border-surface-800/50 hover:bg-surface-800/50 transition-colors"
                  >
                    <td class="py-3 px-4 text-surface-400 font-mono">{{ idx + 1 }}</td>
                    <td class="py-3 px-4 font-medium">{{ product.productName }}</td>
                    <td class="py-3 px-4 text-right text-success font-bold">{{ product.quantitySold.toLocaleString() }}</td>
                    <td class="py-3 px-4 text-right font-medium text-primary-400">฿{{ product.totalRevenue.toLocaleString() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="bg-surface-900 rounded-2xl border border-surface-800 flex flex-col h-96">
            <div class="px-5 py-4 border-b border-surface-800 flex justify-between items-center">
              <h2 class="font-bold flex items-center gap-2">📜 บิลขายล่าสุด</h2>
              <NuxtLink to="/orders" class="text-xs text-primary-400 hover:text-primary-300">ดูทั้งหมด ↗</NuxtLink>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              <div v-if="recentOrders.length === 0" class="text-center py-8 text-surface-500 text-sm">
                ไม่มีข้อมูลบิลล่าสุด
              </div>
              <div 
                v-for="order in recentOrders" 
                :key="order.uuid"
                class="bg-surface-950 p-4 rounded-xl border border-surface-800 flex flex-col gap-2 relative group hover:border-primary-500/50 transition-colors"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <div class="font-mono text-sm font-bold text-surface-300">#{{ order.orderNumber }}</div>
                    <div class="text-xs text-surface-500 mt-0.5">{{ new Date(order.createdAt).toLocaleString('th-TH') }}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-lg text-success leading-none">฿{{ order.totalAmount.toLocaleString() }}</div>
                    <div class="text-[10px] text-surface-500 mt-1 uppercase tracking-wider">{{ order.paymentMethod }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useReports, type DailySummary, type TopProductMetric } from '~/composables/useReports'
import type { Order } from '~/types'

definePageMeta({ layout: 'admin' })

const reports = useReports()

const isLoading = ref(true)

const periods = [
  { id: 'today', label: 'วันนี้' },
  { id: 'week', label: '7 วันล่าสุด' },
  { id: 'month', label: '30 วันล่าสุด' },
]

const selectedPeriod = ref('today')

const summary = ref<DailySummary>({ revenue: 0, cost: 0, profit: 0, orderCount: 0 })
const topProducts = ref<TopProductMetric[]>([])
const recentOrders = ref<Order[]>([])

async function loadData() {
  isLoading.value = true
  
  // ซ่อมแซมข้อมูลอัตโนมัติ (เผื่อติดรูปแบบ String จากบั๊กก่อนหน้า)
  await reports.repairOrderDates()
  
  const end = new Date()
  const start = new Date()
  
  if (selectedPeriod.value === 'today') {
    start.setHours(0, 0, 0, 0)
  } else if (selectedPeriod.value === 'week') {
    start.setDate(end.getDate() - 7)
  } else if (selectedPeriod.value === 'month') {
    start.setDate(end.getDate() - 30)
  }

  try {
    const sum = await reports.getSummary(start, end)
    summary.value = sum

    const top = await reports.getTopProducts(start, end)
    topProducts.value = top

    const recent = await reports.getRecentOrders(5)
    recentOrders.value = recent
  } catch (err) {
    console.error('Failed to load dashboard', err)
  }

  isLoading.value = false
}

function selectPeriod(p: string) {
  selectedPeriod.value = p
  loadData()
}

onMounted(() => {
  loadData()
})
</script>
