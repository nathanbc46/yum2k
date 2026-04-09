<!-- =============================================================================
  pages/admin/stock-audit.vue
  หน้าประวัติการปรับสต็อก (Stock Audit Log) สำหรับ Admin
  - แสดงประวัติการปรับสต็อกทั้งหมด
  - กรองตามวันที่ / ประเภทการเปลี่ยนแปลงได้
  - รองรับ Card View สำหรับ Tablet
============================================================================= -->
<template>
  <div class="flex flex-col h-full bg-surface-950 text-surface-50 overflow-hidden">

    <!-- Page Header -->
    <header class="px-6 py-5 border-b border-surface-800 shrink-0 bg-surface-900/50">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-xl font-bold flex items-center gap-2">📋 ประวัติสต็อกสินค้า</h1>
          <p class="text-xs text-surface-500 mt-0.5">บันทึกความเคลื่อนไหวของสต็อก {{ totalCount }} รายการ</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- วันที่ -->
          <input
            v-model="filterDate"
            type="date"
            class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all"
          />

          <!-- ประเภท -->
          <select
            v-model="filterReason"
            class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all"
          >
            <option value="">ทุกประเภท</option>
            <option v-for="(label, key) in ADJUST_REASON_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>

          <!-- ค้นหาสินค้า -->
          <input
            v-model="filterProduct"
            type="text"
            placeholder="ค้นหาสินค้า..."
            class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all w-36"
          />

          <!-- Toggle View -->
          <div class="flex items-center gap-1 bg-surface-800 rounded-xl p-1 border border-surface-700">
            <button
              @click="viewMode = 'table'"
              class="p-1.5 rounded-lg transition-colors"
              :class="viewMode === 'table' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-100'"
              title="แสดงแบบตาราง"
            >☰</button>
            <button
              @click="viewMode = 'card'"
              class="p-1.5 rounded-lg transition-colors"
              :class="viewMode === 'card' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-100'"
              title="แสดงแบบการ์ด"
            >⊞</button>
          </div>

          <!-- Refresh -->
          <button
            @click="loadLogs()"
            class="p-2 bg-surface-800 hover:bg-surface-700 rounded-xl border border-surface-700 transition-colors"
            title="รีเฟรช"
          >🔄</button>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center text-surface-500">
      <span class="animate-pulse text-2xl">⏳</span>
      <span class="ml-3">กำลังโหลดข้อมูล...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredLogs.length === 0" class="flex-1 flex flex-col items-center justify-center text-surface-500">
      <div class="text-5xl mb-4 opacity-40">📋</div>
      <p class="text-lg font-medium">ไม่มีประวัติที่ตรงกับเงื่อนไข</p>
      <p class="text-sm mt-1">ลองปรับตัวกรองใหม่ครับ</p>
    </div>

    <!-- TABLE VIEW -->
    <template v-else-if="viewMode === 'table'">
      <div class="flex-1 overflow-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="bg-surface-800 text-surface-400 text-xs uppercase tracking-wider border-b border-surface-700">
              <th class="px-5 py-3 font-semibold whitespace-nowrap">วัน-เวลา</th>
              <th class="px-5 py-3 font-semibold">สินค้า</th>
              <th class="px-5 py-3 font-semibold text-center w-24">เดิม</th>
              <th class="px-5 py-3 font-semibold text-center w-24">เปลี่ยน</th>
              <th class="px-5 py-3 font-semibold text-center w-24">คงเหลือ</th>
              <th class="px-5 py-3 font-semibold w-36">ผู้ทำรายการ</th>
              <th class="px-5 py-3 font-semibold">ประเภท / หมายเหตุ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800/50">
            <tr
              v-for="log in paginatedLogs"
              :key="log.uuid"
              class="hover:bg-surface-800/40 transition-colors group"
            >
              <td class="px-5 py-3 text-xs text-surface-400 whitespace-nowrap">
                {{ formatDate(log.createdAt) }}
              </td>
              <td class="px-5 py-3">
                <div class="font-medium text-surface-100">{{ log.productName }}</div>
              </td>
              <td class="px-5 py-3 text-center text-surface-400">{{ log.previousQuantity }}</td>
              <td class="px-5 py-3 text-center">
                <span
                  class="font-bold border px-2 py-0.5 rounded-full text-xs"
                  :class="log.changeQuantity > 0
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-danger/10 text-danger border-danger/20'"
                >
                  {{ log.changeQuantity > 0 ? '+' : '' }}{{ log.changeQuantity }}
                </span>
              </td>
              <td class="px-5 py-3 text-center font-bold text-surface-50">{{ log.newQuantity }}</td>
              <td class="px-5 py-3 text-xs text-surface-300">{{ log.staffName }}</td>
              <td class="px-5 py-3">
                <span class="text-xs font-semibold px-2 py-1 rounded-lg bg-surface-800 text-surface-300">
                  {{ getReasonLabel(log.reason) }}
                </span>
                <div v-if="log.note" class="text-[11px] text-surface-500 italic mt-0.5">"{{ log.note }}"</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- CARD VIEW (Tablet-friendly) -->
    <template v-else>
      <div class="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
        <div
          v-for="log in paginatedLogs"
          :key="log.uuid"
          class="bg-surface-900 border border-surface-800 rounded-2xl p-4 flex flex-col gap-2 hover:border-surface-600 transition-all"
        >
          <!-- Header: Product + Change Badge -->
          <div class="flex items-start justify-between gap-2">
            <div class="font-semibold text-surface-100 text-sm leading-snug">{{ log.productName }}</div>
            <span
              class="shrink-0 font-bold border px-2 py-0.5 rounded-full text-xs"
              :class="log.changeQuantity > 0
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-danger/10 text-danger border-danger/20'"
            >
              {{ log.changeQuantity > 0 ? '+' : '' }}{{ log.changeQuantity }}
            </span>
          </div>

          <!-- Stock Flow -->
          <div class="flex items-center gap-2 text-sm">
            <span class="text-surface-500">{{ log.previousQuantity }}</span>
            <span class="text-surface-600">→</span>
            <span class="font-bold text-surface-50">{{ log.newQuantity }}</span>
            <span class="text-surface-600 text-xs">ชิ้น</span>
          </div>

          <!-- Reason Badge -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-semibold px-2 py-1 rounded-lg bg-surface-800 text-surface-300">
              {{ getReasonLabel(log.reason) }}
            </span>
            <span v-if="log.note" class="text-[11px] text-surface-500 italic">"{{ log.note }}"</span>
          </div>

          <!-- Footer: Staff + Time -->
          <div class="flex items-center justify-between mt-1 pt-2 border-t border-surface-800">
            <span class="text-xs text-surface-400">👤 {{ log.staffName }}</span>
            <span class="text-[11px] text-surface-600">{{ formatDate(log.createdAt) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Pagination -->
    <div v-if="!isLoading && totalPages > 1" class="shrink-0 px-6 py-3 border-t border-surface-800 flex items-center justify-between text-sm">
      <span class="text-surface-500 text-xs">
        แสดง {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredLogs.length) }} จาก {{ filteredLogs.length }} รายการ
      </span>
      <div class="flex items-center gap-1">
        <button
          @click="currentPage--"
          :disabled="currentPage <= 1"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 bg-surface-800 hover:bg-surface-700"
        >← ก่อนหน้า</button>
        <span class="px-3 text-surface-400 text-xs">หน้า {{ currentPage }}/{{ totalPages }}</span>
        <button
          @click="currentPage++"
          :disabled="currentPage >= totalPages"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 bg-surface-800 hover:bg-surface-700"
        >ถัดไป →</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStockAudit } from '~/composables/useStockAudit'
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import type { StockAuditLog } from '~/types'
import { ADJUST_REASON_LABELS } from '~/composables/useProducts'

definePageMeta({ layout: 'admin' })

const { fetchLogs } = useStockAudit()
const { lastPullTimestamp } = useMasterDataSync()

const logs = ref<StockAuditLog[]>([])
const isLoading = ref(true)

// --- Filters & View ---
const filterDate = ref('')
const filterReason = ref('')
const filterProduct = ref('')
const viewMode = ref<'table' | 'card'>('table')

// --- Pagination ---
const currentPage = ref(1)
const pageSize = 50

const totalCount = computed(() => logs.value.length)

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    // กรองตามวันที่
    if (filterDate.value) {
      const logDate = new Date(log.createdAt).toISOString().slice(0, 10)
      if (logDate !== filterDate.value) return false
    }
    // กรองตามประเภท
    if (filterReason.value && log.reason !== filterReason.value) return false
    // กรองตามชื่อสินค้า
    if (filterProduct.value) {
      const q = filterProduct.value.toLowerCase()
      if (!log.productName.toLowerCase().includes(q)) return false
    }
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / pageSize)))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredLogs.value.slice(start, start + pageSize)
})

// รีเซ็ตหน้าเมื่อ Filter เปลี่ยน
watch([filterDate, filterReason, filterProduct], () => {
  currentPage.value = 1
})

onMounted(loadLogs)

// Auto-refresh เมื่อมีการ Pull ข้อมูลจาก Cloud สำเร็จ
watch(lastPullTimestamp, () => loadLogs())

async function loadLogs() {
  isLoading.value = true
  try {
    logs.value = await fetchLogs(undefined, 300) // ไม่กรองตาม productId, ดึง 300 รายการ
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getReasonLabel(reason: string) {
  return ADJUST_REASON_LABELS[reason as keyof typeof ADJUST_REASON_LABELS] || reason
}
</script>
