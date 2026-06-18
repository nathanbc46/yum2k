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

        <!-- Excel Actions -->
        <div class="relative">
          <button
            @click="showExcelMenu = !showExcelMenu"
            class="h-12 px-5 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-xl transition-all border border-surface-700 flex items-center gap-2"
          >
            <span>📊 Excel</span>
            <span class="text-[10px] opacity-50">▼</span>
          </button>

          <!-- Backdrop -->
          <div v-if="showExcelMenu" @click="showExcelMenu = false" class="fixed inset-0 z-10"></div>

          <div v-if="showExcelMenu" class="absolute right-0 mt-2 w-48 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
            <button @click="handleDownloadTemplate(); showExcelMenu = false" class="w-full text-left px-4 py-3 text-xs font-bold hover:bg-surface-800 border-b border-surface-800 flex items-center gap-2">
              <span>📄</span> ดาวน์โหลด Template
            </button>
            <button @click="handleExportExcel(); showExcelMenu = false" class="w-full text-left px-4 py-3 text-xs font-bold hover:bg-surface-800 border-b border-surface-800 flex items-center gap-2">
              <span>📤</span> ส่งออกรายจ่าย (Export)
            </button>
            <button 
              @click="isOnline ? (triggerImport(), showExcelMenu = false) : null" 
              class="w-full text-left px-4 py-3 text-xs font-bold hover:bg-surface-800 flex items-center gap-2"
              :class="isOnline ? 'text-primary-400' : 'text-surface-600 cursor-not-allowed opacity-50'"
              :title="isOnline ? '' : 'ต้องใช้อินเทอร์เน็ต'"
            >
              <span>📥</span> นำเข้ารายจ่าย (Import)
            </button>
          </div>
          <input 
            ref="excelInput"
            type="file"
            accept=".xlsx,.xls"
            class="hidden"
            @change="handleImportExcel"
          />
        </div>

        <button
          @click="showBatchModal = true"
          class="h-12 px-6 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-primary-900/20"
        >
          <Plus :size="20" />
          <span>เพิ่มรายจ่าย</span>
        </button>

        <button 
          @click="showCategoryModal = true"
          class="h-12 px-6 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-xl transition-all border border-surface-700 flex items-center gap-2"
        >
          <Calendar :size="20" />
          <span>จัดการหมวดหมู่</span>
        </button>
      </div>
    </div>

    <!-- Main Content: Expense List -->
    <div class="flex-1 overflow-auto p-6 space-y-6">
      <!-- Filter Bar -->
      <div class="flex items-center gap-4 bg-surface-900 p-4 rounded-2xl border border-surface-800 shrink-0">
        <!-- Date range preset -->
        <div class="flex items-center gap-2 px-3 h-11 bg-surface-950 rounded-xl border border-surface-800">
          <Calendar :size="14" class="text-surface-500 shrink-0" />
          <select
            v-model="selectedDateRange"
            class="bg-surface-950 border-none text-surface-50 focus:ring-0 text-sm"
          >
            <option value="today">วันนี้</option>
            <option value="this_week">สัปดาห์นี้</option>
            <option value="this_month">เดือนนี้</option>
            <option value="last_month">เดือนที่แล้ว</option>
            <option value="this_year">ปีนี้</option>
            <option value="custom">กำหนดเอง</option>
          </select>
        </div>

        <!-- Custom date inputs -->
        <template v-if="selectedDateRange === 'custom'">
          <div class="flex items-center gap-2 px-3 h-11 bg-surface-950 rounded-xl border border-surface-800">
            <span class="text-[10px] font-black text-surface-500 uppercase">เริ่ม</span>
            <input
              type="date"
              v-model="customStart"
              class="bg-surface-950 border-none text-surface-50 focus:ring-0 text-sm"
            />
          </div>
          <div class="flex items-center gap-2 px-3 h-11 bg-surface-950 rounded-xl border border-surface-800">
            <span class="text-[10px] font-black text-surface-500 uppercase">ถึง</span>
            <input
              type="date"
              v-model="customEnd"
              class="bg-surface-950 border-none text-surface-50 focus:ring-0 text-sm"
            />
          </div>
        </template>

        <!-- Search -->
        <div class="flex items-center gap-2 px-4 h-11 bg-surface-950 rounded-xl border border-surface-800 min-w-[200px]">
          <Search :size="16" class="text-surface-600 shrink-0" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาคำอธิบาย..."
            class="bg-transparent border-none text-surface-50 focus:ring-0 text-sm w-full placeholder-surface-600"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="text-surface-600 hover:text-surface-400 transition-colors shrink-0">
            <X :size="14" />
          </button>
        </div>

        <!-- Category filter -->
        <div class="flex items-center gap-2 px-4 h-11 bg-surface-950 rounded-xl border border-surface-800">
          <Filter :size="16" class="text-surface-600" />
          <select
            v-model="filterCategory"
            class="bg-surface-950 border-none text-surface-50 focus:ring-0 w-full text-sm"
          >
            <option value="">ทุกหมวดหมู่</option>
            <option v-for="cat in expenseCategories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Vendor filter -->
        <div class="flex items-center gap-2 px-4 h-11 bg-surface-950 rounded-xl border border-surface-800">
          <Filter :size="16" class="text-surface-600" />
          <select
            v-model="filterVendor"
            class="bg-surface-950 border-none text-surface-50 focus:ring-0 w-full text-sm"
          >
            <option value="">ทุก Vendor</option>
            <option v-for="v in vendorList" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="bg-gradient-to-r from-primary-600/10 to-primary-500/5 border border-primary-500/20 rounded-2xl px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-500/15 rounded-xl flex items-center justify-center text-primary-400">
            <Banknote :size="20" />
          </div>
          <div>
            <p class="text-[11px] font-black uppercase tracking-widest text-surface-500">รายจ่ายรวม{{ dateRangeLabel }}</p>
            <p class="text-[11px] text-surface-600 mt-0.5">{{ filteredExpenses.length }} รายการ</p>
          </div>
        </div>
        <p class="text-3xl font-black text-primary-400">฿{{ filterTotalAmount.toLocaleString() }}</p>
      </div>

      <!-- Tabs + Mass Edit Button -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex gap-1 bg-surface-900 p-1 rounded-2xl border border-surface-800">
          <button
            @click="activeTab = 'daily'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            :class="activeTab === 'daily' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-surface-200'"
          >สรุปรายวัน</button>
          <button
            @click="activeTab = 'list'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            :class="activeTab === 'list' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-surface-200'"
          >รายการทั้งหมด</button>
          <button
            @click="activeTab = 'chart'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
            :class="activeTab === 'chart' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-surface-200'"
          >
            <PieChart :size="14" />
            กราฟจัดกลุ่มตามรายจ่าย
          </button>
        </div>
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <button
            v-if="activeTab === 'list' && selectedExpenseIds.size > 0"
            @click="showMassEditModal = true"
            class="h-10 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-amber-900/30"
          >
            <CheckSquare :size="16" />
            <span>แก้ไขหมู่ ({{ selectedExpenseIds.size }} รายการ)</span>
          </button>
        </Transition>
      </div>

      <!-- Daily Summary -->
      <div v-show="activeTab === 'daily'" class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        <div class="px-5 py-3 border-b border-surface-800 flex items-center justify-between">
          <span class="text-[11px] font-black uppercase tracking-widest text-surface-500">สรุปรายวัน</span>
          <span class="text-[11px] text-surface-600">{{ dailySummary.length }} วัน</span>
        </div>
        <div class="divide-y divide-surface-800/60">
          <div
            v-for="day in dailySummary"
            :key="day.date"
            class="flex items-center justify-between px-5 py-3 hover:bg-surface-800/60 transition-colors"
          >
            <div class="flex items-center gap-3 flex-1 cursor-pointer active:scale-[0.99]" @click="selectedDay = day.date">
              <span class="text-sm font-bold text-surface-200">{{ formatThaiDate(day.date) }}</span>
              <span class="text-[11px] text-surface-600 bg-surface-800 px-2 py-0.5 rounded-full">{{ day.count }} รายการ</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-black text-surface-50">฿{{ day.total.toLocaleString() }}</span>
              <button
                @click.stop="openDayEditModal(day.date)"
                class="px-3 py-1.5 text-xs font-bold bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Pencil :size="12" /> แก้ไข
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Expense Table Container -->
      <div v-show="activeTab === 'list'" class="bg-surface-900 border border-surface-800 rounded-[2rem] overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse relative">
            <thead class="sticky top-0 z-10 bg-surface-800 shadow-sm">
              <tr>
                <th class="pl-5 pr-2 py-4 border-b border-surface-800 w-10">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="w-4 h-4 accent-primary-500 rounded cursor-pointer"
                    :title="isAllSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'"
                  />
                </th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">วันที่</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">หมวดหมู่</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">คำอธิบาย</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">Vendor</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">จำนวน</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">หน่วย</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">ผู้บันทึก</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800 text-right">จำนวนเงิน</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800 text-center">จัดการ</th>
              </tr>
          </thead>
          <tbody class="divide-y divide-surface-800">
            <tr v-if="filteredExpenses.length === 0">
              <td colspan="9" class="px-6 py-20 text-center text-surface-600">
                <div class="flex flex-col items-center gap-4">
                  <Banknote :size="48" class="opacity-20" />
                  <p class="font-bold">ไม่พบข้อมูลรายจ่ายในช่วงนี้</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="expense in paginatedExpenses"
              :key="expense.id"
              class="hover:bg-surface-800/30 transition-colors group"
              :class="selectedExpenseIds.has(expense.id!) ? 'bg-primary-500/5' : ''"
            >
              <td class="pl-5 pr-2 py-4 w-10">
                <input
                  type="checkbox"
                  :checked="selectedExpenseIds.has(expense.id!)"
                  @change="toggleSelect(expense.id!)"
                  class="w-4 h-4 accent-primary-500 rounded cursor-pointer"
                />
              </td>
              <td class="px-6 py-4 text-sm text-surface-400 font-medium">
                {{ formatThaiDate(expense.expenseDate) }}
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider"
                  :style="getCategoryStyles(expense)"
                >
                  {{ getCategoryName(expense) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-surface-200 font-bold">
                {{ expense.description }}
              </td>
              <td class="px-6 py-4 text-sm text-surface-500">
                {{ expense.vendor || '-' }}
              </td>
              <td class="px-6 py-4 text-sm text-surface-500">
                {{ expense.quantity ?? '-' }}
              </td>
              <td class="px-6 py-4 text-sm text-surface-500">
                {{ expense.unit || '-' }}
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
          <tfoot v-if="paginatedExpenses.length > 0" class="bg-surface-800 border-t border-surface-800">
            <tr>
              <td colspan="8" class="px-6 py-4 text-sm font-black text-surface-400 text-right uppercase">รวมรายจ่ายในหน้านี้:</td>
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
      <div v-if="activeTab === 'list' && totalPages > 1" class="flex items-center justify-between bg-surface-900 px-6 py-4 rounded-2xl border border-surface-800">
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

      <!-- Tab: กราฟจัดกลุ่มตามรายจ่าย -->
      <div v-show="activeTab === 'chart'" class="space-y-6">
        <!-- ไม่มีข้อมูล -->
        <div v-if="donutChartData.series.length === 0" class="bg-surface-900 border border-surface-800 rounded-2xl flex flex-col items-center justify-center py-20 gap-4">
          <PieChart :size="48" class="text-surface-700 opacity-40" />
          <p class="font-bold text-surface-600">ไม่มีข้อมูลรายจ่ายในช่วงที่เลือก</p>
        </div>

        <template v-else>
          <!-- Donut Chart + Legend (ขยายเต็มจอเฉพาะส่วนนี้) -->
          <div
            class="grid gap-6 transition-all duration-300"
            :class="isDonutFullscreen
              ? 'fixed inset-0 z-[100] bg-surface-950 p-6 grid-cols-[1fr_300px]'
              : 'grid-cols-[1fr_auto]'"
          >
            <!-- กราฟ -->
            <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col min-h-0 overflow-hidden relative">
              <!-- Header ของ chart card (แสดงเฉพาะตอน fullscreen) -->
              <div v-if="isDonutFullscreen" class="flex items-center justify-between mb-4 shrink-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400">
                    <PieChart :size="18" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-surface-100">มูลค่ารายจ่ายตามหมวดหมู่</p>
                    <p class="text-xs text-surface-500">{{ dateRangeLabel }} &middot; {{ donutChartData.labels.length }} หมวดหมู่</p>
                  </div>
                </div>
              </div>
              <!-- ปุ่ม fullscreen ลอยอยู่มุมขวาบนของ card -->
              <button
                @click="isDonutFullscreen = !isDonutFullscreen"
                class="absolute top-4 right-4 z-10 w-9 h-9 bg-surface-800/80 backdrop-blur-sm text-surface-400 hover:text-surface-50 hover:bg-surface-700 rounded-xl flex items-center justify-center transition-all active:scale-95"
                :title="isDonutFullscreen ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ'"
              >
                <Minimize2 v-if="isDonutFullscreen" :size="16" />
                <Maximize2 v-else :size="16" />
              </button>
              <!-- กราฟ -->
              <div class="flex-1 min-h-0" :class="isDonutFullscreen ? '' : 'h-[380px]'">
                <ClientOnly>
                  <apexchart
                    type="donut"
                    :height="isDonutFullscreen ? '100%' : 380"
                    :options="donutChartOptions"
                    :series="donutChartData.series"
                  />
                </ClientOnly>
              </div>
            </div>

            <!-- Legend / รายการหมวดหมู่ -->
            <div
              class="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-3 overflow-y-auto"
              :class="isDonutFullscreen ? 'w-auto' : 'w-72 max-h-[480px]'"
            >
              <p class="text-[11px] font-black uppercase tracking-widest text-surface-500 shrink-0">รายละเอียดหมวดหมู่</p>
              <div
                v-for="(item, i) in donutChartData.labels.map((l, idx) => ({ label: l, value: donutChartData.series[idx] ?? 0, color: donutChartData.colors[idx] ?? '' }))"
                :key="item.label"
                class="flex items-center gap-3 py-2 border-b border-surface-800/60 last:border-0"
              >
                <div class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: item.color }" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-surface-200 truncate">{{ item.label }}</p>
                  <p class="text-[11px] text-surface-500">{{ filterTotalAmount > 0 ? ((item.value / filterTotalAmount) * 100).toFixed(1) : '0.0' }}%</p>
                </div>
                <span class="text-sm font-black text-surface-50 shrink-0">฿{{ item.value.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- สรุปยอดรวม (ซ่อนตอน fullscreen) -->
          <div v-if="!isDonutFullscreen" class="bg-gradient-to-r from-primary-600/10 to-primary-500/5 border border-primary-500/20 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div>
              <p class="text-[11px] font-black uppercase tracking-widest text-surface-500">หมวดหมู่ทั้งหมด</p>
              <p class="text-xs text-surface-600 mt-0.5">{{ donutChartData.labels.length }} หมวดหมู่ · {{ filteredExpenses.length }} รายการ</p>
            </div>
            <p class="text-3xl font-black text-primary-400">฿{{ filterTotalAmount.toLocaleString() }}</p>
          </div>
        </template>
      </div>

    </div>

    <!-- Modal: Add/Edit Expense -->
    <AdminExpenseFormModal
      :is-open="showAddModal"
      :editing-expense="editingExpense"
      @close="showAddModal = false"
      @saved="loadExpenses"
    />
    
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
        <div
          v-if="showReportModal"
          class="fixed z-[100] flex items-center justify-center bg-surface-950/90 transition-all duration-300"
          :class="isReportFullscreen ? 'inset-0 p-0' : 'inset-0 p-4'"
        >
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div
              v-if="showReportModal"
              class="bg-surface-900 border border-surface-800 shadow-2xl w-full overflow-hidden flex flex-col transition-all duration-300"
              :class="isReportFullscreen
                ? 'max-w-none rounded-none h-screen'
                : 'max-w-5xl rounded-[2.5rem] min-h-[600px] max-h-[90vh]'"
            >
              <!-- Modal Header -->
              <div class="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400">
                    <BarChart3 :size="20" />
                  </div>
                  <div>
                    <h3 class="text-xl font-black text-surface-50">สรุปรายจ่ายรายเดือน</h3>
                    <p class="text-xs text-surface-500">เปรียบเทียบมูลค่ารวมแยกตามเดือน</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <!-- ปุ่มขยาย/ย่อเต็มจอ -->
                  <button
                    @click="isReportFullscreen = !isReportFullscreen"
                    class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 hover:bg-surface-700 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    :title="isReportFullscreen ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ'"
                  >
                    <Minimize2 v-if="isReportFullscreen" :size="18" />
                    <Maximize2 v-else :size="18" />
                  </button>
                  <!-- ปุ่มปิด -->
                  <button 
                    @click="showReportModal = false; isReportFullscreen = false"
                    class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 hover:bg-red-500/20 hover:text-red-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    title="ปิดหน้าต่าง"
                  >
                    <X :size="20" />
                  </button>
                </div>
              </div>

              <!-- Chart Content -->
              <div class="p-8 flex-1 flex flex-col min-h-0">
                <div class="bg-surface-950/50 border border-surface-800 rounded-3xl p-6 flex-1 min-h-[400px]">
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
              
              <div class="px-8 pb-8 flex justify-end shrink-0">
                <button 
                  @click="showReportModal = false; isReportFullscreen = false"
                  class="px-8 h-12 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-xl transition-all active:scale-95"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal: Import Preview -->
    <AdminExpenseImportPreviewModal
      :is-open="isImportPreviewOpen"
      :items="importPreviewItems"
      :results="importResults"
      :is-importing="isImporting"
      @close="closeImportPreview"
      @confirm="handleConfirmImport"
    />

    <!-- Modal: Batch Add Expenses -->
    <ExpenseBatchModal
      :is-open="showBatchModal"
      @close="showBatchModal = false"
      @saved="loadExpenses"
    />

    <!-- Modal: Manage Expense Categories -->
    <ExpenseCategoryFormModal
      :is-open="showCategoryModal"
      @close="showCategoryModal = false"
      @updated="loadCategories"
    />

    <!-- Modal: Mass Edit รายจ่าย -->
    <ExpenseMassEditModal
      :is-open="showMassEditModal"
      :expense-ids="[...selectedExpenseIds]"
      @close="showMassEditModal = false"
      @saved="onMassEditSaved"
    />

    <!-- Modal: แก้ไขรายจ่ายรายวัน -->
    <DayEditModal
      :is-open="showDayEditModal"
      :date="editingDay"
      :expenses="editingDayExpenses"
      @close="showDayEditModal = false"
      @saved="loadExpenses"
    />

    <!-- Modal: รายจ่ายของวันที่เลือก -->
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
          v-if="selectedDay"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/90"
          @click.self="selectedDay = null"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
          >
            <div v-if="selectedDay" class="bg-surface-900 border border-surface-800 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <!-- Header -->
              <div class="px-7 pt-7 pb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-black text-surface-50">{{ formatThaiDate(selectedDay) }}</h3>
                  <p class="text-xs text-surface-500 mt-0.5">{{ selectedDayExpenses.length }} รายการ</p>
                </div>
                <button
                  @click="selectedDay = null"
                  class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X :size="20" />
                </button>
              </div>
              <!-- รายการ -->
              <div class="max-h-[50vh] overflow-y-auto divide-y divide-surface-800">
                <div
                  v-for="exp in selectedDayExpenses"
                  :key="exp.id"
                  class="px-7 py-3 space-y-1"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        class="px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0"
                        :style="getCategoryStyles(exp)"
                      >{{ getCategoryName(exp) }}</span>
                      <span class="text-sm text-surface-200 truncate font-bold">{{ exp.description }}</span>
                    </div>
                    <span class="text-sm font-black text-surface-50 ml-4 shrink-0">฿{{ exp.amount.toLocaleString() }}</span>
                  </div>
                  <div v-if="exp.vendor || exp.unit || exp.quantity" class="flex items-center gap-3 pl-1">
                    <span v-if="exp.vendor" class="text-[11px] text-surface-500 flex items-center gap-1">
                      <span class="text-surface-600">🏪</span>{{ exp.vendor }}
                    </span>
                    <span v-if="exp.vendor && (exp.unit || exp.quantity)" class="text-surface-700 text-[10px]">·</span>
                    <span v-if="exp.quantity || exp.unit" class="text-[11px] text-surface-500 flex items-center gap-1">
                      <span class="text-surface-600">📦</span>
                      <span v-if="exp.quantity">{{ exp.quantity }}</span>
                      <span v-if="exp.unit">{{ exp.unit }}</span>
                    </span>
                  </div>
                </div>
              </div>
              <!-- Footer ยอดรวม -->
              <div class="px-7 py-4 border-t border-surface-800 flex items-center justify-between bg-surface-800/30">
                <button
                  @click="openDayEditModal(selectedDay!); selectedDay = null"
                  class="h-9 px-4 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2"
                >
                  <Pencil :size="14" />
                  <span>แก้ไขรายการ</span>
                </button>
                <div class="flex flex-col items-end">
                  <span class="text-[10px] font-black uppercase tracking-widest text-surface-500">รวมทั้งวัน</span>
                  <span class="text-2xl font-black text-primary-400">฿{{ selectedDayTotal.toLocaleString() }}</span>
                </div>
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
import { Banknote, Plus, Calendar, Filter, Trash2, X, ChevronLeft, ChevronRight, BarChart3, Search, Pencil, CheckSquare, Maximize2, Minimize2, PieChart } from 'lucide-vue-next'
import DayEditModal from '~/components/admin/DayEditModal.vue'
import AdminExpenseFormModal from '~/components/admin/AdminExpenseFormModal.vue'
import ExpenseMassEditModal from '~/components/admin/ExpenseMassEditModal.vue'
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import { useExpenseExcel, type ExpenseImportPreviewItem, type ImportItemResult } from '~/composables/useExpenseExcel'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { db } from '~/db'
import type { Expense } from '~/types'
import ExpenseCategoryFormModal from '~/components/admin/ExpenseCategoryFormModal.vue'
import ExpenseBatchModal from '~/components/admin/ExpenseBatchModal.vue'

definePageMeta({
  layout: 'admin'
})

const toast = useToast()
const { confirm } = useConfirm()
const { lastPullTimestamp } = useMasterDataSync()
const { isOnline } = useSync()
const { exportExpenses, prepareImportData, executeImport, downloadTemplate } = useExpenseExcel()
const { categories: expenseCategories, fetchAll: fetchExpenseCategories } = useExpenseCategories()

// --- State ---
const showExcelMenu = ref(false)
const showAddModal = ref(false)
const editingExpense = ref<Expense | null>(null)
const showBatchModal = ref(false)
const showReportModal = ref(false)
const isReportFullscreen = ref(false)
const isDonutFullscreen = ref(false)
const showCategoryModal = ref(false)
const selectedExpenseIds = ref<Set<number>>(new Set())
const showMassEditModal = ref(false)
const expenses = ref<Expense[]>([])
const filterCategory = ref('')
const searchQuery = ref('')
const filterVendor = ref('')
const currentPage = ref(1)
const itemsPerPage = 20

const selectedDateRange = ref('this_month')
const _now = new Date()
const _pad = (n: number) => String(n).padStart(2, '0')
const _todayStr = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-${_pad(_now.getDate())}`
const customStart = ref(_todayStr)
const customEnd = ref(_todayStr)

function getDateRangeBounds(range: string): { start: string; end: string } {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth()
  const p = (n: number) => String(n).padStart(2, '0')
  switch (range) {
    case 'today': {
      const s = `${y}-${p(m + 1)}-${p(d.getDate())}`
      return { start: s, end: s }
    }
    case 'this_week': {
      const dow = d.getDay()
      const diff = dow === 0 ? 6 : dow - 1
      const mon = new Date(d); mon.setDate(d.getDate() - diff)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return {
        start: `${mon.getFullYear()}-${p(mon.getMonth() + 1)}-${p(mon.getDate())}`,
        end: `${sun.getFullYear()}-${p(sun.getMonth() + 1)}-${p(sun.getDate())}`
      }
    }
    case 'this_month':
      return { start: `${y}-${p(m + 1)}-01`, end: `${y}-${p(m + 1)}-${p(new Date(y, m + 1, 0).getDate())}` }
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1
      const ly = m === 0 ? y - 1 : y
      return { start: `${ly}-${p(lm + 1)}-01`, end: `${ly}-${p(lm + 1)}-${p(new Date(ly, lm + 1, 0).getDate())}` }
    }
    case 'this_year':
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    default:
      return { start: customStart.value, end: customEnd.value }
  }
}

const startDate = computed(() =>
  selectedDateRange.value === 'custom' ? customStart.value : getDateRangeBounds(selectedDateRange.value).start
)
const endDate = computed(() =>
  selectedDateRange.value === 'custom' ? customEnd.value : getDateRangeBounds(selectedDateRange.value).end
)

const excelInput = ref<HTMLInputElement | null>(null)
const isImportPreviewOpen = ref(false)
const isImporting = ref(false)
const importPreviewItems = ref<ExpenseImportPreviewItem[]>([])
const importResults = ref<ImportItemResult[] | null>(null)


// Map รหัสเดิม (Legacy) -> ชื่อไทย (สำหรับข้อมูลเก่า)
const legacyLabels: Record<string, string> = {
  ingredient: 'วัตถุดิบ',
  utility: 'ค่าน้ำ/ไฟ/แก๊ส',
  wage: 'ค่าจ้างพนักงาน',
  rent: 'ค่าเช่าที่',
  supplies: 'วัสดุสิ้นเปลือง',
  other: 'อื่นๆ'
}

// --- Methods ---
async function loadExpenses() {
  const all = await db.expenses.reverse().toArray()
  expenses.value = all.filter(e => !e.isDeleted)
}

async function loadCategories() {
  await fetchExpenseCategories()
}

const filteredExpenses = computed(() => {
  return expenses.value.filter(exp => {
    const matchStart = !startDate.value || exp.expenseDate >= startDate.value
    const matchEnd = !endDate.value || exp.expenseDate <= endDate.value
    
    // กรองหมวดหมู่ (รองรับทั้ง ID และ Legacy Category)
    let matchCat = true
    if (filterCategory.value) {
      matchCat = exp.categoryId === Number(filterCategory.value) || exp.category === filterCategory.value
    }
    
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch = !q || exp.description.toLowerCase().includes(q)

    const matchVendor = !filterVendor.value || exp.vendor === filterVendor.value

    return matchStart && matchEnd && matchCat && matchSearch && matchVendor
  }).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
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

const filterTotalAmount = computed(() =>
  filteredExpenses.value.reduce((sum, e) => sum + e.amount, 0)
)

const vendorList = computed(() =>
  [...new Set(expenses.value.map(e => e.vendor).filter((v): v is string => !!v))].sort()
)

const activeTab = ref<'daily' | 'list' | 'chart'>('daily')
const selectedDay = ref<string | null>(null)

// --- Day Edit Modal ---
const showDayEditModal = ref(false)
const editingDay = ref<string | null>(null)

function openDayEditModal(date: string) {
  editingDay.value = date
  showDayEditModal.value = true
}

const editingDayExpenses = computed(() =>
  editingDay.value ? filteredExpenses.value.filter(e => e.expenseDate === editingDay.value) : []
)

const selectedDayExpenses = computed(() =>
  selectedDay.value ? filteredExpenses.value.filter(e => e.expenseDate === selectedDay.value) : []
)
const selectedDayTotal = computed(() =>
  selectedDayExpenses.value.reduce((sum, e) => sum + e.amount, 0)
)

const dailySummary = computed(() => {
  const map = new Map<string, { date: string; total: number; count: number }>()
  for (const exp of filteredExpenses.value) {
    const d = exp.expenseDate
    if (!map.has(d)) map.set(d, { date: d, total: 0, count: 0 })
    const entry = map.get(d)!
    entry.total += exp.amount
    entry.count++
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
})

const dateRangeLabel = computed(() => {
  const map: Record<string, string> = {
    today: 'วันนี้',
    this_week: 'สัปดาห์นี้',
    this_month: 'เดือนนี้',
    last_month: 'เดือนที่แล้ว',
    this_year: 'ปีนี้',
    custom: 'ช่วงที่เลือก'
  }
  return map[selectedDateRange.value] || ''
})

// --- Chart Data & Options ---
const monthlyChartData = computed(() => {
  const monthMap: Record<string, Record<string, number>> = {}
  
  expenses.value.forEach(e => {
    const month = e.expenseDate.slice(0, 7)
    if (!monthMap[month]) {
      monthMap[month] = {}
    }
    
    const catName = getCategoryName(e)
    if (!monthMap[month][catName]) monthMap[month][catName] = 0
    monthMap[month][catName] += e.amount
  })
  
  const sortedMonths = Object.keys(monthMap).sort().slice(-12)
  const uniqueCatNames = Array.from(new Set(expenses.value.map(e => getCategoryName(e))))
  
  const series = uniqueCatNames.map(name => ({
    name,
    data: sortedMonths.map(m => monthMap[m]?.[name] || 0)
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

// --- Donut Chart: จัดกลุ่มตามหมวดหมู่ ---
// สีสำหรับหมวดหมู่ (palette สวยงาม)
const DONUT_COLORS = [
  '#06b6d4', '#3b82f6', '#f97316', '#a855f7', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899',
  '#84cc16', '#6366f1', '#0ea5e9', '#d946ef', '#22c55e'
]

const donutChartData = computed(() => {
  // จัดกลุ่มตามหมวดหมู่จาก filteredExpenses (ตามช่วงวันที่ที่เลือก)
  const catMap = new Map<string, { total: number; color: string }>()

  for (const exp of filteredExpenses.value) {
    const name = getCategoryName(exp)
    // หาสีจาก category ถ้ามี
    let color = ''
    if (exp.categoryId) {
      const cat = expenseCategories.value.find(c => c.id === exp.categoryId)
      if (cat?.color) color = cat.color
    } else {
      const legacyColors: Record<string, string> = {
        ingredient: '#ef4444', utility: '#3b82f6',
        wage: '#f59e0b', rent: '#8b5cf6',
        supplies: '#06b6d4', other: '#64748b'
      }
      color = legacyColors[exp.category!] || '#64748b'
    }
    if (!catMap.has(name)) {
      catMap.set(name, { total: 0, color })
    }
    catMap.get(name)!.total += exp.amount
  }

  // เรียงจากมากไปน้อย
  const sorted = Array.from(catMap.entries())
    .sort((a, b) => b[1].total - a[1].total)

  // ถ้าหมวดหมู่ไม่มีสี ใช้ palette
  let colorIdx = 0
  const labels = sorted.map(([name]) => name)
  const series = sorted.map(([, v]) => v.total)
  const colors = sorted.map(([, v]) => v.color || DONUT_COLORS[colorIdx++ % DONUT_COLORS.length])

  return { labels, series, colors }
})

const donutChartOptions = computed(() => ({
  chart: {
    background: 'transparent',
    foreColor: '#a8a29e', // สีหลักของ label/text ทั้งหมด
    fontFamily: 'Inter, sans-serif',
    toolbar: { show: false }
  },
  colors: donutChartData.value.colors,
  labels: donutChartData.value.labels,
  stroke: { show: false }, // ไม่ใช้ stroke เหมือน closing-report
  plotOptions: {
    pie: {
      expandOnClick: false,
      donut: {
        size: '65%',
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: '12px',
            fontWeight: '700',
            color: '#a8a29e', // ใช้ foreColor เดียวกัน ไม่ hardcode
            offsetY: -10
          },
          value: {
            show: true,
            fontSize: '20px',
            fontWeight: '900',
            // ไม่กำหนด color เพื่อให้ ApexCharts ใช้ foreColor อัตโนมัติ
            // ทำให้ทำงานได้ทั้ง light และ dark mode
            color: undefined,
            offsetY: 6,
            formatter: (v: string) => `฿${Number(v).toLocaleString()}`
          },
          total: {
            show: true,
            showAlways: true,
            label: 'รวมทั้งหมด',
            color: '#a8a29e',
            fontSize: '11px',
            fontWeight: '700',
            // ใช้ w.globals แบบเดียวกับ closing-report
            formatter: (w: any) => `฿${w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString()}`
          }
        }
      }
    }
  },
  dataLabels: {
    enabled: true,
    // แสดงชื่อหมวดหมู่ + เปอร์เซ็นต์ ใน 2 บรรทัด (pattern เดียวกับ closing-report)
    formatter: (val: number, opts: any) => {
      const name = opts.w.globals.labels[opts.seriesIndex] as string
      const shortName = name.length > 8 ? name.slice(0, 7) + '…' : name
      return `${shortName}\n${val.toFixed(0)}%`
    },
    style: {
      fontSize: '9px',
      fontWeight: 'bold',
      colors: ['#fff']
    },
    dropShadow: { enabled: true, blur: 1, opacity: 0.5 },
    offsetY: 0
  },
  legend: { show: false },
  tooltip: {
    theme: 'dark',
    y: { formatter: (v: number) => `฿${v.toLocaleString()}` }
  }
}))

// รีเซ็ตหน้าและ selection เมื่อตัวกรองหรือ tab เปลี่ยน
watch([selectedDateRange, customStart, customEnd, filterCategory, searchQuery, filterVendor, activeTab], () => {
  currentPage.value = 1
  selectedExpenseIds.value = new Set()
})

function getCategoryName(expense: Expense) {
  if (expense.categoryId) {
    const cat = expenseCategories.value.find(c => c.id === expense.categoryId)
    if (cat) return cat.name
  }
  return legacyLabels[expense.category!] || 'อื่นๆ'
}

function getCategoryStyles(expense: Expense) {
  let color = '#6366f1'
  if (expense.categoryId) {
    const cat = expenseCategories.value.find(c => c.id === expense.categoryId)
    if (cat?.color) color = cat.color
  } else {
    // Legacy colors
    const colors: Record<string, string> = {
      ingredient: '#ef4444',
      utility: '#3b82f6',
      wage: '#f59e0b',
      rent: '#8b5cf6',
      supplies: '#06b6d4',
      other: '#64748b'
    }
    color = colors[expense.category!] || '#64748b'
  }
  return {
    backgroundColor: `${color}1A`, // 10% opacity
    color: color
  }
}

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: '2-digit' 
  })
}


const isAllSelected = computed(() =>
  filteredExpenses.value.length > 0 &&
  filteredExpenses.value.every(e => selectedExpenseIds.value.has(e.id!))
)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedExpenseIds.value = new Set()
  } else {
    selectedExpenseIds.value = new Set(filteredExpenses.value.map(e => e.id!))
  }
}

function toggleSelect(id: number) {
  const next = new Set(selectedExpenseIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedExpenseIds.value = next
}

async function onMassEditSaved() {
  selectedExpenseIds.value = new Set()
  await loadExpenses()
}

function openEditModal(expense: Expense) {
  editingExpense.value = expense
  showAddModal.value = true
}

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
      syncStatus: 'pending',
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

// --- Excel Handlers ---
async function handleExportExcel() {
  try {
    toast.info('กำลังเตรียมไฟล์ Excel...')
    await exportExpenses()
    toast.success('ส่งออกสำเร็จ')
  } catch (err: any) {
    toast.error('ไม่สามารถส่งออกได้: ' + err.message)
  }
}

function handleDownloadTemplate() {
  downloadTemplate()
}

function triggerImport() {
  excelInput.value?.click()
}

async function handleImportExcel(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  if (!file) return

  try {
    toast.info('กำลังตรวจสอบข้อมูล Excel...')
    const items = await prepareImportData(file)
    importPreviewItems.value = items
    isImportPreviewOpen.value = true
  } catch (err: any) {
    toast.error('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message)
  } finally {
    input.value = '' // Reset input
  }
}

function closeImportPreview() {
  isImportPreviewOpen.value = false
  importPreviewItems.value = []
  importResults.value = null
}

async function handleConfirmImport() {
  isImporting.value = true
  try {
    const result = await executeImport(importPreviewItems.value)
    importResults.value = result.results
    await loadExpenses()

    if (result.failed === 0) {
      toast.success(`นำเข้าสำเร็จทั้งหมด ${result.success} รายการ`)
    } else if (result.success > 0) {
      toast.error(`สำเร็จ ${result.success} รายการ, ล้มเหลว ${result.failed} รายการ`)
    } else {
      toast.error(`ล้มเหลวทั้งหมด ${result.failed} รายการ`)
    }
  } catch (err: any) {
    toast.error('เกิดข้อผิดพลาดในการนำเข้า: ' + err.message)
  } finally {
    isImporting.value = false
  }
}

onMounted(async () => {
  await loadCategories()
  await loadExpenses()
})
</script>
