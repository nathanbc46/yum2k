<!-- =============================================================================
  pages/admin/closing-report.vue
  หน้าสรุปยอดปิดร้านรายวัน (Daily Closing Report)
============================================================================= -->
<template>
  <div class="flex flex-col h-full bg-surface-950 text-surface-50 overflow-hidden">

    <!-- Page Header -->
    <header class="px-6 py-4 border-b border-surface-800 shrink-0 bg-surface-900/50">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-xl font-bold flex items-center gap-2">🏪 สรุปยอดปิดร้าน</h1>
          <p class="text-xs text-surface-500 mt-0.5">{{ displayDate }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <input v-model="selectedDate" type="date" @change="loadData"
            class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none" />
          <button @click="loadData" :disabled="isLoading"
            class="p-2 bg-surface-800 hover:bg-surface-700 rounded-xl border border-surface-700 transition-colors disabled:opacity-50">🔄</button>
          <button @click="openAiModal('insight')"
            class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl text-sm font-black transition-all hover:shadow-lg hover:shadow-primary-500/20 active:scale-95">
            🤖 วิเคราะห์ AI
          </button>
          <button @click="openAiModal('chat')"
            class="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl text-sm font-bold border border-surface-700 transition-all active:scale-95">
            💬 แชทกับ AI
          </button>
          <button @click="showPrintModal = true"
            class="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded-xl border border-primary-500/30 text-sm font-bold transition-all">
            🖨️ พิมพ์ใบสรุป
          </button>
        </div>
      </div>

      <!-- Filters Row (Removed Category/Product Filters) -->
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center text-surface-500">
      <span class="animate-spin text-2xl mr-3">⌛</span> กำลังคำนวณยอด...
    </div>

    <!-- No Data -->
    <div v-else-if="todayOrders.length === 0 && stats.orderCount === 0"
      class="flex-1 flex flex-col items-center justify-center text-surface-500">
      <div class="text-5xl mb-4 opacity-40">🏪</div>
      <p class="text-lg font-medium">ยังไม่มีข้อมูลการขายในวันนี้</p>
    </div>

    <!-- Report Content -->
    <div v-else class="flex-1 overflow-y-auto p-5 space-y-5">

      <!-- KPI Cards (ตามตัวกรอง) -->
      <section class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div class="bg-gradient-to-br from-blue-600/20 to-white dark:to-surface-900 border border-blue-600/40 rounded-2xl p-4 shadow-sm">
          <div class="text-[10px] uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-1 font-bold">ยอดขายรวม</div>
          <div class="text-3xl font-black text-blue-700 dark:text-blue-400">฿{{ stats.revenue.toLocaleString() }}</div>
          <div class="text-xs text-surface-500 mt-1 font-medium">{{ stats.orderCount }} บิล</div>
        </div>

        <div class="bg-gradient-to-br from-red-500/20 to-surface-900 border border-red-500/20 rounded-2xl p-4">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">รายจ่ายเฉลี่ย/วัน</div>
          <div class="text-2xl font-black text-red-400">฿{{ dailyAvgExpense.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</div>
          <div class="text-xs text-surface-500 mt-1">เฉลี่ยเดือน {{ expenseMonthLabel }}</div>
        </div>

        <div :class="[
          'relative overflow-hidden border-2 rounded-2xl p-4 transition-all duration-500 shadow-xl',
          (stats.revenue - dailyAvgExpense) >= 0 
            ? 'bg-gradient-to-br from-success/30 to-white dark:to-surface-900 border-success/50 shadow-success/20 animate-pulse-subtle' 
            : 'bg-gradient-to-br from-red-500/30 to-white dark:to-surface-900 border-red-500/50 shadow-red-500/20 animate-pulse-subtle'
        ]">
          <!-- Shine Effect Overlay (เพิ่มความชัดเจน) -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shine" />
          </div>

          <div :class="['text-[10px] uppercase tracking-widest mb-1 flex justify-between items-center font-bold', (stats.revenue - dailyAvgExpense) >= 0 ? 'text-success-700 dark:text-success/80' : 'text-red-700 dark:text-red-400/80']">
            <span>กำไรสุทธิ</span>
            <span v-if="(stats.revenue - dailyAvgExpense) >= 0" class="animate-bounce text-lg">🚀</span>
            <span v-else class="animate-bounce text-red-600 text-lg">🚨</span>
          </div>
          <div :class="['text-3xl font-black relative z-10', (stats.revenue - dailyAvgExpense) >= 0 ? 'text-success-600 dark:text-success' : 'text-red-600 dark:text-red-400']">
            {{ (stats.revenue - dailyAvgExpense) < 0 ? '-' : '' }}฿{{ Math.abs(stats.revenue - dailyAvgExpense).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
          </div>
          <div class="text-[10px] text-surface-500 dark:text-surface-500 mt-1 font-medium">
            ยอดขาย - รายจ่ายเฉลี่ย
          </div>
        </div>

        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-4">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">เฉลี่ยต่อบิล</div>
          <div class="text-2xl font-black">฿{{ stats.orderCount > 0 ? Math.round(stats.revenue / stats.orderCount).toLocaleString() : 0 }}</div>
          <div class="text-[10px] text-surface-500 mt-1">฿{{ stats.revenue.toLocaleString() }} / {{ stats.orderCount }} บิล</div>
          <div v-if="stats.orderCount > 0" class="text-[10px] text-surface-500 mt-0.5">เฉลี่ย {{ (stats.itemCount / stats.orderCount).toFixed(1) }} รายการ/บิล</div>
        </div>

        <div class="bg-gradient-to-br from-warning/20 to-surface-900 border border-warning/20 rounded-2xl p-4">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">ต้นทุนรวม</div>
          <div class="text-2xl font-black text-warning">฿{{ stats.cost.toLocaleString() }}</div>
          <div class="text-xs text-surface-500 mt-1">COGS (ค่าของสด)</div>
        </div>

        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-4">
          <div class="text-[10px] uppercase tracking-widest text-surface-500 mb-1">กำไรสินค้า (GP)</div>
          <div class="text-2xl font-black text-surface-50">฿{{ stats.profit.toLocaleString() }}</div>
          <div class="text-xs text-surface-500 mt-1">Margin {{ stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0 }}%</div>
        </div>
      </section>

      <!-- Payment + Category -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- การชำระเงิน -->
        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col">
          <h2 class="text-sm font-bold mb-4">💳 ยอดแยกตามประเภทชำระ</h2>
          <div class="space-y-3 flex-1">
            <div v-for="pm in paymentBreakdown" :key="pm.method"
              class="flex items-center justify-between p-3 rounded-xl bg-surface-800/60">
              <div class="flex items-center gap-2">
                <span class="text-base">{{ pm.icon }}</span>
                <div>
                  <div class="text-sm font-semibold">{{ pm.label }}</div>
                  <div class="text-xs text-surface-500">{{ pm.count }} บิล</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-success">฿{{ pm.total.toLocaleString() }}</div>
                <div class="text-xs text-surface-500">{{ stats.revenue > 0 ? ((pm.total / stats.revenue) * 100).toFixed(1) : 0 }}%</div>
              </div>
            </div>
            <div v-if="paymentBreakdown.length === 0" class="text-center text-surface-500 text-sm py-4">ไม่มีข้อมูล</div>
          </div>
        </div>

        <!-- สัดส่วนหมวดหมู่ -->
        <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col min-h-[300px]">
          <h2 class="text-sm font-bold mb-4">🍩 สัดส่วนยอดขายตามหมวดหมู่</h2>
          <div class="flex-1 flex items-center justify-center min-h-0">
            <ClientOnly>
              <apexchart v-if="categoryDonutSeries.length > 0"
                type="donut" width="100%" :options="categoryDonutOptions" :series="categoryDonutSeries" />
              <div v-else class="text-surface-500 text-sm">ไม่มีข้อมูล</div>
            </ClientOnly>
          </div>
          <!-- Legend หมวดหมู่ -->
          <div v-if="activeCategorySegments.length > 0" class="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-3 border-t border-surface-800 justify-center">
            <div v-for="seg in activeCategorySegments" :key="seg.categoryName"
              class="flex items-center gap-1.5 text-[10px] text-surface-400">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: seg.color }" />
              <span>{{ seg.categoryName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ยอดขายรายชั่วโมง (Stacked by Product) -->
      <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <h2 class="text-sm font-bold mb-4">⏰ ยอดขายรายชั่วโมง (แยกตามสินค้า)</h2>
        <div class="space-y-2">
          <div v-for="h in hourlyStats.filter(h => h.count > 0)" :key="h.hour" class="flex items-center gap-2">
            <div class="text-xs text-surface-500 w-14 shrink-0">{{ h.hour }}:00</div>
            <!-- Stacked Bar -->
            <div class="flex-1 rounded-full h-6 overflow-hidden flex items-stretch bg-surface-800/30">
              <div
                v-for="(seg, i) in h.segments"
                :key="seg.name"
                :style="{
                  flex: `0 0 ${(seg.revenue / maxHourlyRevenue) * 100}%`,
                  backgroundColor: seg.color
                }"
                :title="`${seg.name}: ฿${seg.revenue.toLocaleString()}`"
                class="h-full transition-all duration-700 flex items-center justify-center min-w-[2px] border-r border-dashed border-white/20 last:border-r-0"
                :class="i === h.segments.length - 1 ? 'rounded-r-full' : ''"
              >
                <span v-if="((seg.revenue / maxHourlyRevenue) * 100) > 8" class="text-[9px] font-bold text-white/90 truncate px-1 whitespace-nowrap">
                  {{ seg.name }}
                </span>
              </div>
            </div>
            <!-- Label ยอดรวม -->
            <div class="text-xs font-mono font-bold text-surface-200 w-16 text-right shrink-0">
              ฿{{ h.revenue.toLocaleString() }}
            </div>
            <div class="text-xs text-surface-500 w-10 text-right shrink-0">{{ h.count }} บิล</div>
          </div>
          <div v-if="hourlyStats.every(h => h.count === 0)" class="text-center text-surface-500 text-sm py-4">ไม่มีข้อมูล</div>
        </div>
      </div>

      <!-- Top Products -->
      <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <h2 class="text-sm font-bold mb-4">⭐ สินค้าขายดีประจำวัน (Top 10)</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="(p, idx) in computedTopProducts" :key="p.productName"
            class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-800/50 transition-colors">
            <div class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
              :class="idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-surface-700 text-surface-300' : idx === 2 ? 'bg-orange-900/40 text-orange-400' : 'bg-surface-800 text-surface-500'">
              {{ idx + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ p.productName }}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-bold text-success">฿{{ p.totalRevenue.toLocaleString() }}</div>
              <div class="text-xs text-surface-500">{{ p.quantitySold }} ชิ้น</div>
            </div>
          </div>
          <div v-if="computedTopProducts.length === 0" class="col-span-2 text-center text-surface-500 text-sm py-4">ไม่มีข้อมูล</div>
        </div>
      </div>

      <!-- Order List -->
      <div class="bg-surface-900 border border-surface-800 rounded-2xl p-5">
        <div class="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 class="text-sm font-bold">📜 รายการบิลวันนี้ ({{ todayOrders.length }} บิล)</h2>
          <span class="text-xs text-surface-500">* คลิกเลขบิลเพื่อดูรายละเอียด</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead>
              <tr class="text-surface-500 text-xs border-b border-surface-800">
                <th class="py-2 pr-4 font-medium whitespace-nowrap">เวลา</th>
                <th class="py-2 pr-4 font-medium whitespace-nowrap">เลขบิล</th>
                <th class="py-2 pr-4 font-medium">สินค้าในบิล</th>
                <th class="py-2 pr-4 font-medium whitespace-nowrap">ชำระ</th>
                <th class="py-2 text-right font-medium whitespace-nowrap">ยอด</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-800/50">
              <tr v-for="order in todayOrders" :key="order.uuid"
                class="hover:bg-surface-800/40 transition-colors cursor-pointer"
                @click="openOrderDetail(order)">
                <td class="py-2 pr-4 text-surface-400 text-xs whitespace-nowrap">
                  {{ new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }}
                </td>
                <td class="py-2 pr-4">
                  <span class="font-mono text-xs text-primary-400 hover:text-primary-300 underline underline-offset-2">
                    {{ order.orderNumber }}
                  </span>
                </td>
                <td class="py-2 pr-4 max-w-xs">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="item in (order.items || [])"
                      :key="item.productName + item.quantity"
                      class="inline-flex items-center gap-1 text-xs bg-surface-800 text-surface-300 px-1.5 py-0.5 rounded-md whitespace-nowrap"
                    >
                      <span class="font-medium">{{ item.productName }}</span>
                      <span class="text-surface-500">×{{ item.quantity }}</span>
                    </span>
                  </div>
                </td>
                <td class="py-2 pr-4 whitespace-nowrap">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-surface-300">
                    {{ order.paymentMethod === 'cash' ? '💵 เงินสด' : order.paymentMethod === 'promptpay' ? '📲 พร้อมเพย์' : order.paymentMethod === 'card' ? '💳 บัตร' : order.paymentMethod }}
                  </span>
                </td>
                <td class="py-2 text-right font-bold text-success whitespace-nowrap">฿{{ order.totalAmount.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== MODAL: Order Detail ===== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="selectedOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="selectedOrder = null">
          <div class="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-5 border-b border-surface-800">
              <div>
                <div class="font-bold text-lg">รายละเอียดบิล</div>
                <div class="text-xs text-surface-400 font-mono mt-0.5">{{ selectedOrder.orderNumber }}</div>
              </div>
              <button @click="selectedOrder = null" class="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors text-surface-400 hover:text-surface-100">✕</button>
            </div>

            <!-- Modal Body -->
            <div class="flex-1 overflow-y-auto p-5 space-y-4">
              <!-- Order Meta -->
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="bg-surface-800/60 rounded-xl p-3">
                  <div class="text-xs text-surface-500 mb-1">วัน-เวลา</div>
                  <div class="font-medium">{{ formatDateTime(selectedOrder.createdAt) }}</div>
                </div>
                <div class="bg-surface-800/60 rounded-xl p-3">
                  <div class="text-xs text-surface-500 mb-1">ผู้รับออร์เดอร์</div>
                  <div class="font-medium">{{ selectedOrder.staffName || '—' }}</div>
                </div>
                <div class="bg-surface-800/60 rounded-xl p-3">
                  <div class="text-xs text-surface-500 mb-1">ประเภทชำระ</div>
                  <div class="font-medium">
                    {{ selectedOrder.paymentMethod === 'cash' ? '💵 เงินสด' : selectedOrder.paymentMethod === 'promptpay' ? '📲 พร้อมเพย์' : selectedOrder.paymentMethod === 'card' ? '💳 บัตร' : 'อื่นๆ' }}
                  </div>
                </div>
                <div class="bg-surface-800/60 rounded-xl p-3">
                  <div class="text-xs text-surface-500 mb-1">รับเงิน / ทอน</div>
                  <div class="font-medium">฿{{ selectedOrder.amountReceived.toLocaleString() }} / ฿{{ selectedOrder.changeAmount.toLocaleString() }}</div>
                </div>
              </div>

              <!-- Items -->
              <div class="bg-surface-800/40 rounded-xl overflow-hidden">
                <div class="px-4 py-2 border-b border-surface-700 text-xs font-semibold text-surface-400 uppercase tracking-wider">รายการสินค้า</div>
                <div class="divide-y divide-surface-700/50">
                  <div v-for="item in selectedOrder.items" :key="item.productName + item.quantity"
                    class="flex items-center justify-between px-4 py-3">
                    <div class="flex-1 min-w-0 pr-3">
                      <div class="text-sm font-medium truncate">{{ item.productName }}</div>
                      <div v-if="item.addons?.length" class="text-xs text-surface-500 mt-0.5">
                        ตัวเลือก: {{ item.addons.map((a: any) => a.name).join(', ') }}
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="text-xs text-surface-400">{{ item.quantity }} × ฿{{ item.unitPrice.toLocaleString() }}</div>
                      <div class="font-bold text-surface-50">฿{{ item.totalPrice.toLocaleString() }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Note -->
              <div v-if="selectedOrder.note" class="bg-surface-800/40 rounded-xl px-4 py-3 text-sm text-surface-300 italic">
                📝 {{ selectedOrder.note }}
              </div>
            </div>

            <!-- Modal Footer Summary -->
            <div class="p-5 border-t border-surface-800 space-y-2">
              <div class="flex justify-between text-sm text-surface-400">
                <span>ยอดรวม</span><span>฿{{ selectedOrder.subtotal.toLocaleString() }}</span>
              </div>
              <div v-if="selectedOrder.discountAmount > 0" class="flex justify-between text-sm text-surface-400">
                <span>ส่วนลด</span><span class="text-danger">-฿{{ selectedOrder.discountAmount.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-black text-lg">
                <span>ยอดสุทธิ</span>
                <span class="text-success">฿{{ selectedOrder.totalAmount.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ===== MODAL: Print Preview ===== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPrintModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          @click.self="showPrintModal = false">
          <div class="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
            <!-- Print Header -->
            <div class="flex items-center justify-between p-4 border-b">
              <span class="font-bold text-base">🖨️ ตัวอย่างใบสรุป</span>
              <div class="flex gap-2">
                <button @click="doPrint" class="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">พิมพ์</button>
                <button @click="showPrintModal = false" class="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300 transition-colors">ปิด</button>
              </div>
            </div>

            <!-- Print Content -->
            <div id="print-area" class="flex-1 overflow-y-auto p-5 text-sm space-y-3 font-mono">
              <div class="text-center font-bold text-lg border-b pb-2">🍋 Yum2K POS</div>
              <div class="text-center text-gray-500 text-xs">สรุปยอดประจำวัน</div>
              <div class="text-center font-medium">{{ displayDate }}</div>

              <div class="border-t border-dashed pt-2 space-y-1">
                <div class="flex justify-between"><span>จำนวนบิล</span><span class="font-bold">{{ stats.orderCount }} บิล</span></div>
                <div class="flex justify-between"><span>ยอดขายรวม</span><span class="font-bold text-green-700">฿{{ stats.revenue.toLocaleString() }}</span></div>
                <div class="flex justify-between"><span>ต้นทุนรวม</span><span>฿{{ stats.cost.toLocaleString() }}</span></div>
                <div class="flex justify-between font-bold border-t border-dashed pt-1 mt-1"><span>กำไรสินค้า (GP)</span><span class="text-green-700">฿{{ stats.profit.toLocaleString() }}</span></div>
              </div>

              <div class="border-t border-dashed pt-2">
                <div class="font-bold mb-1">แยกตามประเภทชำระ:</div>
                <div v-for="pm in paymentBreakdown" :key="pm.method" class="flex justify-between">
                  <span>{{ pm.icon }} {{ pm.label }} ({{ pm.count }} บิล)</span>
                  <span>฿{{ pm.total.toLocaleString() }}</span>
                </div>
              </div>

              <div class="border-t border-dashed pt-2">
                <div class="font-bold mb-1">Top 5 สินค้าขายดี:</div>
                <div v-for="(p, i) in computedTopProducts.slice(0, 5)" :key="p.productName" class="flex justify-between">
                  <span>{{ i + 1 }}. {{ p.productName }}</span>
                  <span>{{ p.quantitySold }} ชิ้น</span>
                </div>
              </div>

              <div class="border-t border-dashed pt-2 text-center text-gray-400 text-xs">
                พิมพ์เมื่อ {{ new Date().toLocaleString('th-TH') }}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AdminAiAnalysisModal
      v-if="isAiModalOpen"
      :data="aiData"
      :initial-tab="aiModalInitialTab"
      analysis-mode="daily"
      source-title="สรุปยอดปิดร้าน"
      @close="isAiModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useReports } from '~/composables/useReports'
import { useProfitability } from '~/composables/useProfitability'
import AdminAiAnalysisModal from '~/components/admin/AiAnalysisModal.vue'
import type { Order, Category, Product } from '~/types'
import { db } from '~/db'

definePageMeta({ layout: 'admin' })

const { getTopProducts } = useReports()
const { getSummary: getExpenseSummary } = useProfitability()

function formatDate(d: Date) {
  // วิธีที่ชัวร์ที่สุดสำหรับระบบที่อาจเป็น พ.ศ. หรือ ค.ศ.
  let year = d.getFullYear()
  if (year > 2400) year -= 543
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dailyAvgExpense = ref(0)
const monthTotalExpenses = ref(0)
const expenseMonthLabel = ref('')

// --- State ---
const today = new Date().toISOString().slice(0, 10)
const selectedDate = ref(today)
const isLoading = ref(true)

const stats = ref({ revenue: 0, cost: 0, profit: 0, orderCount: 0, itemCount: 0 })
const todayOrders = ref<Order[]>([])
const categories = ref<Category[]>([])
const allProducts = ref<Product[]>([])
const topProductsData = ref<{ productName: string; quantitySold: number; totalRevenue: number }[]>([])

// --- Modal State ---
const selectedOrder = ref<Order | null>(null)
const showPrintModal = ref(false)
const isAiModalOpen = ref(false)
const aiModalInitialTab = ref<'insight' | 'chat'>('insight')

function openAiModal(tab: 'insight' | 'chat') {
  aiModalInitialTab.value = tab
  isAiModalOpen.value = true
}

const aiData = computed(() => {
  // คำนวณความนิยมสินค้าตามชั่วโมง (เฉพาะวันนี้)
  const pByH: Record<string, Record<number, number>> = {}
  // คำนวณความนิยมสินค้าตามวัน (สำหรับหน้านี้คือแค่วันเดียว)
  const pByD: Record<string, Record<string, number>> = {}
  // คำนวณยอดบิลรายชั่วโมง (สำหรับหน้านี้)
  const sByH: Record<number, Record<number, number>> = {}

  const d = new Date(selectedDate.value)
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()
  const dayIdx = [0, 1, 2, 3, 4, 5, 6].indexOf(d.getDay()) // Day index (Sun=0)

  for (const order of todayOrders.value) {
    const h = new Date(order.createdAt).getHours()
    
    // 1. ยอดบิลรายชั่วโมง
    if (!sByH[dayIdx]) sByH[dayIdx] = {}
    const billRow = sByH[dayIdx]
    if (billRow) {
      billRow[h] = (billRow[h] || 0) + 1
    }

    for (const item of (order.items || [])) {
      // 2. สินค้ารายชั่วโมง
      if (!pByH[item.productName]) pByH[item.productName] = {}
      const hourRow = pByH[item.productName]
      if (hourRow) {
        hourRow[h] = (hourRow[h] || 0) + item.quantity
      }

      // 3. สินค้ารายวัน (เฉพาะวันนี้)
      if (!pByD[item.productName]) pByD[item.productName] = {}
      const dayRow = pByD[item.productName]
      if (dayRow) {
        dayRow[dayName] = (dayRow[dayName] || 0) + item.quantity
      }
    }
  }
  
  return {
    revenue: stats.value.revenue,
    cost: stats.value.cost,
    productProfitGP: stats.value.profit, // กำไรสินค้า (GP)
    netProfit: stats.value.revenue - dailyAvgExpense.value, // กำไรสุทธิ (หักรายจ่ายเฉลี่ย)
    dailyAvgExpense: dailyAvgExpense.value,
    actualTotalExpenses: monthTotalExpenses.value, // ส่งรายจ่ายรวมของเดือนให้ AI ด้วย
    orderCount: todayOrders.value.length,
    topProducts: computedTopProducts.value,
    hourlyStats: hourlyStats.value.map(h => ({ hour: h.hour, count: h.count, revenue: h.revenue })),
    dateRange: {
      start: new Date(selectedDate.value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
      end: new Date(selectedDate.value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    },
    categoryStats: activeCategorySegments.value.map(seg => {
      // คำนวณยอดรวมของแต่ละหมวดหมู่จาก hourlyStats
      const total = hourlyStats.value.reduce((sum, h) => {
        const s = h.segments.find(s => s.categoryName === seg.categoryName)
        return sum + (s ? s.revenue : 0)
      }, 0)
      return { categoryName: seg.categoryName, value: total }
    }),
    // ข้อมูลเชิงลึกใหม่ตามที่ขอ
    salesByDayHour: sByH,
    productByDay: Object.entries(pByD).map(([name, days]) => ({ name, days })),
    productByHour: Object.entries(pByH).map(([name, hours]) => ({ name, hours }))
  }
})

// --- Computed ---
const displayDate = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const paymentBreakdown = computed(() => {
  const methods: Record<string, { method: string; label: string; icon: string; total: number; count: number }> = {}
  for (const order of todayOrders.value) {
    const m = order.paymentMethod || 'other'
    if (!methods[m]) {
      methods[m] = {
        method: m,
        label: m === 'cash' ? 'เงินสด' : m === 'promptpay' ? 'พร้อมเพย์' : m === 'card' ? 'บัตรเครดิต' : 'อื่นๆ',
        icon: m === 'cash' ? '💵' : m === 'promptpay' ? '📲' : m === 'card' ? '💳' : '💰',
        total: 0, count: 0
      }
    }
    methods[m].total += order.totalAmount
    methods[m].count++
  }
  return Object.values(methods).sort((a, b) => b.total - a.total)
})

// สีสำหรับหมวดหมู่ (Palette)
const CATEGORY_COLORS = [
  '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#3b82f6', '#f97316',
  '#14b8a6', '#a855f7', '#84cc16', '#64748b'
]

// Record UUID → สี (Record ไม่มี strict key type เหมือน Map)
const categoryColorMap = computed(() => {
  const record: Record<string, string> = {}
  categories.value.forEach((cat, idx) => {
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length] ?? '#64748b'
    const key = cat.uuid || String(idx)
    record[key] = color
  })
  return record
})

const hourlyStats = computed(() => {
  const hours = Array.from({ length: 18 }, (_, i) => ({
    hour: i + 6,
    revenue: 0,
    count: 0,
    itemMap: new Map<string, { name: string; categoryName: string; revenue: number; color: string }>()
  }))

  for (const order of todayOrders.value) {
    const h = new Date(order.createdAt).getHours()
    const slot = hours.find(x => x.hour === h)
    if (!slot) continue
    slot.revenue += order.totalAmount
    slot.count++

    for (const item of (order.items || [])) {
      const prodName = item.productName
      
      // หาแม่สีจาก Category ของสินค้า
      let catName = 'อื่นๆ'
      let catColor = '#78716c'
      const catByUuid = item.categoryUuid ? categories.value.find(c => c.uuid === item.categoryUuid) : null
      const catById = !catByUuid && item.categoryId ? categories.value.find(c => c.id === item.categoryId) : null
      const cat = catByUuid || catById
      
      if (cat) {
        catName = cat.name
        catColor = categoryColorMap.value[cat.uuid || ''] || '#78716c'
      }

      const existing = slot.itemMap.get(prodName)
      if (existing) {
        existing.revenue += item.totalPrice
      } else {
        slot.itemMap.set(prodName, { name: prodName, categoryName: catName, revenue: item.totalPrice, color: catColor })
      }
    }
  }

  return hours.map(slot => {
    const entries = Array.from(slot.itemMap.values()).sort((a, b) => b.revenue - a.revenue)
    const total = entries.reduce((s, e) => s + e.revenue, 0)
    const segments = entries.map(e => ({
      ...e,
      pct: total > 0 ? (e.revenue / total) * 100 : 0
    }))
    return { hour: slot.hour, revenue: slot.revenue, count: slot.count, segments }
  })
})

const maxHourlyRevenue = computed(() => Math.max(1, ...hourlyStats.value.map(h => h.revenue)))

// รายชื่อหมวดหมู่ที่ปรากฏในชั่วโมงใดชั่วโมงหนึ่ง (สำหรับ Legend)
const activeCategorySegments = computed(() => {
  const seen = new Map<string, string>()
  for (const slot of hourlyStats.value) {
    for (const seg of slot.segments) {
      if (!seen.has(seg.categoryName)) seen.set(seg.categoryName, seg.color)
    }
  }
  return Array.from(seen.entries()).map(([categoryName, color]) => ({ categoryName, color }))
})

// --- Category Donut Chart ---
const categoryDonutSeries = computed(() => {
  return activeCategorySegments.value.map(seg => {
    return hourlyStats.value.reduce((sum, h) => {
      const s = h.segments.find(s => s.categoryName === seg.categoryName)
      return sum + (s ? s.revenue : 0)
    }, 0)
  })
})

const categoryDonutOptions = computed(() => ({
  labels: activeCategorySegments.value.map(s => s.categoryName),
  colors: activeCategorySegments.value.map(s => s.color),
  chart: { background: 'transparent', foreColor: '#a8a29e', fontFamily: 'Inter, sans-serif' },
  stroke: { show: false },
  legend: { show: false },
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
    dropShadow: { enabled: true, blur: 1, opacity: 0.5 },
    offsetY: 0
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
        offset: -15, // ขยับให้อยู่ขอบด้านในเพื่อให้มีพื้นที่แสดงชื่อ
        minAngleToShowLabel: 10
      }
    }
  },
  tooltip: { theme: 'dark' }
}))

// Top products (คำนวณ on-the-fly จาก todayOrders)
const computedTopProducts = computed(() => {
  const productMap = new Map<string, { productName: string; quantitySold: number; totalRevenue: number }>()
  for (const order of todayOrders.value) {
    for (const item of (order.items || [])) {
      const key = item.productUuid || item.productName
      const ex = productMap.get(key) || { productName: item.productName, quantitySold: 0, totalRevenue: 0 }
      ex.quantitySold += item.quantity
      ex.totalRevenue += item.totalPrice
      productMap.set(key, ex)
    }
  }
  return Array.from(productMap.values()).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10)
})

// --- Functions ---
async function loadData() {
  isLoading.value = true
  try {
    // 1. คำนวณรายจ่ายเฉลี่ยรายวันของเดือนที่เลือก
    const d = new Date(selectedDate.value)
    const y = d.getFullYear()
    const m = d.getMonth()
    const monthStart = new Date(y, m, 1)
    const monthEnd = new Date(y, m + 1, 0)

    expenseMonthLabel.value = d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })
    const expSummary = await getExpenseSummary(formatDate(monthStart), formatDate(monthEnd))
    monthTotalExpenses.value = expSummary.totalExpenses || 0
    dailyAvgExpense.value = (expSummary.totalExpenses || 0) / monthEnd.getDate()

    // 2. โหลด Master Data
    const start = new Date(selectedDate.value + 'T00:00:00')
    const end = new Date(selectedDate.value + 'T23:59:59.999')

    const [orders, cats, prods, topData] = await Promise.all([
      db.orders
        .where('createdAt').between(start, end, true, true)
        .filter(o => !o.isDeleted && o.status !== 'cancelled' && o.status !== 'refunded')
        .reverse().toArray(),
      db.categories.filter(c => !c.isDeleted).toArray(),
      db.products.filter(p => !p.isDeleted).toArray(),
      getTopProducts(start, end, 50)
    ])

    todayOrders.value = orders
    categories.value = cats
    allProducts.value = prods
    topProductsData.value = topData

    // คำนวณ stats
    let revenue = 0, cost = 0, profit = 0, itemCount = 0
    for (const o of orders) { 
      revenue += o.totalAmount
      cost += (o.totalCost || 0)
      profit += (o.profitAmount || 0)
      itemCount += (o.items || []).reduce((sum, item) => sum + item.quantity, 0)
    }
    stats.value = { revenue, cost, profit, orderCount: orders.length, itemCount }
  } catch (err) {
    console.error('Closing report error:', err)
  } finally {
    isLoading.value = false
  }
}

function openOrderDetail(order: Order) {
  selectedOrder.value = order
}

function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function doPrint() {
  const el = document.getElementById('print-area')
  if (!el) return
  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) return
  win.document.write(`
    <html><head><title>สรุปยอดปิดร้าน</title>
    <style>
      body { font-family: monospace; padding: 16px; font-size: 13px; color: #111; }
      .flex { display: flex; justify-content: space-between; }
      .border-t { border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
      .text-center { text-align: center; }
      .bold { font-weight: bold; }
      .text-green { color: green; }
    </style></head>
    <body onload="window.print(); window.close()">
    ${el.innerHTML.replace(/class="[^"]*"/g, '')}
    </body></html>
  `)
  win.document.close()
}

onMounted(loadData)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

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
