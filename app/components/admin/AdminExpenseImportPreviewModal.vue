<script setup lang="ts">
import { computed } from 'vue'
import type { ExpenseImportPreviewItem, ImportItemResult } from '~/composables/useExpenseExcel'

const props = defineProps<{
  isOpen: boolean
  items: ExpenseImportPreviewItem[]
  results?: ImportItemResult[] | null
  isImporting?: boolean
}>()

defineEmits(['close', 'confirm'])

// --- Preview mode stats ---
const previewStats = computed(() => ({
  new: props.items.filter(i => i.status === 'new').length,
  update: props.items.filter(i => i.status === 'update').length,
  invalid: props.items.filter(i => i.status === 'invalid').length,
}))

const validItemsCount = computed(() => previewStats.value.new + previewStats.value.update)

// --- Result mode stats ---
const resultStats = computed(() => ({
  success: props.results?.filter(r => r.success).length ?? 0,
  failed: props.results?.filter(r => !r.success).length ?? 0,
}))

const isResultMode = computed(() => !!props.results)

const LEGACY_LABELS: Record<string, string> = {
  ingredient: 'วัตถุดิบ',
  utility: 'ค่าน้ำ/ไฟ/แก๊ส',
  wage: 'ค่าจ้างพนักงาน',
  rent: 'ค่าเช่าที่',
  supplies: 'วัสดุสิ้นเปลือง',
  other: 'อื่นๆ'
}

function getCategoryLabel(item: ExpenseImportPreviewItem['expense']): string {
  if ((item as any).categoryName) return (item as any).categoryName
  if (item.category) return LEGACY_LABELS[item.category] || item.category
  return '-'
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" @click="!isImporting && $emit('close')"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-6xl max-h-[90vh] bg-surface-900 border border-surface-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">

      <!-- Header -->
      <header class="px-8 py-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/50 shrink-0">
        <div>
          <h2 class="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <span v-if="!isResultMode">📋 ตรวจสอบข้อมูลก่อนนำเข้า (รายจ่าย)</span>
            <span v-else>📊 ผลการนำเข้ารายจ่าย</span>
            <span
              class="text-sm font-normal px-3 py-1 rounded-full uppercase tracking-wider"
              :class="isResultMode
                ? (resultStats.failed > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400')
                : 'bg-surface-800 text-surface-400'"
            >
              {{ isResultMode ? (resultStats.failed > 0 ? 'มีรายการล้มเหลว' : 'สำเร็จทั้งหมด') : 'PREVIEW' }}
            </span>
          </h2>
          <p class="text-sm text-surface-500 mt-1">
            <span v-if="!isResultMode">กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยันการบันทึกลงฐานข้อมูล</span>
            <span v-else>รายละเอียดผลการนำเข้าข้อมูลรายจ่ายจาก Excel</span>
          </p>
        </div>
        <button
          @click="$emit('close')"
          :disabled="isImporting"
          class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-800 text-surface-400 transition-all disabled:opacity-30"
        >✕</button>
      </header>

      <!-- Stats Bar -->
      <div class="px-8 py-4 bg-surface-950/30 flex items-center gap-6 border-b border-surface-800 shrink-0">
        <!-- Preview stats -->
        <template v-if="!isResultMode">
          <div class="flex flex-col">
            <span class="text-[10px] text-surface-500 uppercase font-bold tracking-widest">ทั้งหมด</span>
            <span class="text-xl font-bold text-surface-50">{{ items.length }} รายการ</span>
          </div>
          <div class="w-px h-8 bg-surface-800"></div>
          <div class="flex flex-col">
            <span class="text-[10px] text-emerald-400 uppercase font-bold tracking-widest">เพิ่มใหม่</span>
            <span class="text-xl font-bold text-emerald-400">{{ previewStats.new }}</span>
          </div>
          <div class="w-px h-8 bg-surface-800"></div>
          <div class="flex flex-col">
            <span class="text-[10px] text-blue-400 uppercase font-bold tracking-widest">อัปเดต</span>
            <span class="text-xl font-bold text-blue-400">{{ previewStats.update }}</span>
          </div>
          <template v-if="previewStats.invalid > 0">
            <div class="w-px h-8 bg-surface-800"></div>
            <div class="flex flex-col">
              <span class="text-[10px] text-red-400 uppercase font-bold tracking-widest">ไม่ถูกต้อง</span>
              <span class="text-xl font-bold text-red-400">{{ previewStats.invalid }}</span>
            </div>
          </template>
        </template>

        <!-- Result stats -->
        <template v-else>
          <div class="flex flex-col">
            <span class="text-[10px] text-surface-500 uppercase font-bold tracking-widest">ทั้งหมด</span>
            <span class="text-xl font-bold text-surface-50">{{ results!.length }} รายการ</span>
          </div>
          <div class="w-px h-8 bg-surface-800"></div>
          <div class="flex flex-col">
            <span class="text-[10px] text-emerald-400 uppercase font-bold tracking-widest">✅ สำเร็จ</span>
            <span class="text-xl font-bold text-emerald-400">{{ resultStats.success }}</span>
          </div>
          <div class="w-px h-8 bg-surface-800"></div>
          <div class="flex flex-col">
            <span class="text-[10px] text-red-400 uppercase font-bold tracking-widest">❌ ล้มเหลว</span>
            <span class="text-xl font-bold text-red-400">{{ resultStats.failed }}</span>
          </div>
        </template>
      </div>

      <!-- Table body -->
      <div class="flex-1 overflow-auto p-4">

        <!-- Preview Table -->
        <table v-if="!isResultMode" class="w-full text-left text-sm border-separate border-spacing-y-1.5">
          <thead>
            <tr class="text-surface-500 text-[11px] uppercase tracking-widest">
              <th class="px-3 py-2">สถานะ</th>
              <th class="px-3 py-2">วันที่</th>
              <th class="px-3 py-2">หมวดหมู่</th>
              <th class="px-3 py-2">คำอธิบาย</th>
              <th class="px-3 py-2">Vendor</th>
              <th class="px-3 py-2">หน่วย</th>
              <th class="px-3 py-2 text-right">จำนวน</th>
              <th class="px-3 py-2 text-right">จำนวนเงิน</th>
              <th class="px-3 py-2">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in items"
              :key="idx"
              class="bg-surface-800/40 hover:bg-surface-800/70 transition-all"
              :class="{ 'opacity-60': item.status === 'invalid' }"
            >
              <td class="px-3 py-2.5 rounded-l-xl">
                <span
                  class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border whitespace-nowrap"
                  :class="{
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': item.status === 'new',
                    'bg-blue-500/10 text-blue-400 border-blue-500/20': item.status === 'update',
                    'bg-red-500/10 text-red-400 border-red-500/20': item.status === 'invalid'
                  }"
                >
                  <span v-if="item.status === 'new'">✨ NEW</span>
                  <span v-else-if="item.status === 'update'">🔄 UPDATE</span>
                  <span v-else>⚠️ INVALID</span>
                </span>
              </td>
              <td class="px-3 py-2.5 font-mono text-xs text-surface-400 whitespace-nowrap">{{ item.expense.expenseDate || '-' }}</td>
              <td class="px-3 py-2.5">
                <span class="px-2 py-0.5 bg-surface-700 text-surface-300 rounded text-xs whitespace-nowrap">{{ getCategoryLabel(item.expense) }}</span>
              </td>
              <td class="px-3 py-2.5 font-semibold text-surface-100 max-w-[200px]">
                <span class="truncate block">{{ item.expense.description || '-' }}</span>
              </td>
              <td class="px-3 py-2.5 text-surface-400 text-xs max-w-[120px]">
                <span class="truncate block">{{ item.expense.vendor || '-' }}</span>
              </td>
              <td class="px-3 py-2.5 text-surface-400 text-xs whitespace-nowrap">{{ item.expense.unit || '-' }}</td>
              <td class="px-3 py-2.5 text-surface-400 text-xs text-right whitespace-nowrap">{{ item.expense.quantity ?? '-' }}</td>
              <td class="px-3 py-2.5 text-right font-bold text-primary-400 whitespace-nowrap">฿{{ item.expense.amount?.toLocaleString('th-TH') || '0' }}</td>
              <td class="px-3 py-2.5 rounded-r-xl">
                <span v-if="item.error" class="text-[10px] text-red-400 font-bold">{{ item.error }}</span>
                <span v-else class="text-[10px] text-surface-600">—</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Result Table -->
        <template v-else>
          <!-- Success section -->
          <div v-if="resultStats.success > 0" class="mb-6">
            <div class="flex items-center gap-2 mb-3 px-1">
              <span class="text-[11px] font-black uppercase tracking-widest text-emerald-400">✅ บันทึกสำเร็จ ({{ resultStats.success }} รายการ)</span>
            </div>
            <table class="w-full text-left text-sm border-separate border-spacing-y-1.5">
              <thead>
                <tr class="text-surface-500 text-[11px] uppercase tracking-widest">
                  <th class="px-3 py-2">การดำเนินการ</th>
                  <th class="px-3 py-2">วันที่</th>
                  <th class="px-3 py-2">หมวดหมู่</th>
                  <th class="px-3 py-2">คำอธิบาย</th>
                  <th class="px-3 py-2">Vendor</th>
                  <th class="px-3 py-2">หน่วย</th>
                  <th class="px-3 py-2 text-right">จำนวน</th>
                  <th class="px-3 py-2 text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, idx) in results!.filter(r => r.success)"
                  :key="idx"
                  class="bg-emerald-500/5 border border-emerald-500/10 rounded-xl"
                >
                  <td class="px-3 py-2.5 rounded-l-xl">
                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap">
                      <span v-if="r.item.status === 'new'">✨ NEW</span>
                      <span v-else>🔄 UPDATE</span>
                    </span>
                  </td>
                  <td class="px-3 py-2.5 font-mono text-xs text-surface-400 whitespace-nowrap">{{ r.item.expense.expenseDate || '-' }}</td>
                  <td class="px-3 py-2.5">
                    <span class="px-2 py-0.5 bg-surface-700 text-surface-300 rounded text-xs whitespace-nowrap">{{ getCategoryLabel(r.item.expense) }}</span>
                  </td>
                  <td class="px-3 py-2.5 font-semibold text-surface-100 max-w-[200px]">
                    <span class="truncate block">{{ r.item.expense.description || '-' }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-surface-400 text-xs max-w-[120px]">
                    <span class="truncate block">{{ r.item.expense.vendor || '-' }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-surface-400 text-xs whitespace-nowrap">{{ r.item.expense.unit || '-' }}</td>
                  <td class="px-3 py-2.5 text-surface-400 text-xs text-right whitespace-nowrap">{{ r.item.expense.quantity ?? '-' }}</td>
                  <td class="px-3 py-2.5 text-right font-bold text-primary-400 whitespace-nowrap rounded-r-xl">฿{{ r.item.expense.amount?.toLocaleString('th-TH') || '0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Failed section -->
          <div v-if="resultStats.failed > 0">
            <div class="flex items-center gap-2 mb-3 px-1">
              <span class="text-[11px] font-black uppercase tracking-widest text-red-400">❌ ล้มเหลว ({{ resultStats.failed }} รายการ)</span>
            </div>
            <table class="w-full text-left text-sm border-separate border-spacing-y-1.5">
              <thead>
                <tr class="text-surface-500 text-[11px] uppercase tracking-widest">
                  <th class="px-3 py-2">สถานะ</th>
                  <th class="px-3 py-2">วันที่</th>
                  <th class="px-3 py-2">หมวดหมู่</th>
                  <th class="px-3 py-2">คำอธิบาย</th>
                  <th class="px-3 py-2">Vendor</th>
                  <th class="px-3 py-2 text-right">จำนวนเงิน</th>
                  <th class="px-3 py-2 text-red-400">สาเหตุที่ล้มเหลว</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, idx) in results!.filter(r => !r.success)"
                  :key="idx"
                  class="bg-red-500/5 border border-red-500/10 rounded-xl"
                >
                  <td class="px-3 py-2.5 rounded-l-xl">
                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border bg-red-500/10 text-red-400 border-red-500/20 whitespace-nowrap">
                      <span v-if="r.item.status === 'invalid'">⚠️ INVALID</span>
                      <span v-else>❌ ERROR</span>
                    </span>
                  </td>
                  <td class="px-3 py-2.5 font-mono text-xs text-surface-400 whitespace-nowrap">{{ r.item.expense.expenseDate || '-' }}</td>
                  <td class="px-3 py-2.5">
                    <span class="px-2 py-0.5 bg-surface-700 text-surface-300 rounded text-xs whitespace-nowrap">{{ getCategoryLabel(r.item.expense) }}</span>
                  </td>
                  <td class="px-3 py-2.5 font-semibold text-surface-100 max-w-[200px]">
                    <span class="truncate block">{{ r.item.expense.description || '-' }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-surface-400 text-xs max-w-[120px]">
                    <span class="truncate block">{{ r.item.expense.vendor || '-' }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-bold text-primary-400 whitespace-nowrap">฿{{ r.item.expense.amount?.toLocaleString('th-TH') || '0' }}</td>
                  <td class="px-3 py-2.5 rounded-r-xl">
                    <span class="text-[11px] text-red-400 font-bold">{{ r.error }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <footer class="px-8 py-5 border-t border-surface-800 bg-surface-900/50 flex items-center justify-between shrink-0">
        <button
          @click="$emit('close')"
          :disabled="isImporting"
          class="px-6 py-3 rounded-2xl text-sm font-bold text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all border border-transparent hover:border-surface-700 disabled:opacity-30"
        >
          {{ isResultMode ? 'ปิด' : 'ยกเลิก' }}
        </button>
        <button
          v-if="!isResultMode"
          @click="$emit('confirm')"
          :disabled="validItemsCount === 0 || isImporting"
          class="px-10 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xl shadow-primary-900/20 transition-all active:scale-95 flex items-center gap-3"
        >
          <span v-if="isImporting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>{{ isImporting ? 'กำลังบันทึก...' : `🚀 บันทึกข้อมูล ${validItemsCount} รายการ` }}</span>
        </button>
      </footer>
    </div>
  </div>
</template>
