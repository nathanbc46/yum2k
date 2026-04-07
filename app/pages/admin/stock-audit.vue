<!-- =============================================================================
  pages/admin/stock-audit.vue
  หน้าประวัติการปรับสต็อก (Stock Audit Log) สำหรับ Admin
  - แสดงประวัติการปรับสต็อกทั้งหมด
  - กรองตามสินค้าได้ (ถ้ามีการส่ง productId มา หรือสร้าง dropdown ให้เลือก)
============================================================================= -->
<template>
  <div class="flex-1 overflow-y-auto p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-surface-50">📋 ประวัติการปรับสต็อก</h1>
          <p class="text-sm text-surface-400 mt-1">บันทึกความเคลื่อนไหวของสต็อกสินค้าทั้งหมด</p>
        </div>
      </div>

      <!-- Table Section -->
      <div class="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden shadow-lg flex flex-col">
        <div class="overflow-x-auto min-h-[400px]">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-800 text-surface-300 text-xs uppercase tracking-wider border-b border-surface-700">
                <th class="px-6 py-4 font-semibold w-40">วัน-เวลา</th>
                <th class="px-6 py-4 font-semibold">สินค้า</th>
                <th class="px-6 py-4 font-semibold text-center w-28">ของเดิม</th>
                <th class="px-6 py-4 font-semibold text-center w-28">เปลี่ยน</th>
                <th class="px-6 py-4 font-semibold text-center w-28">คงเหลือ</th>
                <th class="px-6 py-4 font-semibold w-40">ผู้ทำรายการ</th>
                <th class="px-6 py-4 font-semibold w-48">เหตุผล / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-800/50">
              <tr v-if="isLoading" class="hover:bg-surface-800/50 transition-colors">
                 <td colspan="7" class="px-6 py-8 text-center text-surface-500">
                    <span class="animate-pulse">กำลังโหลดข้อมูล...</span>
                 </td>
              </tr>
              <tr v-else-if="logs.length === 0" class="hover:bg-surface-800/50 transition-colors">
                 <td colspan="7" class="px-6 py-12 text-center text-surface-500">
                    <div class="text-4xl mb-3 opacity-50">📋</div>
                    ไม่มีประวัติการปรับสต็อก
                 </td>
              </tr>
              <tr 
                v-else
                v-for="log in logs" 
                :key="log.uuid"
                class="hover:bg-surface-800/50 transition-colors group"
              >
                <!-- เวลา -->
                <td class="px-6 py-4 text-xs text-surface-400">
                  {{ formatDate(log.createdAt) }}
                </td>
                
                <!-- สินค้า -->
                <td class="px-6 py-4">
                  <div class="font-medium text-surface-100">{{ log.productName }}</div>
                  <div class="text-xs text-surface-500 mt-0.5" title="Product ID">ID: {{ log.productId }}</div>
                </td>

                <!-- ก่อนหน้า -->
                <td class="px-6 py-4 text-center">
                  <span class="text-surface-400">{{ log.previousQuantity }}</span>
                </td>

                <!-- การเปลี่ยนแปลง -->
                <td class="px-6 py-4 text-center">
                  <span 
                    class="font-bold border px-2 py-0.5 rounded-full text-xs"
                    :class="log.changeQuantity > 0 
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-danger/10 text-danger border-danger/20'"
                  >
                    {{ log.changeQuantity > 0 ? '+' : '' }}{{ log.changeQuantity }}
                  </span>
                </td>

                <!-- คงเหลือ -->
                <td class="px-6 py-4 text-center font-bold text-surface-50">
                  {{ log.newQuantity }}
                </td>

                <!-- พนักงาน -->
                <td class="px-6 py-4 text-xs">
                  <div class="text-surface-300">{{ log.staffName }}</div>
                </td>

                <!-- เหตุผล/หมายเหตุ -->
                <td class="px-6 py-4">
                  <span class="text-xs font-semibold px-2 py-1 rounded bg-surface-800 text-surface-300 mb-1 inline-block">
                     {{ getReasonLabel(log.reason) }}
                  </span>
                  <div v-if="log.note" class="text-[11px] text-surface-500 italic mt-0.5">
                    "{{ log.note }}"
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStockAudit } from '~/composables/useStockAudit'
import type { StockAuditLog } from '~/types'
import { ADJUST_REASON_LABELS } from '~/composables/useProducts'

definePageMeta({ layout: 'admin' })

const { fetchLogs } = useStockAudit()
const logs = ref<StockAuditLog[]>([])
const isLoading = ref(true)

onMounted(async () => {
   await loadLogs()
})

async function loadLogs() {
   isLoading.value = true
   try {
      logs.value = await fetchLogs() // เอามา 100 รายการล่าสุด
   } catch(e) {
      console.error(e)
   } finally {
      isLoading.value = false
   }
}

function formatDate(date: string | Date) {
   const d = new Date(date)
   return d.toLocaleString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
   })
}

function getReasonLabel(reason: string) {
   // Type assertion ปลอดภัยเพราะรู้ว่ามาจาก keys ของ ADJUST_REASON_LABELS
   return ADJUST_REASON_LABELS[reason as keyof typeof ADJUST_REASON_LABELS] || reason
}
</script>
