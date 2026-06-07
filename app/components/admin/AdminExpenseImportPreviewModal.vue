<script setup lang="ts">
import { computed } from 'vue'
import type { ExpenseImportPreviewItem } from '~/composables/useExpenseExcel'

const props = defineProps<{
  isOpen: boolean
  items: ExpenseImportPreviewItem[]
}>()

defineEmits(['close', 'confirm'])

const stats = computed(() => ({
  new: props.items.filter(i => i.status === 'new').length,
  update: props.items.filter(i => i.status === 'update').length,
  invalid: props.items.filter(i => i.status === 'invalid').length,
}))

const validItemsCount = computed(() => stats.value.new + stats.value.update)

const LEGACY_LABELS: Record<string, string> = {
  ingredient: 'วัตถุดิบ',
  utility: 'ค่าน้ำ/ไฟ/แก๊ส',
  wage: 'ค่าจ้างพนักงาน',
  rent: 'ค่าเช่าที่',
  supplies: 'วัสดุสิ้นเปลือง',
  other: 'อื่นๆ'
}

function getCategoryLabel(item: ExpenseImportPreviewItem['expense']): string {
  // ระบบใหม่: categoryName จาก import หรือ categoryId
  if ((item as any).categoryName) return (item as any).categoryName
  if (item.category) return LEGACY_LABELS[item.category] || item.category
  return '-'
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-6xl max-h-[90vh] bg-surface-900 border border-surface-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">

      <!-- Header -->
      <header class="px-8 py-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/50 shrink-0">
        <div>
          <h2 class="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <span>📋 ตรวจสอบข้อมูลก่อนนำเข้า (รายจ่าย)</span>
            <span class="text-sm font-normal text-surface-400 bg-surface-800 px-3 py-1 rounded-full uppercase tracking-wider">PREVIEW</span>
          </h2>
          <p class="text-sm text-surface-500 mt-1">กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยันการบันทึกลงฐานข้อมูล</p>
        </div>
        <button @click="$emit('close')" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-800 text-surface-400 transition-all">✕</button>
      </header>

      <!-- Stats -->
      <div class="px-8 py-4 bg-surface-950/30 flex items-center gap-6 border-b border-surface-800 shrink-0">
        <div class="flex flex-col">
          <span class="text-[10px] text-surface-500 uppercase font-bold tracking-widest">ทั้งหมด</span>
          <span class="text-xl font-bold text-surface-50">{{ items.length }} รายการ</span>
        </div>
        <div class="w-px h-8 bg-surface-800"></div>
        <div class="flex flex-col">
          <span class="text-[10px] text-emerald-400 uppercase font-bold tracking-widest">เพิ่มใหม่</span>
          <span class="text-xl font-bold text-emerald-400">{{ stats.new }}</span>
        </div>
        <div class="w-px h-8 bg-surface-800"></div>
        <div class="flex flex-col">
          <span class="text-[10px] text-blue-400 uppercase font-bold tracking-widest">อัปเดต</span>
          <span class="text-xl font-bold text-blue-400">{{ stats.update }}</span>
        </div>
        <template v-if="stats.invalid > 0">
          <div class="w-px h-8 bg-surface-800"></div>
          <div class="flex flex-col">
            <span class="text-[10px] text-red-400 uppercase font-bold tracking-widest">ไม่ถูกต้อง</span>
            <span class="text-xl font-bold text-red-400">{{ stats.invalid }}</span>
          </div>
        </template>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto p-4">
        <table class="w-full text-left text-sm border-separate border-spacing-y-1.5">
          <thead>
            <tr class="text-surface-500 text-[11px] uppercase tracking-widest">
              <th class="px-3 py-2">สถานะ</th>
              <th class="px-3 py-2">วันที่</th>
              <th class="px-3 py-2">หมวดหมู่</th>
              <th class="px-3 py-2">คำอธิบาย</th>
              <th class="px-3 py-2">Vendor</th>
              <th class="px-3 py-2">หน่วย</th>
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
              <!-- Status -->
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

              <!-- Date -->
              <td class="px-3 py-2.5 font-mono text-xs text-surface-400 whitespace-nowrap">
                {{ item.expense.expenseDate || '-' }}
              </td>

              <!-- Category -->
              <td class="px-3 py-2.5">
                <span class="px-2 py-0.5 bg-surface-700 text-surface-300 rounded text-xs whitespace-nowrap">
                  {{ getCategoryLabel(item.expense) }}
                </span>
              </td>

              <!-- Description -->
              <td class="px-3 py-2.5 font-semibold text-surface-100 max-w-[200px]">
                <span class="truncate block">{{ item.expense.description || '-' }}</span>
              </td>

              <!-- Vendor -->
              <td class="px-3 py-2.5 text-surface-400 text-xs max-w-[120px]">
                <span class="truncate block">{{ item.expense.vendor || '-' }}</span>
              </td>

              <!-- Unit -->
              <td class="px-3 py-2.5 text-surface-400 text-xs whitespace-nowrap">
                {{ item.expense.unit || '-' }}
              </td>

              <!-- Amount -->
              <td class="px-3 py-2.5 text-right font-bold text-primary-400 whitespace-nowrap">
                ฿{{ item.expense.amount?.toLocaleString('th-TH') || '0' }}
              </td>

              <!-- Error/Note -->
              <td class="px-3 py-2.5 rounded-r-xl">
                <span v-if="item.error" class="text-[10px] text-red-400 font-bold">{{ item.error }}</span>
                <span v-else class="text-[10px] text-surface-600">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <footer class="px-8 py-5 border-t border-surface-800 bg-surface-900/50 flex items-center justify-between shrink-0">
        <button
          @click="$emit('close')"
          class="px-6 py-3 rounded-2xl text-sm font-bold text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all border border-transparent hover:border-surface-700"
        >
          ยกเลิก
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="validItemsCount === 0"
          class="px-10 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xl shadow-primary-900/20 transition-all active:scale-95 flex items-center gap-3"
        >
          <span>🚀 บันทึกข้อมูล {{ validItemsCount }} รายการ</span>
        </button>
      </footer>
    </div>
  </div>
</template>
