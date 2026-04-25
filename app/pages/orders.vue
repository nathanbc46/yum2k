<template>
  <div class="h-full flex flex-col bg-surface-950 text-surface-50 min-h-0 overflow-hidden">
    <!-- Header -->
    <header class="p-4 border-b border-surface-800 flex justify-between items-center shrink-0 bg-surface-900/50 backdrop-blur-sm sticky top-0 z-10">
      <NuxtLink to="/" class="btn-touch bg-surface-800 hover:bg-surface-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors">
        <span>⬅️</span>
        <span>กลับหน้าขาย (POS)</span>
      </NuxtLink>
      <h1 class="font-bold text-xl flex items-center gap-3">
        <span>📜</span>
        <span>ประวัติการขาย (Order History)</span>
      </h1>
      <div class="flex gap-2">
        <!-- ปุ่ม Manual Sync -->
        <button 
          @click="handleManualSync"
          :disabled="!isOnline || isSyncing || (pendingCount === 0 && pendingStockAuditCount === 0)"
          class="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg transition-all text-xs font-bold shadow-lg shadow-primary-900/20"
          :class="(!isOnline || (pendingCount === 0 && pendingStockAuditCount === 0 && !isSyncing)) ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-primary-500 active:scale-95 cursor-pointer'"
          title="ส่งข้อมูลที่ค้างอยู่ขึ้น Server"
        >
          <span>{{ !isOnline ? 'รอออนไลน์ 📵' : (isSyncing ? 'กำลังซิงค์...' : (pendingCount === 0 && pendingStockAuditCount === 0 ? 'ข้อมูลเป็นปัจจุบันแล้ว' : 'ซิงค์ข้อมูลตอนนี้')) }}</span>
          <span :class="{ 'animate-spin': isSyncing }">🔄</span>
        </button>

        <button 
          @click="loadOrders()" 
          class="p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
          title="Refresh"
        >
          🔄
        </button>

        <!-- ปุ่มดึงข้อมูลจาก Cloud -->
        <button 
          @click="handleFetchCloud"
          :disabled="!isOnline || isFetchingRemote"
          class="flex items-center gap-2 px-4 py-2 bg-amber-500 text-surface-950 rounded-lg transition-all text-xs font-bold shadow-lg shadow-amber-900/20"
          :class="(!isOnline || isFetchingRemote) ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-amber-400 active:scale-95 cursor-pointer'"
          title="ดึงประวัติการขายจาก Cloud ลงเครื่อง"
        >
          <span class="flex items-center gap-2">
            <span>{{ isFetchingRemote ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Cloud' }}</span>
            <span v-if="!isFetchingRemote">☁️</span>
          </span>
          <span v-if="isFetchingRemote" class="w-3 h-3 border-2 border-surface-950/30 border-t-surface-950 rounded-full animate-spin"></span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto p-4 md:p-8">
      <div class="max-w-6xl mx-auto space-y-6">
        
        <!-- Filters Section -->
        <div class="flex flex-wrap items-center gap-4 animate-in fade-in duration-500">
          <!-- Date Range Filter -->
          <div class="flex items-center gap-2 bg-surface-100/50 dark:bg-surface-900/40 p-1.5 rounded-2xl border border-surface-200 dark:border-surface-800/50">
            <button 
              v-for="range in [
                { id: 'today', label: 'วันนี้' },
                { id: '7days', label: '7 วันล่าสุด' },
                { id: '30days', label: '30 วันล่าสุด' }
              ]"
              :key="range.id"
              @click="selectedDateRange = range.id as any"
              class="px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
              :class="selectedDateRange === range.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-surface-600 hover:text-surface-50'"
            >
              {{ range.label }}
            </button>
            
            <!-- Custom Date Selector -->
            <div class="relative">
              <button 
                @click="($refs.dateInput as HTMLInputElement).showPicker()"
                class="px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2"
                :class="selectedDateRange === 'custom' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-surface-600 hover:text-surface-50'"
              >
                <span>📅</span>
                <span>{{ selectedDateRange === 'custom' ? customDate : 'ระบุวันที่' }}</span>
              </button>
              <input 
                ref="dateInput"
                type="date"
                class="absolute inset-0 opacity-0 pointer-events-none"
                :value="customDate"
                @input="(e) => { 
                  customDate = (e.target as HTMLInputElement).value; 
                  selectedDateRange = 'custom';
                }"
              />
            </div>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-2 bg-surface-100/50 dark:bg-surface-900/40 p-1.5 rounded-2xl border border-surface-200 dark:border-surface-800/50">
            <button 
              v-for="status in [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'completed', label: 'สำเร็จ' },
                { id: 'pending', label: 'ค้างจ่าย' },
                { id: 'cancelled', label: 'ยกเลิกแล้ว' }
              ]"
              :key="status.id"
              @click="selectedStatus = status.id"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
              :class="selectedStatus === status.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-surface-600 hover:text-surface-50'"
            >
              {{ status.label }} 
              <span class="ml-1 opacity-70">({{ statusCounts[status.id as keyof typeof statusCounts] }})</span>
            </button>
          </div>
        </div>

        <!-- Orders List Content -->
        <template v-if="isLoading">
          <div class="flex flex-col items-center justify-center p-20 space-y-4">
            <div class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-surface-500">กำลังโหลดคำสั่งซื้อ...</p>
          </div>
        </template>

        <template v-else-if="orders.length > 0">
          <!-- Orders Table -->
          <div class="space-y-4">
          <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm border-collapse">
                <thead class="bg-surface-50 dark:bg-surface-950 text-surface-600 dark:text-surface-500 uppercase text-[10px] font-bold tracking-widest border-b border-surface-200 dark:border-surface-800">
                  <tr>
                    <th class="px-6 py-4">วันที่/เวลา</th>
                    <th class="px-6 py-4">เลขออร์เดอร์</th>
                    <th class="px-6 py-4">ยอดขายสุทธิ</th>
                    <th class="px-6 py-4">ช่องทาง / สถานะ</th>
                    <th class="px-6 py-4">การ Sync</th>
                    <th class="px-6 py-4 text-right">คำสั่ง</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-800">
                  <tr 
                    v-for="order in orders" 
                    :key="order.id" 
                    class="hover:bg-surface-800/30 transition-colors group"
                    :class="{ 'opacity-50 grayscale': order.status === 'cancelled' }"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="font-medium">{{ formatDisplayDate(order.createdAt).date }}</div>
                      <div class="text-[10px] text-surface-500">{{ formatDisplayDate(order.createdAt).time }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-xs bg-surface-950 px-2 py-1 rounded border border-surface-800" :class="{ 'line-through': order.status === 'cancelled' }">
                          {{ order.orderNumber }}
                        </span>
                        <span 
                          v-if="order.status === 'cancelled'"
                          class="bg-danger/10 text-danger text-[9px] px-1.5 py-0.5 rounded border border-danger/20 font-bold uppercase"
                        >
                          ยกเลิกแล้ว
                        </span>
                        <span 
                          v-else-if="order.status === 'pending'"
                          class="bg-yellow-500/10 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold uppercase"
                        >
                          ค้างจ่าย
                        </span>
                        <span 
                          v-else
                          class="bg-success/10 text-success text-[9px] px-1.5 py-0.5 rounded border border-success/20 font-bold uppercase"
                        >
                          สำเร็จ
                        </span>
                      </div>
                      <div v-if="order.note" class="text-[10px] text-surface-500 mt-1 italic line-clamp-1">
                        📝 {{ order.note }}
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="font-bold text-primary-400" :class="{ 'line-through': order.status === 'cancelled' }">
                        ฿{{ order.totalAmount.toLocaleString() }}
                      </div>
                      <div class="text-[10px] text-surface-500">{{ order.items.length }} รายการ</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-col gap-2">
                        <!-- Payment Method -->
                        <div class="flex items-center gap-2">
                          <span 
                            class="px-2 py-0.5 rounded text-[10px] font-bold border"
                            :class="[
                              order.paymentMethod === 'cash' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                              order.paymentMethod === 'promptpay' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              order.paymentMethod === 'unpaid' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20' :
                              'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700'
                            ]"
                          >
                            {{ 
                              order.paymentMethod === 'cash' ? '💵 เงินสด' : 
                              order.paymentMethod === 'promptpay' ? '📱 พร้อมเพย์' : 
                              order.paymentMethod === 'card' ? '💳 บัตร' : 
                              order.paymentMethod === 'unpaid' ? '⏳ ยังไม่ชำระ' : '🌀 อื่นๆ' 
                            }}
                          </span>
                        </div>

                        <!-- Delivery Status -->
                        <div v-if="order.deliveryRef" class="flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          <span class="text-orange-400 text-[10px] font-bold">
                            RIDER: {{ order.deliveryRef }}
                          </span>
                        </div>
                        <div v-else class="text-surface-600 dark:text-surface-500 text-[10px] flex items-center gap-1">
                          <span>🚶</span>
                          <span>หน้าร้าน</span>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div v-if="order.syncStatus === 'synced'" class="flex items-center gap-2 text-green-400 text-xs font-medium">
                        <span class="flex items-center justify-center w-5 h-5 rounded-full bg-green-400/10 text-[10px]">✔️</span>
                        <span>บนคลาวด์</span>
                      </div>
                      <div v-else class="flex items-center gap-2 text-yellow-400 text-xs font-medium">
                        <span class="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400/10 text-[10px]">⏳</span>
                        <span>ออฟไลน์</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end gap-2">
                        <button 
                          @click="reprint(order)" 
                          class="btn-touch px-3 py-1 bg-surface-800 text-surface-300 rounded-lg hover:bg-surface-700 transition-all text-xs font-bold border border-surface-700"
                        >
                          พิมพ์
                        </button>
                        <button 
                          v-if="order.status === 'pending'"
                          @click="payOrder(order)" 
                          class="btn-touch px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-all text-xs font-bold shadow-lg shadow-primary-900/20"
                        >
                          💰 ชำระเงิน
                        </button>
                        <button 
                          v-if="order.status !== 'cancelled'"
                          @click="confirmCancelOrder(order)" 
                          class="btn-touch px-3 py-1 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all text-xs font-bold border border-danger/20"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Load More Button -->
          <div v-if="hasMore" class="flex justify-center pb-8">
            <button 
              @click="loadMore"
              :disabled="isLoadingMore"
              class="btn-touch px-8 py-2 bg-surface-900 border border-surface-800 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-all text-sm font-bold disabled:opacity-50"
            >
              <span v-if="isLoadingMore">กำลังโหลด...</span>
              <span v-else>🏠 โหลดข้อมูลเพิ่มเติม</span>
            </button>
          </div>
        </div>
      </template>

        <!-- Empty State -->
        <template v-else>
          <div class="flex flex-col items-center justify-center p-20 space-y-4 text-surface-500 dark:text-surface-400 bg-surface-100/50 dark:bg-surface-900/20 rounded-3xl border border-dashed border-surface-200 dark:border-surface-800">
            <span class="text-6xl opacity-20">📭</span>
            <p class="text-xl font-bold text-surface-50 uppercase tracking-tight">ไม่พบประวัติการขาย</p>
            <p class="text-surface-500 font-medium">ยังไม่มีรายการสั่งซื้อในช่วงเวลานี้</p>
            <NuxtLink to="/" class="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-all font-bold mt-2">
              กลับหน้าขาย (POS)
            </NuxtLink>
          </div>
        </template>
      </div>
    </main>

    <Transition name="fade">
      <div v-if="isPayModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
        <div 
          class="bg-surface-900 rounded-[2.5rem] border border-surface-800 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300 transition-all"
          :class="paymentMethodToUpdate === 'cash' ? 'w-full max-w-4xl' : 'w-full max-w-md'"
        >
          
          <!-- Modal Header -->
          <div class="p-6 text-center border-b border-surface-800 bg-surface-950/30">
            <div class="w-16 h-16 bg-primary-600/10 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
              💰
            </div>
            <h3 class="text-xl font-black text-surface-50">ชำระเงินออร์เดอร์</h3>
            <p class="text-surface-600 text-sm mt-1 font-medium">ออร์เดอร์ #{{ selectedOrderToPay?.orderNumber }}</p>
          </div>

          <!-- Modal Body -->
          <div class="p-8">
            <div :class="paymentMethodToUpdate === 'cash' ? 'grid grid-cols-1 md:grid-cols-12 gap-8' : 'space-y-8'">
              
              <!-- Left Column: Amount & Selection -->
              <div :class="paymentMethodToUpdate === 'cash' ? 'md:col-span-5 space-y-6' : 'space-y-8'">
                <!-- Amount Display -->
                <div class="text-center">
                  <div class="text-[10px] uppercase tracking-widest text-surface-600 font-bold mb-1">ยอดรวมที่ต้องชำระ</div>
                  <div class="text-4xl font-black text-primary-600">฿{{ selectedOrderToPay?.totalAmount.toLocaleString() }}</div>
                </div>

                <!-- Payment Methods Grid -->
                <div class="space-y-4">
                  <label class="text-[10px] uppercase tracking-widest text-surface-600 font-bold ml-1">เลือกวิธีชำระเงิน</label>
                  <div class="grid grid-cols-2 gap-4">
                    <button 
                      @click="paymentMethodToUpdate = 'cash'"
                      class="flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all active:scale-95 group relative overflow-hidden"
                      :class="paymentMethodToUpdate === 'cash' ? 'bg-primary-600/10 border-primary-500 shadow-md' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 opacity-60'"
                    >
                      <span class="text-3xl transition-transform group-hover:scale-110">💵</span>
                      <span class="font-bold whitespace-nowrap" :class="paymentMethodToUpdate === 'cash' ? 'text-primary-600' : 'text-surface-600'">เงินสด</span>
                    </button>

                    <button 
                      @click="paymentMethodToUpdate = 'promptpay'"
                      class="flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all active:scale-95 group relative overflow-hidden"
                      :class="paymentMethodToUpdate === 'promptpay' ? 'bg-secondary-500/10 border-secondary-500 shadow-md' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 opacity-60'"
                    >
                      <span class="text-3xl transition-transform group-hover:scale-110">📱</span>
                      <span class="font-bold whitespace-nowrap" :class="paymentMethodToUpdate === 'promptpay' ? 'text-secondary-600' : 'text-surface-600'">พร้อมเพย์</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Right Column: Cash Calculator (Only for Cash) -->
              <div v-if="paymentMethodToUpdate === 'cash'" class="md:col-span-7 space-y-6">
                <div class="flex justify-between items-end">
                  <h4 class="text-[10px] uppercase tracking-widest text-surface-600 font-bold ml-1">คำนวณเงินสด</h4>
                  <div class="flex gap-2">
                    <button @click="clearCash" class="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors text-[10px] font-bold">ล้าง</button>
                    <button @click="undoCash" class="px-3 py-1 bg-surface-800 text-surface-400 border border-surface-700 rounded-xl hover:bg-surface-700 transition-colors text-[10px] font-bold">ย้อนกลับ</button>
                  </div>
                </div>

                <!-- Input & Change Display -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <span class="text-[10px] text-surface-500 font-bold uppercase tracking-widest">รับเงิน</span>
                    <div class="relative">
                      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 font-bold text-xl pointer-events-none">฿</span>
                      <input 
                        v-model.number="amountReceived"
                        type="number"
                        class="w-full bg-surface-950 border-2 border-surface-800 rounded-2xl py-4 pl-10 pr-4 text-3xl font-black text-success focus:border-success outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <span class="text-[10px] text-surface-500 font-bold uppercase tracking-widest">เงินทอน</span>
                    <div class="bg-surface-950 border-2 border-dashed border-surface-800 rounded-2xl py-4 px-5 flex items-center justify-between">
                      <span class="text-surface-500 font-bold text-xl">฿</span>
                      <span class="text-3xl font-black" :class="changeAmount > 0 ? 'text-blue-400' : 'text-surface-700'">
                        {{ changeAmount.toLocaleString() }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Denominations Grid -->
                <div class="grid grid-cols-5 gap-3">
                  <button 
                    v-for="val in [1, 2, 5, 10, 20, 50, 100, 500, 1000]" 
                    :key="val"
                    @click="addCash(val)"
                    class="py-3 rounded-2xl bg-surface-800 border border-surface-700 text-surface-200 font-bold hover:bg-surface-700 active:scale-95 transition-all flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    <span class="text-[9px] text-surface-500 uppercase tracking-tighter leading-none mb-1">{{ val < 20 ? 'เหรียญ' : 'ธนบัตร' }}</span>
                    <span class="text-lg leading-none">{{ val.toLocaleString() }}</span>
                    
                    <!-- จำนวนที่กด (แสดงใต้ปุ่ม) -->
                    <div v-if="cashDenominationsMap[val.toString()]" class="mt-1 px-1.5 py-0.5 bg-primary-600/20 text-primary-400 text-[10px] font-black rounded-lg border border-primary-500/20">
                      × {{ cashDenominationsMap[val.toString()] }}
                    </div>
                  </button>
                  <button 
                    @click="setExactAmount"
                    class="py-3 rounded-2xl bg-primary-600/20 border border-primary-500/30 text-primary-400 font-bold text-lg hover:bg-primary-600/30 active:scale-95 transition-all flex items-center justify-center"
                  >
                    จ่ายพอดี
                  </button>
                </div>

                <!-- Warning if not enough -->
                <div v-if="amountReceived > 0 && amountReceived < (selectedOrderToPay?.totalAmount || 0)" class="text-center py-2 bg-red-500/10 rounded-2xl border border-red-500/20">
                  <span class="text-xs text-red-400 font-bold animate-pulse italic">⚠️ ยอดเงินไม่พอ ขาดอีก ฿{{ ((selectedOrderToPay?.totalAmount || 0) - amountReceived).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-6 bg-surface-950/50 flex gap-4">
            <button 
              @click="isPayModalOpen = false"
              class="flex-1 py-4 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-200 font-bold hover:bg-surface-200 dark:hover:bg-surface-700 transition-all active:scale-95"
            >
              ยกเลิก
            </button>
            <button 
              @click="confirmPaymentUpdate"
              :disabled="isProcessingPayment || !isAmountEnough"
              class="flex-[2] py-4 rounded-2xl bg-primary-600 text-white font-bold text-lg shadow-xl shadow-primary-900/30 hover:bg-primary-500 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
            >
              <span v-if="isProcessingPayment" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span v-else>ยืนยันรับเงิน</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import type { Order } from '~/types'
import { usePosStore } from '~/stores/pos'
import { useInventory } from '~/composables/useInventory'
import { useSync } from '~/composables/useSync'
import { useToast } from '~/composables/useToast'
import { usePrinter } from '~/composables/usePrinter'

const orders = ref<Order[]>([])
const isLoading = ref(true)
const { isOnline, isSyncing, syncPendingOrders, fetchRemoteOrders, pendingCount, pendingStockAuditCount, refreshPendingCount } = useSync()
const toast = useToast()
const isFetchingRemote = ref(false)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const page = ref(0)
const PAGE_SIZE = 20

const route = useRoute()
const selectedStatus = ref<string>((route.query.status as string) || 'all')
const selectedDateRange = ref<'today' | '7days' | '30days' | 'custom'>('today')
const customDate = ref<string>(new Date().toISOString().substring(0, 10))
const statusCounts = ref({
  all: 0,
  completed: 0,
  pending: 0,
  cancelled: 0
})

const posStore = usePosStore()
const { restoreStock } = useInventory()
const { printRawBT, printStandard } = usePrinter()

// State สำหรับ Modal ชำระเงิน
const isPayModalOpen = ref(false)
const selectedOrderToPay = ref<Order | null>(null)
const paymentMethodToUpdate = ref<'cash' | 'promptpay'>('cash')
const isProcessingPayment = ref(false)

// ระบบคำนวณเงินสด
const amountReceived = ref<number>(0)
const cashHistory = ref<number[]>([])

const cashDenominationsMap = computed(() => {
  const map: Record<string, number> = {}
  cashHistory.value.forEach(val => {
    const key = val.toString()
    map[key] = (map[key] || 0) + 1
  })
  return map
})

const changeAmount = computed(() => {
  if (!selectedOrderToPay.value) return 0
  return Math.max(0, amountReceived.value - selectedOrderToPay.value.totalAmount)
})

const isAmountEnough = computed(() => {
  if (paymentMethodToUpdate.value !== 'cash') return true
  if (!selectedOrderToPay.value) return false
  return amountReceived.value >= selectedOrderToPay.value.totalAmount
})

const addCash = (val: number) => {
  amountReceived.value += val
  cashHistory.value.push(val)
}

const undoCash = () => {
  const last = cashHistory.value.pop()
  if (last) amountReceived.value = Math.max(0, amountReceived.value - last)
}

const clearCash = () => {
  amountReceived.value = 0
  cashHistory.value = []
}

const setExactAmount = () => {
  if (!selectedOrderToPay.value) return
  amountReceived.value = selectedOrderToPay.value.totalAmount
  cashHistory.value = []
}

const loadOrders = async (reset = true) => {
  if (reset) {
    isLoading.value = true
    page.value = 0
    orders.value = []
    hasMore.value = true
  } else {
    isLoadingMore.value = true
  }

  try {
    // 1. คำนวณช่วงวันที่ (startDate ถึง endDate)
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date() // Default ถึงปัจจุบัน

    if (selectedDateRange.value === 'today') {
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (selectedDateRange.value === '7days') {
      startDate.setDate(now.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (selectedDateRange.value === '30days') {
      startDate.setDate(now.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (selectedDateRange.value === 'custom') {
      // ตรวจสอบกรณีผู้ใช้กด Clear ใน Date Picker
      if (!customDate.value) {
        selectedDateRange.value = 'today'
        customDate.value = new Date().toISOString().substring(0, 10)
        return // ออกจากฟังก์ชันก่อน แล้ว Watcher จะเรียก loadOrders อีกครั้งด้วยช่วงเวลา 'today'
      }
      startDate = new Date(customDate.value)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(customDate.value)
      endDate.setHours(23, 59, 59, 999)
    }

    // 2. คำนวณจำนวนรายการแยกตามสถานะ (Status Counts) สำหรับช่วงเวลาที่เลือก
    if (reset) {
      // ดึงออร์เดอร์ทั้งหมดในช่วงเวลามานับ (สำหรับระบบ Offline/Local ข้อมูลหลักร้อยหลักพันทำในหน่วยความจำได้เร็ว)
      const allInRange = await db.orders.where('createdAt').between(startDate, endDate, true, true).toArray()
      const nonDeleted = allInRange.filter(o => !o.isDeleted)
      
      statusCounts.value.all = nonDeleted.length
      statusCounts.value.completed = nonDeleted.filter(o => o.status === 'completed').length
      statusCounts.value.pending = nonDeleted.filter(o => o.status === 'pending').length
      statusCounts.value.cancelled = nonDeleted.filter(o => o.status === 'cancelled').length
    }

    // 3. ดึงข้อมูลออร์เดอร์แบบแบ่งหน้า (Pagination)
    let collection = db.orders.where('createdAt').between(startDate, endDate, true, true).reverse()
    
    collection = collection.filter(o => {
      if (o.isDeleted) return false
      if (selectedStatus.value !== 'all' && o.status !== selectedStatus.value) return false
      return true
    })

    const newOrders = await collection
      .offset(page.value * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray()

    if (newOrders.length < PAGE_SIZE) {
      hasMore.value = false
    }

    orders.value = [...orders.value, ...newOrders]
  } catch (e) {
    console.error('Failed to load orders:', e)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// โหลดข้อมูลใหม่เมื่อมีการเปลี่ยนสถานะ
watch(selectedStatus, () => {
  loadOrders(true)
})

// โหลดข้อมูลใหม่เมื่อมีการเปลี่ยนช่วงวันที่
watch(selectedDateRange, () => {
  loadOrders(true)
})

// โหลดข้อมูลใหม่เมื่อมีการเลือกวันที่ใหม่ในโหมด Custom
watch(customDate, () => {
  if (selectedDateRange.value === 'custom') {
    loadOrders(true)
  }
})

// คอยดู Query Params เพื่อเปลี่ยนสถานะ (กรณี Deep-link)
watch(() => route.query.status, (newStatus) => {
  if (newStatus) {
    selectedStatus.value = newStatus as string
  }
})

const payOrder = (order: Order) => {
  selectedOrderToPay.value = order
  paymentMethodToUpdate.value = 'cash'
  amountReceived.value = 0
  cashHistory.value = []
  isPayModalOpen.value = true
}

const confirmPaymentUpdate = async () => {
  if (!selectedOrderToPay.value) return
  
  isProcessingPayment.value = true
  const orderId = selectedOrderToPay.value.id
  const orderNumber = selectedOrderToPay.value.orderNumber
  const finalPaymentMethod = paymentMethodToUpdate.value
  const amount = selectedOrderToPay.value.totalAmount

  try {
    // 1. อัปเดตฐานข้อมูล
    await db.orders.update(orderId!, {
      status: 'completed',
      paymentMethod: finalPaymentMethod,
      amountReceived: amountReceived.value || amount,
      changeAmount: changeAmount.value,
      syncStatus: 'pending',
      syncRetryCount: 0,
      updatedAt: new Date()
    })

    // 2. อัปเดตใน UI ทันที (Optimistic Update) เพื่อให้ผู้ใช้เห็นการเปลี่ยนแปลงทันที
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) {
      const targetOrder = orders.value[idx]
      if (targetOrder) {
        targetOrder.status = 'completed'
        targetOrder.paymentMethod = finalPaymentMethod
        targetOrder.amountReceived = amount
        targetOrder.syncStatus = 'pending'
      }
    }

    toast.success(`อัปเดตสถานะออร์เดอร์ ${orderNumber} สำเร็จ`)
    isPayModalOpen.value = false
    
    // 3. ปรับปรุงสถานะการซิงค์ในระบบหลังบ้าน (รอ DB บันทึกเสร็จแน่นอน)
    setTimeout(async () => {
      await refreshPendingCount()
      await posStore.refreshPendingOrdersCount()
      
      if (isOnline.value) {
        syncPendingOrders()
      }
    }, 200)

  } catch (error: any) {
    console.error('❌ Update Payment Error:', error)
    toast.error(`ไม่สามารถอัปเดตสถานะไค้: ${error.message}`)
  } finally {
    isProcessingPayment.value = false
  }
}

const loadMore = () => {
  page.value++
  loadOrders(false)
}

const handleManualSync = async () => {
  if (!isOnline.value || isSyncing.value) return
  
  try {
    const res = await syncPendingOrders(true)
    
    // สร้างข้อความแจ้งเตือนละเอียด
    const lines = ['📤 สรุปการซิงค์ข้อมูล:']
    
    if (res.orders.total > 0) {
      lines.push(`✅ ออร์เดอร์: สำเร็จ ${res.orders.success}/${res.orders.total}`)
      if (res.orders.failed > 0) lines.push(`❌ ล้มเหลว ${res.orders.failed} ใบ`)
    } else {
      lines.push('ℹ️ ไม่มีออร์เดอร์ใหม่ที่ต้องซิงค์')
    }

    if (res.auditLogs.total > 0) {
      lines.push(`📦 สต็อก: สำเร็จ ${res.auditLogs.success}/${res.auditLogs.total}`)
    }

    const allErrors = [...res.orders.errors, ...res.auditLogs.errors]
    if (allErrors.length > 0) {
      lines.push('\n⚠️ ข้อผิดพลาด:')
      allErrors.slice(0, 2).forEach(e => lines.push(`• ${e}`))
    }

    toast.success(lines.join('\n'), allErrors.length > 0 ? 10000 : 5000)
    
    // อัปเดตรายการในหน้าจอ
    await loadOrders(true)
  } catch (error: any) {
    toast.error(`การซิงค์ล้มเหลว: ${error.message}`)
  }
}

const handleFetchCloud = async () => {
  if (!isOnline.value || isFetchingRemote.value) return
  
  isFetchingRemote.value = true
  try {
    const count = await fetchRemoteOrders(100) // ดึง 100 รายการล่าสุด (รวมข้อมูลพนักงาน/สินค้า)
    if (count > 0) {
      toast.success(`ดึงข้อมูลสำเร็จ!\n• นำเข้าออร์เดอร์ใหม่ ${count} รายการ\n• อัปเดตข้อมูลสินค้าและพนักงานเรียบร้อย`)
      await loadOrders(true) // รีโหลดหน้าจอ
    } else {
      toast.info('ข้อมูลออร์เดอร์เป็นปัจจุบันแล้ว (อัปเดตข้อมูลหลักเรียบร้อย)')
    }
  } catch (error: any) {
    toast.error(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}`)
  } finally {
    isFetchingRemote.value = false
  }
}

const confirmCancelOrder = async (order: Order) => {
  const confirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำสั่งซื้อ ${order.orderNumber}?\n(ระบบจะทำการคืนสต็อกสินค้าโดยอัตโนมัติ)`)
  if (!confirmed) return

  try {
    console.log(`⏳ กำลังยกเลิกออเดอร์: ${order.orderNumber}...`)
    
    // 1. คืนสต็อก
    await restoreStock(order.items)

    // 2. อัปเดตสถานะออเดอร์ในฐานข้อมูล
    await db.orders.update(order.id!, {
      status: 'cancelled',
      syncStatus: 'pending', // เตรียมส่งขึ้น Server เพื่อยกเลิก
      syncRetryCount: 0      // รีเซ็ตจำนวนครั้งที่ลองเพื่อให้ระบบซิงค์ทันที
    })

    // 3. อัปเดต UI (Reactivity)
    const idx = orders.value.findIndex(o => o.id === order.id)
    if (idx !== -1) {
      // ใช้การแทนที่ทั้ง Object เพื่อให้ Vue ตรวจพบการเปลี่ยนแปลงที่ nested property แน่นอน
      // ใช้ตัวแปร order ที่ส่งเข้ามาเพื่อหลีกเลี่ยงปัญหา Type undefined จากการเข้าถึง array ด้วย index
      orders.value[idx] = { ...order, status: 'cancelled' }
    }

    console.log(`✅ ยกเลิกออเดอร์ ${order.orderNumber} สำเร็จ`)
    toast.success('ยกเลิกออเดอร์และคืนสต็อกเรียบร้อยแล้ว')
  } catch (e: any) {
    console.error('❌ ไม่สามารถยกเลิกออเดอร์ได้:', e)
    toast.error(`ไม่สามารถยกเลิกได้: ${e.message}`)
  }
}

const formatDisplayDate = (date: Date | string) => {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()

  const dateStr = isToday 
    ? 'วันนี้' 
    : d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  
  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  return { date: dateStr, time: timeStr }
}

const formatDate = (date: Date | string) => {
  const { date: dStr, time: tStr } = formatDisplayDate(date)
  return `${dStr} ${tStr}`
}

const reprint = async (order: Order) => {
  posStore.setLastOrder(order)
  
  // พยายามพิมพ์ผ่าน RawBT (Silent Print)
  const success = await printRawBT(order)
  
  // ถ้าพิมพ์ผ่าน RawBT ไม่สำเร็จ ให้ใช้ระบบพิมพ์มาตรฐานของ Browser
  if (!success) {
    setTimeout(() => {
      printStandard()
    }, 200)
  }
}

onMounted(() => {
  loadOrders()
  refreshPendingCount() // ตรวจสอบจำนวนรายการที่ต้องซิงค์เมื่อเข้าหน้านี้
})

// รีเฟรชข้อมูลในหน้าจออัตโนมัติเมื่อการ Sync เสร็จสิ้น
watch(isSyncing, (newValue, oldValue) => {
  if (oldValue === true && newValue === false) {
    loadOrders(true) // โหลดใหม่ทั้งหมดเพื่ออัปเดตสถานะ Sync ล่าสุด
  }
})
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--color-surface-800);
  border-radius: 10px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
