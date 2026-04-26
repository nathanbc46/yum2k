<template>
  <div class="flex flex-col h-full bg-surface-950 text-surface-50 min-h-0 overflow-hidden">

    <!-- Page Header -->
    <header class="px-6 py-4 border-b border-surface-800 shrink-0 bg-surface-900/50">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-xl font-bold">📈 วิเคราะห์ยอดขาย</h1>
          <p class="text-xs text-surface-500 mt-0.5">สรุปผลการดำเนินงานและแนวโน้มการขาย</p>
        </div>
        <div class="flex gap-2 flex-wrap items-center">
          <select v-model="selectedPeriod" @change="loadData"
            class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all">
            <option value="this-month">เดือนนี้</option>
            <option value="last-month">เดือนที่แล้ว</option>
            <option value="this-year">ปีนี้</option>
            <option value="7">ย้อนหลัง 7 วัน</option>
            <option value="14">ย้อนหลัง 14 วัน</option>
            <option value="30">ย้อนหลัง 30 วัน</option>
            <option value="90">ย้อนหลัง 3 เดือน</option>
            <option value="180">ย้อนหลัง 6 เดือน</option>
            <option value="365">ย้อนหลัง 1 ปี</option>
          </select>
          <button @click="loadData" class="p-2 bg-surface-800 hover:bg-surface-700 rounded-xl border border-surface-700 transition-colors" title="รีเฟรช">🔄</button>
          <button @click="openAiModal('insight')"
            class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl text-sm font-black transition-all hover:shadow-lg hover:shadow-primary-500/20 active:scale-95">
            🤖 วิเคราะห์ AI
          </button>
          <button @click="openAiModal('chat')"
            class="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl text-sm font-bold border border-surface-700 transition-all active:scale-95">
            💬 แชทกับ AI
          </button>
        </div>
      </div>
      <!-- Category / Product Filter -->
      <div v-if="activeTab !== 'overview'" class="flex items-center gap-2 mt-3 flex-wrap">
        <span class="text-xs text-surface-500 font-medium">กรองสินค้า:</span>
        <select v-model="filterCategoryId" @change="filterProductUuid = ''; loadData()"
          class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-1.5 text-xs focus:border-primary-500 outline-none transition-all">
          <option :value="0">ทุกหมวดหมู่</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <select v-model="filterProductUuid" @change="loadData()"
          class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-1.5 text-xs focus:border-primary-500 outline-none transition-all"
          :disabled="!filterCategoryId">
          <option value="">ทุกสินค้า</option>
          <option v-for="p in filteredProductOptions" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
        </select>
        <button v-if="filterCategoryId || filterProductUuid" @click="filterCategoryId = 0; filterProductUuid = ''; loadData()"
          class="text-xs text-danger hover:text-danger/80 transition-colors px-2 py-1">✕ ล้าง</button>
      </div>
    </header>

    <!-- Tab Navigation -->
    <nav class="flex gap-1 px-6 pt-3 pb-0 border-b border-surface-800 bg-surface-900/30 shrink-0">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        class="relative px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all"
        :class="activeTab === tab.id
          ? 'text-primary-400 bg-surface-900 border border-b-0 border-surface-700'
          : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50'">
        {{ tab.label }}
      </button>
    </nav>

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center text-surface-500">
      <span class="animate-spin text-2xl mr-3">⌛</span> กำลังโหลดข้อมูล...
    </div>

    <main v-else class="flex-1 overflow-y-auto">

      <!-- ===== TAB 1: ภาพรวม ===== -->
      <div v-if="activeTab === 'overview'" class="p-6 space-y-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-gradient-to-br from-blue-600/20 to-white dark:to-surface-900 border border-blue-600/40 p-5 rounded-2xl shadow-sm">
            <div class="text-[10px] uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-1 font-bold">ยอดขายรวม</div>
            <div class="text-3xl font-black text-blue-700 dark:text-blue-400">฿{{ summary.revenue.toLocaleString() }}</div>
            <div class="text-[10px] text-surface-500 mt-2 font-medium">ยอดรับเงินทั้งหมด</div>
          </div>
          <div 
            class="bg-surface-900 p-5 rounded-2xl border border-surface-800 group relative cursor-help transition-all hover:bg-surface-800/40"
            @click.stop="showExpenseTooltip = !showExpenseTooltip"
          >
            <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">รายจ่ายรวม</div>
            <div class="text-2xl font-black text-red-400">฿{{ summary.totalExpenses?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0 }}</div>
            <div class="text-[10px] text-surface-600 mt-2">คำนวณเฉลี่ยตามเดือน (แตะเพื่อดูรายละเอียด)</div>
            
            <!-- Custom Tooltip (รองรับทั้ง Hover และ Click) -->
            <div 
              :class="[
                'absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-4 bg-surface-950/95 backdrop-blur-xl border border-surface-700 rounded-2xl shadow-2xl transition-all duration-300 z-[100]',
                showExpenseTooltip 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
              ]"
            >
              <div class="text-[10px] text-surface-500 uppercase tracking-widest mb-2 border-b border-surface-800 pb-2 flex justify-between items-center">
                <span>รายละเอียดรายจ่ายเฉลี่ย</span>
                <span class="text-[9px] bg-surface-800 px-1.5 py-0.5 rounded text-surface-400">รายวัน</span>
              </div>
              <div class="space-y-2">
                <div v-for="(val, month) in monthlyAvgs" :key="month" class="flex justify-between items-center text-xs">
                  <span class="text-surface-400 font-medium">{{ month }}</span>
                  <span class="font-black text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">
                    ฿{{ Math.round(val).toLocaleString() }}
                  </span>
                </div>
              </div>
              <!-- Arrow -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px] border-8 border-transparent border-b-surface-700" />
            </div>
          </div>
          <div :class="[
            'relative overflow-hidden p-5 rounded-2xl border-2 transition-all duration-500 shadow-xl',
            (summary.revenue - (summary.totalExpenses || 0)) >= 0 
              ? 'bg-gradient-to-br from-emerald-500/20 to-white dark:to-surface-900 border-emerald-500/50 shadow-emerald-500/10 animate-pulse-subtle' 
              : 'bg-gradient-to-br from-red-500/20 to-white dark:to-surface-900 border-red-500/50 shadow-red-500/10 animate-pulse-subtle'
          ]">
            <!-- Shine Effect Overlay -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shine" />
            </div>

            <div :class="[
              'text-[10px] uppercase tracking-widest mb-1 flex justify-between items-center font-bold',
              (summary.revenue - (summary.totalExpenses || 0)) >= 0 ? 'text-emerald-600' : 'text-red-600'
            ]">
              <span>กำไรสุทธิ (รายเดือน)</span>
              <span v-if="(summary.revenue - (summary.totalExpenses || 0)) >= 0" class="animate-bounce text-lg">🚀</span>
              <span v-else class="animate-bounce text-red-600 text-lg">🚨</span>
            </div>
            <div :class="[
              'text-3xl font-black transition-colors relative z-10',
              (summary.revenue - (summary.totalExpenses || 0)) >= 0 ? 'text-emerald-600' : 'text-red-600'
            ]">
              ฿{{ Math.round(summary.revenue - (summary.totalExpenses || 0)).toLocaleString() }}
            </div>
            <div class="text-[10px] text-surface-600 mt-2 font-medium">ยอดขาย - รายจ่ายรวม</div>
          </div>
          <div class="bg-surface-900 p-5 rounded-2xl border border-surface-800">
            <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">กำไรสินค้า (GP)</div>
            <div class="text-2xl font-black text-surface-50">฿{{ summary.profit.toLocaleString() }}</div>
            <div class="text-[10px] text-surface-600 mt-2">ยอดขาย - ต้นทุนสินค้า</div>
          </div>
        </div>

        <!-- 📈 แนวโน้มยอดขายและกำไรสุทธิ (เฉลี่ยรายวัน) -->
        <div class="bg-surface-900 p-6 rounded-2xl border border-primary-500/20 bg-primary-500/5 flex flex-col min-h-[350px] mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold flex items-center gap-2">📈 แนวโน้มยอดขายและกำไรสุทธิ (รายวัน)</h3>
              <p class="text-[10px] text-surface-500 mt-0.5">กราฟแสดงการเปรียบเทียบยอดขายและกำไรสุทธิในแต่ละวัน</p>
            </div>
            <button @click="openChartModal('daily-trend', '📈 แนวโน้มยอดขายและกำไรสุทธิ (เฉลี่ยรายวัน)', 'area', netProfitChartOptions, netProfitChartSeries)" 
              class="p-2 hover:bg-surface-800 rounded-lg transition-all text-surface-400 hover:text-primary-400" title="ขยายเต็มจอ">
              <Expand :size="18" />
            </button>
          </div>
          <div class="flex-1 min-h-0">
            <ClientOnly><apexchart type="area" height="100%" :options="netProfitChartOptions" :series="netProfitChartSeries" /></ClientOnly>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 📊 สรุปภาพรวมรายเดือน (รายได้ · รายจ่าย · กำไรสุทธิ) -->
          <div class="lg:col-span-2 bg-surface-900 p-6 rounded-2xl border border-surface-800 flex flex-col min-h-[350px]">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold">📊 สรุปภาพรวมรายเดือน (รายได้ · รายจ่าย · กำไรสุทธิ)</h3>
              <button @click="openChartModal('monthly-summary', '📊 สรุปภาพรวมรายเดือน', 'bar', monthlySummaryChartOptions, monthlySummaryChartSeries)" 
                class="p-2 hover:bg-surface-800 rounded-lg transition-all text-surface-400 hover:text-primary-400" title="ขยายเต็มจอ">
                <Expand :size="18" />
              </button>
            </div>
            <div class="flex-1 min-h-0">
              <ClientOnly><apexchart type="bar" height="100%" :options="monthlySummaryChartOptions" :series="monthlySummaryChartSeries" /></ClientOnly>
            </div>
          </div>
          <div class="bg-surface-900 p-6 rounded-2xl border border-surface-800 flex flex-col min-h-[350px]">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold">🍩 สัดส่วนยอดขายตามหมวดหมู่</h3>
              <button @click="openChartModal('category-donut', '🍩 สัดส่วนยอดขายตามหมวดหมู่', 'donut', donutChartOptions, donutChartSeries)" 
                class="p-2 hover:bg-surface-800 rounded-lg transition-all text-surface-400 hover:text-primary-400" title="ขยายเต็มจอ">
                <Expand :size="18" />
              </button>
            </div>
            <div class="flex-1 flex items-center justify-center min-h-0">
              <ClientOnly><apexchart type="donut" width="100%" :options="donutChartOptions" :series="donutChartSeries" /></ClientOnly>
            </div>
          </div>
          <div class="lg:col-span-3 bg-surface-900 p-6 rounded-2xl border border-surface-800 flex flex-col min-h-[480px]">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold">⭐ 15 อันดับสินค้าขายดี (ตามจำนวนชิ้น)</h3>
              <button @click="openChartModal('product-ranking', '⭐ 15 อันดับสินค้าขายดี', 'bar', productChartOptions, productChartSeries)" 
                class="p-2 hover:bg-surface-800 rounded-lg transition-all text-surface-400 hover:text-primary-400" title="ขยายเต็มจอ">
                <Expand :size="18" />
              </button>
            </div>
            <div class="flex-1 min-h-0">
              <ClientOnly><apexchart type="bar" height="100%" :options="productChartOptions" :series="productChartSeries" /></ClientOnly>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== TAB 2: วัน × เวลา (บิล Heatmap) ===== -->
      <div v-if="activeTab === 'timemap'" class="p-6">
        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 class="text-sm font-bold">🗓️ ยอดขายตาม วัน × ชั่วโมง <span class="text-xs text-surface-500 font-normal">(จำนวนบิล)</span></h3>
            <div class="flex items-center gap-2 text-xs text-surface-500">
              <span>น้อย</span>
              <div class="flex gap-0.5">
                <div v-for="step in 6" :key="step" class="w-4 h-4 rounded-sm" :style="{ backgroundColor: `rgba(6, 182, 212, ${step * 0.15})` }" />
              </div>
              <span>มาก</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="text-xs w-full border-collapse">
              <thead>
                <tr>
                  <th class="text-left text-surface-500 px-3 py-2 w-20">วัน</th>
                  <th v-for="h in heatmapHours" :key="h" class="text-center text-surface-500 py-2 px-1 min-w-[36px]">{{ h }}</th>
                  <th class="text-right text-surface-300 font-bold px-3 py-2">รวม</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, di) in heatmapDays" :key="row.key" class="border-t border-surface-800/60">
                  <td class="px-3 py-2 font-semibold text-surface-300 whitespace-nowrap">{{ row.label }}</td>
                  <td v-for="h in heatmapHours" :key="h" class="text-center py-1.5 px-1">
                    <div class="mx-auto w-8 h-8 rounded-lg flex items-center justify-center font-semibold transition-all"
                      :style="getBillCellStyle(orderHeatmap[di]?.[h] ?? 0)"
                      :title="`${row.label} ${h}:00 — ${orderHeatmap[di]?.[h] ?? 0} บิล`">
                      <span v-if="(orderHeatmap[di]?.[h] ?? 0) > 0">{{ orderHeatmap[di]?.[h] }}</span>
                    </div>
                  </td>
                  <td class="text-right px-3 py-2 font-black text-surface-100">{{ heatmapRowTotals[di] }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-surface-700">
                  <td class="px-3 py-2 font-bold text-surface-300">รวม</td>
                  <td v-for="h in heatmapHours" :key="h" class="text-center py-2 font-black text-surface-100">
                    {{ heatmapColTotals[h] || '' }}
                  </td>
                  <td class="text-right px-3 py-2 font-black text-primary-400">{{ heatmapGrandTotal }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- ===== TAB 3: สินค้า × เวลา ===== -->
      <div v-if="activeTab === 'product-time'" class="p-6 space-y-6">

        <!-- Product × Day -->
        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 class="text-sm font-bold">🏷️ สินค้า × วันในสัปดาห์ <span class="text-xs text-surface-500 font-normal">(จำนวนชิ้น)</span></h3>
              <p class="text-xs text-surface-500 mt-0.5">เห็นว่าสินค้าไหนขายดีวันไหน — ช่วยวางแผนการเตรียมวัตถุดิบ</p>
            </div>
            <div class="flex items-center gap-2 text-xs text-surface-500">
              <span>น้อย</span>
              <div class="flex gap-0.5">
                <div v-for="step in 6" :key="step" class="w-4 h-4 rounded-sm" :style="{ backgroundColor: `rgba(249, 115, 22, ${step * 0.15})` }" />
              </div>
              <span>มาก</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="text-xs w-full border-collapse" v-if="productDayRows.length > 0">
              <thead>
                <tr>
                  <th class="text-left text-surface-500 px-3 py-2 min-w-[140px]">สินค้า</th>
                  <th v-for="(d, di) in heatmapDays" :key="d.key" class="text-center text-surface-500 px-2 py-2 min-w-[44px]">{{ d.short }}</th>
                  <th class="text-right text-surface-300 font-bold px-3 py-2">รวม</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in productDayRows" :key="row.productName" class="border-t border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                  <td class="px-3 py-2 text-surface-200 font-medium truncate max-w-[160px]" :title="row.productName">{{ row.productName }}</td>
                  <td v-for="(_, di) in heatmapDays" :key="di" class="text-center py-1.5 px-1">
                    <div class="mx-auto w-9 h-8 rounded-lg flex items-center justify-center font-bold transition-all"
                      :style="getOrangeCellStyle(row.data[di] ?? 0, productDayMax)"
                      :title="`${row.productName} ${heatmapDays[di]?.label}: ${row.data[di] ?? 0} ชิ้น`">
                      <span v-if="(row.data[di] ?? 0) > 0">{{ row.data[di] }}</span>
                    </div>
                  </td>
                  <td class="text-right px-3 py-2 font-black text-surface-200">{{ row.totalQty }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-center text-surface-500 py-10">ไม่มีข้อมูลในช่วงเวลาที่เลือก</div>
          </div>
        </div>

        <!-- Product × Hour -->
        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 class="text-sm font-bold">⏰ สินค้า × ชั่วโมง <span class="text-xs text-surface-500 font-normal">(จำนวนชิ้น)</span></h3>
              <p class="text-xs text-surface-500 mt-0.5">รู้ว่าสินค้าไหนควรพร้อมขายตอนไหน — ช่วยวางแผนการผลิตรายชั่วโมง</p>
            </div>
            <div class="flex items-center gap-2 text-xs text-surface-500">
              <span>น้อย</span>
              <div class="flex gap-0.5">
                <div v-for="step in 6" :key="step" class="w-4 h-4 rounded-sm" :style="{ backgroundColor: `rgba(139, 92, 246, ${step * 0.15})` }" />
              </div>
              <span>มาก</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="text-xs w-full border-collapse" v-if="productHourRows.length > 0">
              <thead>
                <tr>
                  <th class="text-left text-surface-500 px-3 py-2 min-w-[140px]">สินค้า</th>
                  <th v-for="h in heatmapHours" :key="h" class="text-center text-surface-500 py-2 px-1 min-w-[32px]">{{ h }}</th>
                  <th class="text-right text-surface-300 font-bold px-3 py-2">รวม</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in productHourRows" :key="row.productName" class="border-t border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                  <td class="px-3 py-2 text-surface-200 font-medium truncate max-w-[160px]" :title="row.productName">{{ row.productName }}</td>
                  <td v-for="h in heatmapHours" :key="h" class="text-center py-1.5 px-1">
                    <div class="mx-auto w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
                      :style="getPurpleCellStyle(row.data[h] ?? 0, productHourMax)"
                      :title="`${row.productName} ${h}:00 — ${row.data[h] ?? 0} ชิ้น`">
                      <span v-if="(row.data[h] ?? 0) > 0">{{ row.data[h] }}</span>
                    </div>
                  </td>
                  <td class="text-right px-3 py-2 font-black text-surface-200">{{ row.totalQty }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-center text-surface-500 py-10">ไม่มีข้อมูลในช่วงเวลาที่เลือก</div>
          </div>
        </div>
      </div>

      <!-- ===== TAB 4: แนวโน้ม ===== -->
      <div v-if="activeTab === 'trend'" class="p-6 space-y-6">

        <!-- Weekly Trend Chart -->
        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold">📅 แนวโน้มยอดขายสินค้า Top 6 (รายสัปดาห์)</h3>
              <p class="text-xs text-surface-500 mt-0.5">เห็นว่าสินค้าไหนกำลัง 🔺 ขึ้น หรือ 🔻 ลง — ปรับ Menu ได้ทันเหตุการณ์</p>
            </div>
            <button @click="openChartModal('weekly-trend', '📅 แนวโน้มยอดขายสินค้า Top 6', 'line', weeklyTrendOptions, weeklyTrendData.series)" 
              class="p-2 hover:bg-surface-800 rounded-lg transition-all text-surface-400 hover:text-primary-400" title="ขยายเต็มจอ">
              <Expand :size="18" />
            </button>
          </div>
          <div class="mt-4 min-h-[300px]">
            <ClientOnly>
              <apexchart v-if="weeklyTrendData.series.length > 0"
                type="line" height="300" :options="weeklyTrendOptions" :series="weeklyTrendData.series" />
              <div v-else class="flex items-center justify-center h-[300px] text-surface-500">ไม่มีข้อมูลในช่วงเวลาที่เลือก</div>
            </ClientOnly>
          </div>
        </div>

        <!-- Velocity Table -->
        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <div class="mb-4">
            <h3 class="text-sm font-bold">⚡ Velocity — ความถี่การขายรายสินค้า</h3>
            <p class="text-xs text-surface-500 mt-0.5">วิเคราะห์สินค้าที่ขายสม่ำเสมอ vs. ขายไม่บ่อย — ตัดสินใจเติมสต็อกหรือลด SKU</p>
          </div>
          <!-- Badge Legend -->
          <div class="flex flex-wrap gap-3 mb-4 text-xs">
            <div class="flex items-center gap-1.5"><span class="text-base">🔥</span><span class="text-surface-400">Hot: ขายวันนั้นมากกว่า 60% ของช่วงเวลา</span></div>
            <div class="flex items-center gap-1.5"><span class="text-base">👍</span><span class="text-surface-400">Good: 30–60%</span></div>
            <div class="flex items-center gap-1.5"><span class="text-base">⚠️</span><span class="text-surface-400">Slow: 10–30%</span></div>
            <div class="flex items-center gap-1.5"><span class="text-base">💤</span><span class="text-surface-400">Dead: น้อยกว่า 10%</span></div>
          </div>
          <div class="overflow-x-auto">
            <table class="text-xs w-full border-collapse" v-if="velocityData.length > 0">
              <thead>
                <tr class="text-surface-500">
                  <th class="text-left px-3 py-2">สินค้า</th>
                  <th class="text-center px-2 py-2">สถานะ</th>
                  <th class="text-right px-3 py-2">วันที่ขายได้</th>
                  <th class="text-right px-3 py-2">ยอดชิ้น</th>
                  <th class="text-right px-3 py-2">เฉลี่ย/วันที่ขาย</th>
                  <th class="text-right px-3 py-2">ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in velocityData" :key="item.productName"
                  class="border-t border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                  <td class="px-3 py-2.5 font-medium text-surface-200 max-w-[180px] truncate" :title="item.productName">{{ item.productName }}</td>
                  <td class="text-center px-2 py-2.5">
                    <span class="text-base" :title="`${(item.velocityRate * 100).toFixed(0)}% ของวัน`">
                      {{ item.badge === 'hot' ? '🔥' : item.badge === 'good' ? '👍' : item.badge === 'slow' ? '⚠️' : '💤' }}
                    </span>
                  </td>
                  <td class="text-right px-3 py-2.5 text-surface-300">
                    {{ item.daysActive }}
                    <span class="text-surface-600 text-[10px]">/{{ item.totalDays }} วัน</span>
                  </td>
                  <td class="text-right px-3 py-2.5 font-bold text-surface-100">{{ item.totalQty }}</td>
                  <td class="text-right px-3 py-2.5 text-surface-400">{{ item.avgQtyPerActiveDay.toFixed(1) }} ชิ้น</td>
                  <td class="text-right px-3 py-2.5 font-bold text-success">฿{{ item.totalRevenue.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-center text-surface-500 py-10">ไม่มีข้อมูลในช่วงเวลาที่เลือก</div>
          </div>
        </div>
      </div>

    </main>

    <AdminAiAnalysisModal
      v-if="isAiModalOpen"
      :data="aiData"
      :initial-tab="aiModalInitialTab"
      analysis-mode="monthly"
      source-title="วิเคราะห์ยอดขาย"
      @close="isAiModalOpen = false"
    />

    <!-- Chart Expansion Modal -->
    <Teleport to="body">
      <div v-if="isChartModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
        <div class="absolute inset-0 bg-surface-950/90 backdrop-blur-sm" @click="isChartModalOpen = false" />
        <div class="relative bg-surface-900 border border-surface-800 rounded-3xl w-full h-full flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <header class="flex items-center justify-between px-8 py-6 border-b border-surface-800 bg-surface-900/50 backdrop-blur-md">
            <h2 class="text-xl font-bold text-surface-50">{{ expandedChart?.title }}</h2>
            <button @click="isChartModalOpen = false" 
              class="w-10 h-10 flex items-center justify-center hover:bg-surface-800 rounded-xl transition-all text-surface-400 hover:text-red-400">
              <X :size="24" />
            </button>
          </header>
          <div class="flex-1 p-8 min-h-0 bg-surface-900/30">
            <ClientOnly v-if="expandedChart">
              <apexchart 
                :type="expandedChart.type" 
                height="100%" 
                :options="expandedChart.options" 
                :series="expandedChart.series" 
              />
            </ClientOnly>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  useReports,
  type DailySummary, type TopProductMetric,
  type ProductHeatmapRow, type WeeklyTrendData, type VelocityMetric
} from '~/composables/useReports'
import AdminAiAnalysisModal from '~/components/admin/AiAnalysisModal.vue'
import { useProfitability } from '~/composables/useProfitability'
import type { Category, Product } from '~/types'
import { db } from '~/db'
import { Expand, X } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

const {
  getSummary, getTopProducts, getDailyRevenueSnapshot, getCategorySalesDistribution,
  getProductDayHeatmap, getProductHourHeatmap, getWeeklyTrend, getProductVelocity
} = useReports()

const { getSummary: getExpenseSummary } = useProfitability()

// --- Tabs ---
const tabs = [
  { id: 'overview',      label: '📊 ภาพรวม' },
  { id: 'timemap',       label: '🗓️ วัน × เวลา' },
  { id: 'product-time',  label: '🏷️ สินค้า × เวลา' },
  { id: 'trend',         label: '📈 แนวโน้ม' },
]
const activeTab = ref('overview')

// ล้าง Filter เมื่อกลับมาที่หน้าภาพรวม
watch(activeTab, (newTab) => {
  if (newTab === 'overview') {
    if (filterCategoryId.value !== 0 || filterProductUuid.value !== '') {
      filterCategoryId.value = 0
      filterProductUuid.value = ''
      loadData()
    }
  }
})

// --- Filter State ---
const selectedPeriod = ref<string | number>('this-month')
const isLoading = ref(false)
const filterCategoryId = ref<number>(0)
const filterProductUuid = ref('')
const showExpenseTooltip = ref(false)

// ปิด Tooltip เมื่อคลิกที่อื่น
if (process.client) {
  const closeTooltip = () => { showExpenseTooltip.value = false }
  onMounted(() => window.addEventListener('click', closeTooltip))
  onUnmounted(() => window.removeEventListener('click', closeTooltip))
}
const startDate = ref(new Date())
const endDate = ref(new Date())
const categories = ref<Category[]>([])
const allProducts = ref<Product[]>([])
const isAiModalOpen = ref(false)
const aiModalInitialTab = ref<'insight' | 'chat'>('insight')

// --- Chart Expansion ---
const isChartModalOpen = ref(false)
const expandedChart = ref<{ id: string; title: string; type: string; options: any; series: any } | null>(null)

function openChartModal(id: string, title: string, type: string, options: any, series: any) {
  expandedChart.value = { id, title, type, options: { ...options, chart: { ...options.chart, height: '100%' } }, series }
  isChartModalOpen.value = true
}

function openAiModal(tab: 'insight' | 'chat') {
  aiModalInitialTab.value = tab
  isAiModalOpen.value = true
}

const aiData = computed(() => ({
  revenue: summary.value.revenue,
  cost: summary.value.cost,
  productProfitGP: summary.value.profit, // กำไรขั้นต้น (ยอดขาย - ต้นทุนสินค้า) สำหรับวิเคราะห์สินค้า
  netProfit: summary.value.revenue - (summary.value.totalExpenses || 0), // กำไรสุทธิ (ยอดขาย - รายจ่ายรวมเฉลี่ย) สำหรับวิเคราะห์ภาพรวม
  totalExpenses: summary.value.totalExpenses, // ยอดปันส่วนตามวันที่มีการขาย
  actualTotalExpenses: rawTotalExpenses.value, // ยอดจ่ายจริงรวมทั้งหมดในช่วงเวลา
  monthlyAverageExpenses: monthlyAvgs.value,
  orderCount: summary.value.orderCount,
  topProducts: topProducts.value,
  categoryStats: categorySales.value,
  hourlyStats: [], // ในหน้าภาพรวมรายเดือนจะเน้นแนวโน้มรายวันมากกว่ารายชั่วโมง
  dateRange: { 
    start: startDate.value.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }), 
    end: endDate.value.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) 
  },
  // ข้อมูลเชิงลึกเพิ่มเติม
  salesByDayHour: orderHeatmap.value,
  productByDay: productDayRows.value.map(r => ({ name: r.productName, days: r.data })),
  productByHour: productHourRows.value.map(r => ({ name: r.productName, hours: r.data })),
  weeklyTrend: weeklyTrendData.value,
  velocity: velocityData.value,
  dailyHistory: dailyHistory.value.map(d => {
    const monthKey = d.date.slice(0, 7)
    const avgExp = monthlyAvgs.value[monthKey] || 0
    return {
      date: d.date,
      revenue: d.revenue,
      productProfitGP: d.profit, // เดิมคือ GP
      netProfit: d.revenue - avgExp // กำไรหลังหักรายจ่ายเฉลี่ย
    }
  }), 
  dailyProductStats: dailyProductStats.value // ข้อมูลสินค้าแยกรายวัน
}))

const filteredProductOptions = computed(() =>
  filterCategoryId.value
    ? allProducts.value.filter(p => p.categoryId === filterCategoryId.value && !p.isDeleted)
    : []
)

// --- Report Data ---
const summary = ref<DailySummary & { totalExpenses?: number }>({ revenue: 0, cost: 0, profit: 0, orderCount: 0, totalExpenses: 0 })
const topProducts = ref<TopProductMetric[]>([])
const dailyHistory = ref<{ date: string; revenue: number; profit: number }[]>([])
const categorySales = ref<{ categoryName: string; value: number }[]>([])
const dailyProductStats = ref<Record<string, any>>({}) // เก็บข้อมูล: { '2024-04-20': { total: 500, items: { 'ยำปูม้า': 5 } } }
const monthlyAvgs = ref<Record<string, number>>({}) // เก็บข้อมูล: { '2024-04': 183.33 }
const rawTotalExpenses = ref(0) // ยอดรวมรายจ่ายจริงจาก DB (ไม่ปันส่วน)
const expenseTooltip = ref('') // ข้อความรายละเอียดเมื่อเอาเมาส์ชี้รายจ่าย

// ข้อมูลสำหรับกราฟสรุปรายเดือน
const monthlySummaryData = ref<{ month: string; revenue: number; expense: number; profit: number }[]>([])

// --- Heatmap: Day × Hour (บิล) ---
const heatmapDays = [
  { key: 'mon', label: 'จันทร์',  short: 'จ',  jsDay: 1 },
  { key: 'tue', label: 'อังคาร',  short: 'อ',  jsDay: 2 },
  { key: 'wed', label: 'พุธ',     short: 'พ',  jsDay: 3 },
  { key: 'thu', label: 'พฤหัส', short: 'พฤ', jsDay: 4 },
  { key: 'fri', label: 'ศุกร์',   short: 'ศ',  jsDay: 5 },
  { key: 'sat', label: 'เสาร์',   short: 'ส',  jsDay: 6 },
  { key: 'sun', label: 'อาทิตย์',short: 'อา', jsDay: 0 },
]
const heatmapHours = Array.from({ length: 15 }, (_, i) => i + 8)
const orderHeatmap = ref<Record<number, Record<number, number>>>({})

const heatmapRowTotals = computed(() =>
  heatmapDays.map((_, di) => heatmapHours.reduce((s, h) => s + (orderHeatmap.value[di]?.[h] ?? 0), 0))
)
const heatmapColTotals = computed(() => {
  const t: Record<number, number> = {}
  for (const h of heatmapHours) t[h] = heatmapDays.reduce((s, _, di) => s + (orderHeatmap.value[di]?.[h] ?? 0), 0)
  return t
})
const heatmapGrandTotal = computed(() => heatmapRowTotals.value.reduce((s, v) => s + v, 0))
const orderHeatmapMax = computed(() => {
  let max = 1
  for (const di in orderHeatmap.value) for (const h in orderHeatmap.value[di]) {
    const v = orderHeatmap.value[di]?.[Number(h)] ?? 0
    if (v > max) max = v
  }
  return max
})

// --- Heatmap: Product × Day / Hour ---
const productDayRows = ref<ProductHeatmapRow[]>([])
const productHourRows = ref<ProductHeatmapRow[]>([])
const productDayMax = computed(() => Math.max(1, ...productDayRows.value.flatMap(r => Object.values(r.data))))
const productHourMax = computed(() => Math.max(1, ...productHourRows.value.flatMap(r => Object.values(r.data))))

// --- Trend & Velocity ---
const weeklyTrendData = ref<WeeklyTrendData>({ weeks: [], series: [] })
const velocityData = ref<VelocityMetric[]>([])

// --- Cell Style Functions ---
function getBillCellStyle(count: number) {
  if (count === 0) return { backgroundColor: 'transparent', color: 'transparent' }
  const a = 0.15 + (count / orderHeatmapMax.value) * 0.75
  return { backgroundColor: `rgba(6, 182, 212, ${a})`, color: (count / orderHeatmapMax.value) > 0.5 ? '#fff' : '#e2e8f0' }
}
function getOrangeCellStyle(count: number, max: number) {
  if (count === 0) return { backgroundColor: 'transparent', color: 'transparent' }
  const a = 0.12 + (count / max) * 0.78
  return { backgroundColor: `rgba(249, 115, 22, ${a})`, color: (count / max) > 0.5 ? '#fff' : '#fed7aa' }
}
function getPurpleCellStyle(count: number, max: number) {
  if (count === 0) return { backgroundColor: 'transparent', color: 'transparent' }
  const a = 0.12 + (count / max) * 0.78
  return { backgroundColor: `rgba(139, 92, 246, ${a})`, color: (count / max) > 0.5 ? '#fff' : '#ddd6fe' }
}

// --- Chart Options ---
const revenueChartSeries = computed(() => [
  { name: 'ยอดขาย', data: dailyHistory.value.map(d => d.revenue) },
  { name: 'กำไรสุทธิ', data: dailyHistory.value.map(d => d.profit) }
])
const revenueChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, background: 'transparent', foreColor: '#78716c', fontFamily: 'Inter, sans-serif' },
  colors: ['#06b6d4', '#10b981'],
  stroke: { curve: 'smooth', width: 3 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [20, 100] } },
  xaxis: { categories: dailyHistory.value.map(d => { const p = d.date.split('-'); return `${p[2]}/${p[1]}` }), axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { formatter: (v: number) => `฿${v.toLocaleString()}` } },
  grid: { borderColor: '#292524', strokeDashArray: 4 },
  tooltip: { theme: 'dark' },
  legend: { position: 'top', horizontalAlign: 'right' },
  dataLabels: { 
    enabled: true,
    formatter: (v: number) => v > 0 ? `฿${Math.round(v).toLocaleString()}` : '',
    offsetY: -10,
    style: { 
      fontSize: '11px', 
      colors: ['#06b6d4', '#10b981'], 
      fontWeight: '900' 
    },
    background: { enabled: false }
  }
}))

// --- กราฟกำไรสุทธิ (หักรายจ่ายเฉลี่ย) ---
const netProfitChartSeries = computed(() => {
  return [
    { name: 'ยอดขาย', data: dailyHistory.value.map(d => d.revenue) },
    { 
      name: 'กำไรสุทธิ', 
      data: dailyHistory.value.map(d => {
        // หาเดือนของวันที่นี้ (YYYY-MM)
        const monthKey = d.date.slice(0, 7)
        const avgExpense = monthlyAvgs.value[monthKey] || 0
        return Math.max(0, d.revenue - avgExpense)
      }) 
    }
  ]
})

const netProfitChartOptions = computed(() => ({
  ...revenueChartOptions.value,
  colors: ['#06b6d4', '#ec4899'], 
  dataLabels: {
    ...revenueChartOptions.value.dataLabels,
    style: {
      ...revenueChartOptions.value.dataLabels.style,
      colors: ['#06b6d4', '#ec4899']
    }
  },
  title: {
    text: undefined
  }
}))

const donutChartSeries = computed(() => categorySales.value.map(c => c.value))
const donutChartOptions = computed(() => ({
  labels: categorySales.value.map(c => c.categoryName),
  chart: { background: 'transparent', foreColor: '#a8a29e' },
  colors: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  stroke: { show: false },
  legend: { position: 'bottom' },
  dataLabels: { 
    enabled: true,
    formatter: (val: number, opts: any) => {
      const name = opts.w.globals.labels[opts.seriesIndex]
      return `${name}\n${val.toFixed(0)}%`
    },
    style: {
      fontSize: '9px',
      fontWeight: 'bold',
      colors: ['#fff']
    },
    dropShadow: { enabled: true, blur: 1, opacity: 0.5 }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'รวมยอดขาย',
            color: '#a8a29e',
            fontSize: '12px',
            formatter: (w: any) => '฿' + w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString()
          },
          value: { color: '#f5f5f5', fontSize: '16px', fontWeight: 'bold' }
        }
      },
      dataLabels: {
        offset: -15,
        minAngleToShowLabel: 10
      }
    }
  }
}))

const productChartSeries = computed(() => [{ name: 'จำนวนชิ้น', data: topProducts.value.slice(0, 15).map(p => p.quantitySold) }])
const productChartOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', foreColor: '#a8a29e' },
  plotOptions: { bar: { borderRadius: 6, horizontal: true, distributed: true, barHeight: '60%' } },
  colors: [
    '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#3b82f6', '#f472b6', '#a855f7', '#22c55e',
    '#14b8a6', '#f97316', '#6366f1', '#d946ef', '#0ea5e9'
  ],
  dataLabels: { enabled: true, formatter: (val: number) => val + ' ชิ้น' },
  xaxis: { categories: topProducts.value.slice(0, 15).map(p => p.productName), labels: { show: false } },
  grid: { show: false }, legend: { show: false }
}))

// Weekly Trend Chart Options
const weeklyTrendOptions = computed(() => ({
  chart: { type: 'line', toolbar: { show: false }, background: 'transparent', foreColor: '#78716c', fontFamily: 'Inter, sans-serif' },
  colors: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  stroke: { curve: 'smooth', width: 2.5 },
  markers: { size: 5, hover: { size: 7 } },
  xaxis: { categories: weeklyTrendData.value.weeks, axisBorder: { show: false } },
  yaxis: { labels: { formatter: (v: number) => v + ' ชิ้น' } },
  grid: { borderColor: '#292524', strokeDashArray: 4 },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => v + ' ชิ้น' } },
  legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px' }
}))

// --- กราฟสรุปรายเดือน ---
const monthlySummaryChartSeries = computed(() => [
  { name: 'รายได้', data: monthlySummaryData.value.map(m => m.revenue) },
  { name: 'รายจ่าย', data: monthlySummaryData.value.map(m => m.expense) },
  { name: 'กำไรสุทธิ', data: monthlySummaryData.value.map(m => m.profit) }
])
const monthlySummaryChartOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', foreColor: '#a8a29e' },
  plotOptions: { 
    bar: { 
      borderRadius: 4, 
      columnWidth: '60%',
      dataLabels: {
        position: 'top',
      },
      colors: {
        ranges: [{
          from: -1000000,
          to: -1,
          color: '#ef4444' // สีแดงสำหรับยอดติดลบ
        }]
      }
    } 
  },
  colors: ['#06b6d4', '#f97316', '#10b981'], // รายได้(ฟ้า), รายจ่าย(ส้ม), กำไร(เขียว)
  dataLabels: { 
    enabled: true,
    offsetY: -20,
    style: {
      fontSize: '10px',
      fontWeight: 'bold',
      colors: ['#a8a29e']
    },
    formatter: (v: number) => {
      if (v === 0) return ''
      const prefix = v < 0 ? '-' : ''
      const absV = Math.abs(v)
      if (absV >= 1000) return prefix + (absV / 1000).toFixed(1) + 'k'
      return v.toLocaleString()
    }
  },
  xaxis: { categories: monthlySummaryData.value.map(m => m.month), axisBorder: { show: false } },
  yaxis: { 
    labels: { formatter: (v: number) => `฿${v.toLocaleString()}` },
    tickAmount: 5
  },
  annotations: {
    yaxis: [{
      y: 0,
      strokeDashArray: 0,
      borderColor: '#ef4444',
      borderWidth: 1.5,
      opacity: 0.8,
      label: {
        borderColor: '#ef4444',
        style: { color: '#fff', background: '#ef4444' },
        text: '0',
      }
    }]
  },
  grid: { 
    borderColor: '#292524', 
    strokeDashArray: 4,
    padding: { top: 20 }
  },
  tooltip: { theme: 'dark' },
  legend: { position: 'top', horizontalAlign: 'right' }
}))

// --- Data Loading ---
async function loadData() {
  isLoading.value = true
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const gregorianY = currentYear > 2400 ? currentYear - 543 : currentYear

  if (selectedPeriod.value === 'this-month') {
    startDate.value = new Date(gregorianY, now.getMonth(), 1, 0, 0, 0, 0)
    endDate.value = new Date(gregorianY, now.getMonth(), now.getDate(), 23, 59, 59, 999)
  } else if (selectedPeriod.value === 'last-month') {
    startDate.value = new Date(gregorianY, now.getMonth() - 1, 1, 0, 0, 0, 0)
    endDate.value = new Date(gregorianY, now.getMonth(), 0, 23, 59, 59, 999)
  } else if (selectedPeriod.value === 'this-year') {
    startDate.value = new Date(gregorianY, 0, 1, 0, 0, 0, 0)
    endDate.value = new Date(gregorianY, now.getMonth(), now.getDate(), 23, 59, 59, 999)
  } else {
    const days = Number(selectedPeriod.value)
    endDate.value = new Date()
    endDate.value.setHours(23, 59, 59, 999)
    startDate.value = new Date()
    startDate.value.setDate(endDate.value.getDate() - days)
    startDate.value.setHours(0, 0, 0, 0)
  }
  
  const start = startDate.value
  const end = endDate.value
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  try {
    // โหลด Master Data
    const [cats, prods] = await Promise.all([
      db.categories.filter(c => !c.isDeleted).toArray(),
      db.products.filter(p => !p.isDeleted).toArray()
    ])
    categories.value = cats
    allProducts.value = prods

    // โหลด Orders ทั้งหมดในช่วง
    const allOrders = await db.orders
      .where('createdAt').between(start, end, true, true)
      .filter(o => !o.isDeleted && o.status !== 'cancelled' && o.status !== 'refunded')
      .toArray()

    // กรองตาม filter
    const filteredOrders = (filterCategoryId.value || filterProductUuid.value)
      ? allOrders.filter(o => o.items?.some(item => {
          if (filterProductUuid.value) return item.productUuid === filterProductUuid.value
          const cat = cats.find(c => c.id === filterCategoryId.value)
          return cat ? item.categoryUuid === cat.uuid : false
        }))
      : allOrders

    // คำนวณ Summary จาก filtered orders
    let revenue = 0, cost = 0, profit = 0
    for (const o of filteredOrders) { revenue += o.totalAmount; cost += o.totalCost; profit += o.profitAmount }
    
    // ดึงข้อมูลรายจ่ายรวมในช่วงเวลา
    const formatDate = (d: Date) => {
      let year = d.getFullYear()
      if (year > 2400) year -= 543 
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const startStr = formatDate(start)
    const endStr = formatDate(end)
    const expenseSummary: any = await getExpenseSummary(startStr, endStr)

    summary.value = { 
      revenue, 
      cost, 
      profit, 
      orderCount: filteredOrders.length,
      totalExpenses: expenseSummary.totalExpenses
    }

    monthlyAvgs.value = {}

    // คำนวณ Order Heatmap (Day × Hour)
    const matrix: Record<number, Record<number, number>> = {}
    for (let di = 0; di < heatmapDays.length; di++) matrix[di] = {}
    for (const order of filteredOrders) {
      const d = new Date(order.createdAt)
      const jsDay = d.getDay()
      const di = heatmapDays.findIndex(day => day.jsDay === jsDay)
      const h = d.getHours()
      if (di >= 0 && h >= 8 && h <= 22) {
        matrix[di]![h] = (matrix[di]![h] ?? 0) + 1
      }
    }
    orderHeatmap.value = matrix

    // โหลด Reports ต่างๆ แบบ Parallel
    const [topData, graphData, catData, pdRows, phRows, wTrend, velocity] = await Promise.all([
      getTopProducts(start, end),
      getDailyRevenueSnapshot(start, end),
      getCategorySalesDistribution(start, end),
      getProductDayHeatmap(start, end, 15),
      getProductHourHeatmap(start, end, 15),
      getWeeklyTrend(Math.min(12, Math.max(1, Math.ceil(diffDays / 7)))),
      getProductVelocity(start, end)
    ])
    topProducts.value = topData
    dailyHistory.value = graphData
    categorySales.value = catData
    productDayRows.value = pdRows
    productHourRows.value = phRows
    weeklyTrendData.value = wTrend
    velocityData.value = velocity

    // --- คำนวณรายจ่ายเฉลี่ยแยกตามเดือน (ย้ายมาไว้ตรงนี้) ---
    const monthlyData: Record<string, number> = {}
    expenseSummary.expenses?.forEach((e: any) => {
      const mKey = e.expenseDate.slice(0, 7)
      monthlyData[mKey] = (monthlyData[mKey] || 0) + e.amount
    })

    const avgs: Record<string, number> = {}
    const activeMonths = new Set<string>()
    dailyHistory.value.forEach(d => activeMonths.add(d.date.slice(0, 7)))

    activeMonths.forEach(mKey => {
      const parts = mKey.split('-').map(Number)
      const currentYear = new Date().getFullYear()
      const year = parts[0] || (currentYear > 2400 ? currentYear - 543 : currentYear)
      const month = parts[1] || (new Date().getMonth() + 1)
      const daysInMonth = new Date(year, month, 0).getDate()
      avgs[mKey] = (monthlyData[mKey] || 0) / daysInMonth
    })
    monthlyAvgs.value = avgs

    // สร้าง Tooltip
    const tooltipParts: string[] = []
    Object.keys(avgs).sort().forEach(mKey => {
      const [year, month] = mKey.split('-')
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })
      tooltipParts.push(`${monthName}: ฿${avgs[mKey]!.toLocaleString(undefined, { maximumFractionDigits: 0 })}/วัน`)
    })
    expenseTooltip.value = 'รายละเอียดรายจ่ายเฉลี่ย:\n' + tooltipParts.join('\n')

    // --- คำนวณยอดรายจ่ายรวมเฉลี่ยตามวันที่เลือกจริง (Allocated Expenses) ---
    let totalAllocatedExpenses = 0
    const monthlySummaryMap: Record<string, { revenue: number; expense: number; profit: number }> = {}

    dailyHistory.value.forEach(d => {
      const monthKey = d.date.slice(0, 7)
      const avgExp = avgs[monthKey] || 0
      totalAllocatedExpenses += avgExp

      if (!monthlySummaryMap[monthKey]) monthlySummaryMap[monthKey] = { revenue: 0, expense: 0, profit: 0 }
      monthlySummaryMap[monthKey].revenue += d.revenue
      monthlySummaryMap[monthKey].expense += avgExp
      monthlySummaryMap[monthKey].profit += (d.revenue - avgExp)
    })
    summary.value.totalExpenses = totalAllocatedExpenses
    rawTotalExpenses.value = expenseSummary.totalExpenses || 0

    // สรุปข้อมูลสำหรับกราฟแท่ง
    monthlySummaryData.value = Object.keys(monthlySummaryMap).sort().map(mKey => {
      const [year, month] = mKey.split('-')
      const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
      const data = monthlySummaryMap[mKey]!
      return {
        month: monthLabel,
        revenue: data.revenue,
        expense: data.expense,
        profit: data.profit
      }
    })

    // คำนวณสรุปสินค้าแยกตามวันสำหรับ AI
    const stats: Record<string, any> = {}
    for (const o of filteredOrders) {
      const dateKey = new Date(o.createdAt).toLocaleDateString('en-CA')
      if (!stats[dateKey]) stats[dateKey] = { revenue: 0, items: {} as Record<string, number> }
      stats[dateKey].revenue += o.totalAmount
      for (const item of o.items) {
        stats[dateKey].items[item.productName] = (stats[dateKey].items[item.productName] || 0) + item.quantity
      }
    }
    dailyProductStats.value = stats
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
@keyframes shine {
  0% { transform: translateX(-200%) skewX(-20deg); }
  100% { transform: translateX(200%) skewX(-20deg); }
}
.animate-shine {
  animation: shine 3.5s infinite ease-in-out;
}
@keyframes pulse-subtle {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.15); }
}
.animate-pulse-subtle {
  animation: pulse-subtle 3s infinite ease-in-out;
}
</style>
