<template>
  <div class="flex flex-col h-full bg-surface-950 text-surface-50 min-h-0 overflow-hidden">
    
    <!-- Page Header -->
    <header class="px-6 py-5 border-b border-surface-800 shrink-0 bg-surface-900/50 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">📈 วิเคราะห์ยอดขาย</h1>
        <p class="text-xs text-surface-500 mt-0.5">สรุปผลการดำเนินงานและแนวโน้มการขาย</p>
      </div>
      
      <div class="flex gap-2">
        <select 
          v-model="selectedDays" 
          @change="loadData"
          class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all"
        >
          <option :value="7">ย้อนหลัง 7 วัน</option>
          <option :value="14">ย้อนหลัง 14 วัน</option>
          <option :value="30">ย้อนหลัง 30 วัน</option>
        </select>
        <button 
          @click="loadData"
          class="p-2 bg-surface-800 hover:bg-surface-700 rounded-xl border border-surface-700 transition-colors"
          title="รีเฟรชข้อมูล"
        >
          🔄
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">
      
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Revenue -->
        <div class="bg-surface-900 p-5 rounded-2xl border border-surface-800 shadow-xl">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">ยอดขายรวม</div>
          <div class="text-2xl font-black text-primary-400">฿{{ summary.revenue.toLocaleString() }}</div>
          <div class="text-[10px] text-surface-600 mt-2 flex items-center gap-1">
            <span>📊</span>
            <span>จาก {{ summary.orderCount }} ออร์เดอร์</span>
          </div>
        </div>

        <!-- Profit -->
        <div class="bg-surface-900 p-5 rounded-2xl border border-surface-800 shadow-xl">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">กำไรรวม</div>
          <div class="text-2xl font-black text-success">฿{{ summary.profit.toLocaleString() }}</div>
          <div class="text-[10px] text-surface-600 mt-2">
            Margin: {{ summary.revenue > 0 ? ((summary.profit / summary.revenue) * 100).toFixed(1) : 0 }}%
          </div>
        </div>

        <!-- Avg Ticket -->
        <div class="bg-surface-900 p-5 rounded-2xl border border-surface-800 shadow-xl">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">เฉลี่ยต่อบิล</div>
          <div class="text-2xl font-black text-surface-50">
            ฿{{ summary.orderCount > 0 ? (summary.revenue / summary.orderCount).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0 }}
          </div>
          <div class="text-[10px] text-surface-600 mt-2">Ticket Size</div>
        </div>

        <!-- Top Item -->
        <div class="bg-surface-900 p-5 rounded-2xl border border-surface-800 shadow-xl">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">สินค้าขายดีอันดับ 1</div>
          <div class="text-xl font-bold text-amber-400 truncate">{{ topProducts[0]?.productName || '—' }}</div>
          <div class="text-[10px] text-surface-600 mt-1">
            {{ topProducts[0]?.quantitySold || 0 }} ชิ้น
          </div>
        </div>
      </div>

      <!-- Main Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Revenue Trend (Line Chart) -->
        <div class="lg:col-span-2 bg-surface-900 p-6 rounded-2xl border border-surface-800 shadow-xl flex flex-col min-h-[400px]">
          <h3 class="text-sm font-bold mb-6 flex items-center gap-2">
            <span>📈</span> แนวโน้มยอดขายและกำไรรายวัน
          </h3>
          <div class="flex-1 min-h-0">
            <ClientOnly>
              <apexchart
                type="area"
                height="100%"
                :options="revenueChartOptions"
                :series="revenueChartSeries"
              />
            </ClientOnly>
          </div>
        </div>

        <!-- Category Distribution (Donut Chart) -->
        <div class="bg-surface-900 p-6 rounded-2xl border border-surface-800 shadow-xl flex flex-col min-h-[400px]">
          <h3 class="text-sm font-bold mb-6 flex items-center gap-2">
            <span>🍩</span> สัดส่วนยอดขายตามหมวดหมู่
          </h3>
          <div class="flex-1 flex items-center justify-center min-h-0">
            <ClientOnly>
              <apexchart
                type="donut"
                width="100%"
                :options="donutchartOptions"
                :series="donutchartSeries"
              />
            </ClientOnly>
          </div>
        </div>

        <!-- Top Selling Products (Bar Chart) -->
        <div class="lg:col-span-3 bg-surface-900 p-6 rounded-2xl border border-surface-800 shadow-xl flex flex-col min-h-[350px]">
          <h3 class="text-sm font-bold mb-6 flex items-center gap-2">
            <span>⭐</span> 10 อันดับสินค้าขายดี (ตามจำนวนชิ้น)
          </h3>
          <div class="flex-1 min-h-0">
            <ClientOnly>
              <apexchart
                type="bar"
                height="100%"
                :options="productChartOptions"
                :series="productChartSeries"
              />
            </ClientOnly>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useReports, type DailySummary, type TopProductMetric } from '~/composables/useReports'

definePageMeta({ layout: 'admin' })

const { 
  getSummary, 
  getTopProducts, 
  getDailyRevenueSnapshot,
  getCategorySalesDistribution 
} = useReports()

// --- State ---
const selectedDays = ref(14)
const isLoading = ref(true)

const summary = ref<DailySummary>({ revenue: 0, cost: 0, profit: 0, orderCount: 0 })
const topProducts = ref<TopProductMetric[]>([])
const dailyHistory = ref<{ date: string, revenue: number, profit: number }[]>([])
const categorySales = ref<{ categoryName: string, value: number }[]>([])

// --- Chart Options & Data ---

// 1. Revenue Chart (Area)
const revenueChartSeries = computed(() => [
  { name: 'ยอดขาย', data: dailyHistory.value.map(d => d.revenue) },
  { name: 'กำไรสุทธิ', data: dailyHistory.value.map(d => d.profit) }
])

const revenueChartOptions = computed(() => ({
  chart: {
    toolbar: { show: false },
    sparkline: { enabled: false },
    background: 'transparent',
    foreColor: '#78716c',
    fontFamily: 'Inter, sans-serif'
  },
  colors: ['#06b6d4', '#10b981'],
  stroke: { curve: 'smooth', width: 3 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [20, 100]
    }
  },
  xaxis: {
    categories: dailyHistory.value.map(d => {
      const parts = d.date.split('-')
      return `${parts[2]}/${parts[1]}` // DD/MM
    }),
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: { labels: { formatter: (v: number) => `฿${v.toLocaleString()}` } },
  grid: { borderColor: '#292524', strokeDashArray: 4 },
  tooltip: { theme: 'dark', x: { show: true } },
  legend: { position: 'top', horizontalAlign: 'right' },
  dataLabels: { enabled: false }
}))

// 2. Category Donut
const donutchartSeries = computed(() => categorySales.value.map(c => c.value))
const donutchartOptions = computed(() => ({
  labels: categorySales.value.map(c => c.categoryName),
  chart: { background: 'transparent', foreColor: '#a8a29e' },
  colors: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  stroke: { show: false },
  legend: { position: 'bottom' },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'รวมยอดขาย',
            formatter: (w: any) => '฿' + w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString()
          }
        }
      }
    }
  },
  dataLabels: { enabled: false }
}))

// 3. Top Products Bar
const productChartSeries = computed(() => [
  { name: 'จำนวนชิ้น', data: topProducts.value.slice(0, 10).map(p => p.quantitySold) }
])

const productChartOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', foreColor: '#a8a29e' },
  plotOptions: {
    bar: {
      borderRadius: 6,
      horizontal: true,
      distributed: true,
      barHeight: '60%'
    }
  },
  colors: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#f472b6', '#a855f7', '#22c55e'],
  dataLabels: { enabled: true, formatter: (val: number) => val + ' ชิ้น' },
  xaxis: {
    categories: topProducts.value.slice(0, 10).map(p => p.productName),
    labels: { show: false }
  },
  grid: { show: false },
  legend: { show: false }
}))

// --- Data Loading ---
async function loadData() {
  isLoading.value = true
  const now = new Date()
  const start = new Date()
  start.setDate(now.getDate() - selectedDays.value)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  try {
    const [sumData, topData, graphData, catData] = await Promise.all([
      getSummary(start, end),
      getTopProducts(start, end),
      getDailyRevenueSnapshot(selectedDays.value),
      getCategorySalesDistribution(start, end)
    ])

    summary.value = sumData
    topProducts.value = topData
    dailyHistory.value = graphData
    categorySales.value = catData
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
</script>
