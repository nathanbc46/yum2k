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
            class="bg-transparent border-none text-surface-50 focus:ring-0 text-sm"
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
              class="bg-transparent border-none text-surface-50 focus:ring-0 text-sm"
            />
          </div>
          <div class="flex items-center gap-2 px-3 h-11 bg-surface-950 rounded-xl border border-surface-800">
            <span class="text-[10px] font-black text-surface-500 uppercase">ถึง</span>
            <input
              type="date"
              v-model="customEnd"
              class="bg-transparent border-none text-surface-50 focus:ring-0 text-sm"
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
            class="bg-transparent border-none text-surface-50 focus:ring-0 w-full text-sm"
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
            class="bg-transparent border-none text-surface-50 focus:ring-0 w-full text-sm"
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

      <!-- Tabs -->
      <div class="flex gap-1 bg-surface-900 p-1 rounded-2xl border border-surface-800 self-start">
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
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">วันที่</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">หมวดหมู่</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">คำอธิบาย</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">Vendor</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">หน่วย</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800">ผู้บันทึก</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800 text-right">จำนวนเงิน</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-surface-500 border-b border-surface-800 text-center">จัดการ</th>
              </tr>
          </thead>
          <tbody class="divide-y divide-surface-800">
            <tr v-if="filteredExpenses.length === 0">
              <td colspan="8" class="px-6 py-20 text-center text-surface-600">
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
            >
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
              <td colspan="6" class="px-6 py-4 text-sm font-black text-surface-400 text-right uppercase">รวมรายจ่ายในหน้านี้:</td>
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
                    <CreatableSelect
                      :model-value="form.categoryName || null"
                      :options="categoryOptions"
                      placeholder="หมวดหมู่..."
                      @update:model-value="(v) => form.categoryName = v ?? ''"
                      @create="async (name) => { await addCategory(name, randomColor()); await loadCategories(); form.categoryName = name }"
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
                    required
                    rows="3"
                    placeholder="เช่น ซื้อมะนาว 5 กิโล, จ่ายค่าไฟเดือนเมษา"
                    class="w-full bg-surface-800 border border-surface-700 rounded-2xl p-4 text-surface-50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <!-- Vendor + Unit -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">Vendor (ร้านค้า)</label>
                    <CreatableSelect
                      :model-value="form.vendor || null"
                      :options="vendorSelectOptions"
                      placeholder="ร้านค้า/ผู้จำหน่าย..."
                      @update:model-value="(v) => form.vendor = v ?? ''"
                      @create="(name) => handleVendorCreate(name, form)"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-surface-500 px-1">หน่วย</label>
                    <CreatableSelect
                      :model-value="form.unit || null"
                      :options="unitSelectOptions"
                      placeholder="หน่วย..."
                      @update:model-value="(v) => form.unit = v ?? ''"
                      @create="(name) => handleUnitCreate(name, form)"
                    />
                  </div>
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

    <!-- Modal: Import Preview -->
    <AdminExpenseImportPreviewModal
      :is-open="isImportPreviewOpen"
      :items="importPreviewItems"
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

    <!-- Modal: แก้ไขรายจ่ายรายวัน -->
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
          v-if="showDayEditModal"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
          >
            <div
              v-if="showDayEditModal"
              class="bg-surface-900 border border-surface-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
              :class="dayEditExpanded
                ? 'fixed inset-3 rounded-[1.5rem]'
                : 'relative w-full max-w-4xl max-h-[90vh] rounded-[2rem]'"
            >
              <!-- Header -->
              <div class="px-7 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-surface-800">
                <div>
                  <h3 class="text-xl font-black text-surface-50">แก้ไขรายจ่าย: {{ editingDay ? formatThaiDate(editingDay) : '' }}</h3>
                  <p class="text-xs text-surface-500 mt-0.5">{{ dayEditRows.filter(r => !r._deleted).length }} รายการ</p>
                </div>
                <div class="flex items-center gap-2">
                  <!-- Expand/Collapse -->
                  <button
                    @click="dayEditExpanded = !dayEditExpanded"
                    class="w-10 h-10 bg-surface-800 text-surface-400 hover:text-surface-50 rounded-xl flex items-center justify-center transition-colors"
                    :title="dayEditExpanded ? 'ย่อหน้าต่าง' : 'ขยายหน้าต่าง'"
                  >
                    <Minimize2 v-if="dayEditExpanded" :size="18" />
                    <Maximize2 v-else :size="18" />
                  </button>
                  <button
                    @click="showDayEditModal = false"
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
                      <th class="px-4 py-3 border-b border-surface-700">หน่วย</th>
                      <th class="px-4 py-3 border-b border-surface-700 text-right w-36">จำนวนเงิน</th>
                      <th class="px-4 py-3 border-b border-surface-700 text-center w-16">ลบ</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-800">
                    <tr
                      v-for="(row, idx) in dayEditRows"
                      :key="row.id ?? `new-${idx}`"
                      class="transition-colors"
                      :class="row._deleted ? 'opacity-40 bg-red-500/5' : row._isNew ? 'bg-emerald-500/5' : row._dirty ? 'bg-primary-500/5' : 'hover:bg-surface-800/30'"
                    >
                      <!-- Category -->
                      <td class="px-4 py-2 min-w-[150px]">
                        <CreatableSelect
                          :model-value="row.categoryName || null"
                          :options="categoryOptions"
                          :disabled="row._deleted"
                          placeholder="หมวดหมู่..."
                          @update:model-value="(v) => { row.categoryName = v ?? ''; row._dirty = true }"
                          @create="async (name) => { await addCategory(name, randomColor()); await loadCategories(); row.categoryName = name; row._dirty = true }"
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
                          @input="row._dirty = true"
                        />
                      </td>

                      <!-- Vendor -->
                      <td class="px-4 py-2 min-w-[150px]">
                        <CreatableSelect
                          :model-value="row.vendor || null"
                          :options="vendorSelectOptions"
                          :disabled="row._deleted"
                          placeholder="ร้านค้า..."
                          @update:model-value="(v) => { row.vendor = v ?? ''; row._dirty = true }"
                          @create="(name) => handleVendorCreate(name, row)"
                        />
                      </td>

                      <!-- Unit -->
                      <td class="px-4 py-2 min-w-[120px]">
                        <CreatableSelect
                          :model-value="row.unit || null"
                          :options="unitSelectOptions"
                          :disabled="row._deleted"
                          placeholder="หน่วย..."
                          @update:model-value="(v) => { row.unit = v ?? ''; row._dirty = true }"
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
                          @input="row._dirty = true"
                        />
                      </td>

                      <!-- Delete Toggle -->
                      <td class="px-4 py-2 text-center">
                        <button
                          v-if="!row._deleted"
                          @click="row._deleted = true; row._dirty = false"
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
                <!-- ยอดรวม + ปุ่มเพิ่มแถว -->
                <div class="flex items-center gap-5">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[10px] font-black uppercase tracking-widest text-surface-500">ยอดรวม (หลังลบ)</span>
                    <span class="text-xl font-black text-primary-400">฿{{ dayEditTotal.toLocaleString() }}</span>
                  </div>
                  <button
                    @click="addDayEditRow"
                    class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95"
                  >
                    <Plus :size="16" /> เพิ่มรายการ
                  </button>
                </div>
                <!-- ปุ่มยกเลิก/บันทึก -->
                <div class="flex items-center gap-3">
                  <button
                    @click="showDayEditModal = false"
                    class="px-6 py-3 rounded-2xl text-sm font-bold text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
                  >
                    ปิด
                  </button>
                  <button
                    @click="saveDayEdit"
                    :disabled="dayEditSaving || dayEditChangedCount === 0"
                    class="px-8 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xl shadow-primary-900/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span v-if="dayEditSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <Save v-else :size="16" />
                    <span>บันทึก{{ dayEditChangedCount > 0 ? ` (${dayEditChangedCount} รายการ)` : '' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

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
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm"
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
                  <div v-if="exp.vendor || exp.unit" class="flex items-center gap-3 pl-1">
                    <span v-if="exp.vendor" class="text-[11px] text-surface-500 flex items-center gap-1">
                      <span class="text-surface-600">🏪</span>{{ exp.vendor }}
                    </span>
                    <span v-if="exp.vendor && exp.unit" class="text-surface-700 text-[10px]">·</span>
                    <span v-if="exp.unit" class="text-[11px] text-surface-500 flex items-center gap-1">
                      <span class="text-surface-600">📦</span>{{ exp.unit }}
                    </span>
                  </div>
                </div>
              </div>
              <!-- Footer ยอดรวม -->
              <div class="px-7 py-4 border-t border-surface-800 flex items-center justify-between bg-surface-800/30">
                <span class="text-xs font-black uppercase tracking-widest text-surface-500">รวมทั้งวัน</span>
                <span class="text-2xl font-black text-primary-400">฿{{ selectedDayTotal.toLocaleString() }}</span>
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
import { Banknote, Plus, Calendar, Filter, Trash2, X, Save, ChevronLeft, ChevronRight, BarChart3, Search, Pencil, Maximize2, Minimize2 } from 'lucide-vue-next'
import CreatableSelect from '~/components/admin/CreatableSelect.vue'
import { useProfitability } from '~/composables/useProfitability'
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import { useExpenseExcel, type ExpenseImportPreviewItem } from '~/composables/useExpenseExcel'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { db } from '~/db'
import { v4 as uuidv4 } from 'uuid'
import type { Expense, ExpenseCategoryRecord } from '~/types'
import ExpenseCategoryFormModal from '~/components/admin/ExpenseCategoryFormModal.vue'
import ExpenseBatchModal from '~/components/admin/ExpenseBatchModal.vue'

definePageMeta({
  layout: 'admin'
})

const { addExpense, updateExpense } = useProfitability()
const authStore = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
const { lastPullTimestamp } = useMasterDataSync()
const { isOnline } = useSync()
const { exportExpenses, prepareImportData, executeImport, downloadTemplate } = useExpenseExcel()
const { categories: expenseCategories, fetchAll: fetchExpenseCategories, addCategory } = useExpenseCategories()

// --- State ---
const showExcelMenu = ref(false)
const showAddModal = ref(false)
const showBatchModal = ref(false)
const showReportModal = ref(false)
const showCategoryModal = ref(false)
const editingId = ref<number | null>(null)
const isSubmitting = ref(false)
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
const importPreviewItems = ref<ExpenseImportPreviewItem[]>([])

const form = ref({
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryName: '',
  categoryId: undefined as number | undefined,
  categoryUuid: '',
  category: undefined as any, // fallback
  amount: 0,
  description: '',
  vendor: '',
  unit: '',
})

// --- Category Options ---
const categoryOptions = computed(() =>
  expenseCategories.value.map(c => ({ value: c.name, label: c.name, color: c.color }))
)

function randomColor() {
  const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316']
  return palette[Math.floor(Math.random() * palette.length)]
}

// --- Vendor / Unit Options (shared across modals) ---
const DEFAULT_UNITS = ['กรัม', 'กิโลกรัม', 'มิลลิลิตร', 'ลิตร', 'กล่อง', 'ชิ้น', 'แพ็ค', 'โหล', 'ถุง', 'ขวด']
const vendorOptions = ref<string[]>([])
const unitOptions = ref<string[]>([...DEFAULT_UNITS])

const vendorSelectOptions = computed(() => vendorOptions.value.map(v => ({ value: v, label: v })))
const unitSelectOptions = computed(() => unitOptions.value.map(u => ({ value: u, label: u })))

async function loadVendorUnitOptions() {
  const all = await db.expenses.filter(e => !e.isDeleted && !!e.vendor).toArray()
  vendorOptions.value = [...new Set(all.map(e => e.vendor!).filter(Boolean))]
  const allUnits = await db.expenses.filter(e => !e.isDeleted && !!e.unit).toArray()
  unitOptions.value = [...new Set([...DEFAULT_UNITS, ...allUnits.map(e => e.unit!).filter(Boolean)])]
}

function handleVendorCreate(name: string, target: { vendor: string; _dirty?: boolean }) {
  if (!vendorOptions.value.includes(name)) vendorOptions.value.push(name)
  target.vendor = name
  if ('_dirty' in target) (target as any)._dirty = true
}

function handleUnitCreate(name: string, target: { unit: string; _dirty?: boolean }) {
  if (!unitOptions.value.includes(name)) unitOptions.value.push(name)
  target.unit = name
  if ('_dirty' in target) (target as any)._dirty = true
}

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
  const firstCat = expenseCategories.value[0]
  if (!form.value.categoryId && firstCat) {
    form.value.categoryId = firstCat.id
    form.value.categoryUuid = firstCat.uuid
    form.value.categoryName = firstCat.name
  }
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

const filterTotalAmount = computed(() =>
  filteredExpenses.value.reduce((sum, e) => sum + e.amount, 0)
)

const vendorList = computed(() =>
  [...new Set(expenses.value.map(e => e.vendor).filter((v): v is string => !!v))].sort()
)

const activeTab = ref<'daily' | 'list'>('daily')
const selectedDay = ref<string | null>(null)

// --- Day Edit Modal ---
interface DayEditRow {
  id?: number           // undefined สำหรับแถวใหม่
  categoryName: string
  categoryId: number | undefined
  categoryUuid: string
  description: string
  vendor: string
  unit: string
  amount: number
  _dirty: boolean
  _deleted: boolean
  _isNew: boolean       // true = ยังไม่มีใน DB
}

const showDayEditModal = ref(false)
const dayEditExpanded = ref(false)
const editingDay = ref<string | null>(null)
const dayEditRows = ref<DayEditRow[]>([])
const dayEditSaving = ref(false)

function addDayEditRow() {
  const defaultCat = expenseCategories.value[0]
  dayEditRows.value.push({
    categoryName: defaultCat?.name || '',
    categoryId: defaultCat?.id,
    categoryUuid: defaultCat?.uuid || '',
    description: '',
    vendor: '',
    unit: '',
    amount: 0,
    _dirty: false,
    _deleted: false,
    _isNew: true,
  })
}

function openDayEditModal(date: string) {
  editingDay.value = date
  dayEditExpanded.value = false
  const dayExpenses = filteredExpenses.value.filter(e => e.expenseDate === date)
  dayEditRows.value = dayExpenses.map(e => ({
    id: e.id!,
    categoryName: getCategoryName(e),
    categoryId: e.categoryId,
    categoryUuid: e.categoryUuid || '',
    description: e.description,
    vendor: e.vendor || '',
    unit: e.unit || '',
    amount: e.amount,
    _dirty: false,
    _deleted: false,
    _isNew: false,
  }))
  showDayEditModal.value = true
}

async function saveDayEdit() {
  dayEditSaving.value = true
  try {
    const user = authStore.currentUser
    const toDelete = dayEditRows.value.filter(r => r._deleted && !r._isNew)
    const toUpdate = dayEditRows.value.filter(r => r._dirty && !r._deleted && !r._isNew)
    const toCreate = dayEditRows.value.filter(r => r._isNew && !r._deleted && r.description.trim() && r.amount > 0)

    await Promise.all([
      ...toDelete.map(r => db.expenses.update(r.id!, { isDeleted: true, syncStatus: 'pending', updatedAt: new Date() })),
      ...toUpdate.map(r => {
        const cat = expenseCategories.value.find(c => c.name === r.categoryName)
        return db.expenses.update(r.id!, {
          categoryId: cat?.id ?? r.categoryId,
          categoryUuid: cat?.uuid ?? r.categoryUuid ?? undefined,
          description: r.description,
          vendor: r.vendor || undefined,
          unit: r.unit || undefined,
          amount: r.amount,
          syncStatus: 'pending' as const,
          updatedAt: new Date(),
        })
      }),
      ...toCreate.map(r => {
        const cat = expenseCategories.value.find(c => c.name === r.categoryName)
        return db.expenses.add({
          uuid: uuidv4(),
          expenseDate: editingDay.value!,
          categoryId: cat?.id,
          categoryUuid: cat?.uuid,
          description: r.description,
          vendor: r.vendor || undefined,
          unit: r.unit || undefined,
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
    showDayEditModal.value = false
    await loadExpenses()
  } catch (e) {
    toast.error('บันทึกไม่สำเร็จ')
  } finally {
    dayEditSaving.value = false
  }
}

const dayEditTotal = computed(() =>
  dayEditRows.value.filter(r => !r._deleted).reduce((sum, r) => sum + (r.amount || 0), 0)
)
const dayEditChangedCount = computed(() =>
  dayEditRows.value.filter(r => r._dirty || r._deleted || (r._isNew && !r._deleted && r.description.trim() && r.amount > 0)).length
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

// รีเซ็ตหน้าเมื่อตัวกรองเปลี่ยน
watch([selectedDateRange, customStart, customEnd, filterCategory, searchQuery, filterVendor], () => {
  currentPage.value = 1
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


async function handleSubmit() {
  if (form.value.amount <= 0) {
    toast.error('กรุณาระบุจำนวนเงินให้ถูกต้อง')
    return
  }

  isSubmitting.value = true
  try {
    const user = authStore.currentUser

    // resolve categoryId จาก categoryName (รองรับสร้างใหม่)
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
      amount: form.value.amount,
    }

    if (editingId.value) {
      await updateExpense(editingId.value, { ...payload, updatedAt: new Date(), syncStatus: 'pending' })
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
  }
}

function openEditModal(expense: Expense) {
  editingId.value = expense.id!
  form.value = {
    expenseDate: expense.expenseDate,
    categoryName: getCategoryName(expense),
    categoryId: expense.categoryId,
    categoryUuid: expense.categoryUuid || '',
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    vendor: expense.vendor || '',
    unit: expense.unit || '',
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
}

async function handleConfirmImport() {
  try {
    toast.info('กำลังบันทึกข้อมูลรายจ่าย...')
    const result = await executeImport(importPreviewItems.value)
    
    if (result.success > 0) {
      toast.success(`นำเข้าสำเร็จ ${result.success} รายการ`)
    }
    
    if (result.failed > 0) {
      toast.error(`ล้มเหลว ${result.failed} รายการ`)
    }
    
    closeImportPreview()
    await loadExpenses()
  } catch (err: any) {
    toast.error('เกิดข้อผิดพลาดในการนำเข้า: ' + err.message)
  }
}

onMounted(async () => {
  await loadCategories()
  await loadExpenses()
  await loadVendorUnitOptions()
})
</script>
