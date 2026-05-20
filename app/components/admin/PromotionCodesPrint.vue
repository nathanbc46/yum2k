<template>
  <Teleport to="body">
    <div class="promo-print-area">
      <div class="codes-grid">
        <div
          v-for="code in unusedCodes"
          :key="code.uuid"
          class="code-card"
        >
          <div class="card-header">🍋 Yum2K</div>
          <div class="card-label">โปรโมชันฟรี!</div>
          <div class="card-product">{{ batch.productNames.join(' / ') }}</div>
          <div class="card-code">{{ code.code }}</div>
          <div class="card-note">ใช้ได้ 1 ครั้ง · กรอกโค้ดที่ POS</div>
          <div v-if="batch.expiresAt" class="card-expire">หมดอายุ {{ formatDate(batch.expiresAt) }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { PromotionBatch, PromotionCode } from '~/types'

const props = defineProps<{
  batch: PromotionBatch
  codes: PromotionCode[]
}>()

const unusedCodes = computed(() => props.codes.filter(c => !c.isUsed && !c.isDeleted))

function formatDate(date: Date | undefined) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<style>
.promo-print-area {
  display: none;
}

@media print {
  /* ซ่อนทุก element ใน body */
  body * {
    visibility: hidden !important;
  }

  /* แสดงเฉพาะ print area และลูกหลานทั้งหมด */
  .promo-print-area {
    display: block !important;
    visibility: visible !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: auto !important;
    background: white !important;
    z-index: 999999 !important;
    padding: 10mm !important;
    box-sizing: border-box !important;
  }

  .promo-print-area * {
    visibility: visible !important;
  }

  @page {
    size: A4;
    margin: 0;
  }
}

.codes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4mm;
}

.code-card {
  border: 1.5px dashed #888;
  border-radius: 6px;
  padding: 5mm 4mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2mm;
  text-align: center;
  page-break-inside: avoid;
  background: white;
}

.card-header {
  font-size: 10pt;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: 1px;
}

.card-label {
  font-size: 8pt;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
}

.card-product {
  font-size: 9pt;
  font-weight: 800;
  color: #2a2a2a;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  padding: 1.5mm 0;
  width: 100%;
}

.card-code {
  font-size: 20pt;
  font-weight: 900;
  letter-spacing: 3px;
  color: #1a1a1a;
  font-family: 'Courier New', monospace;
}

.card-note {
  font-size: 7pt;
  color: #999;
}

.card-expire {
  font-size: 7pt;
  color: #cc4400;
  font-weight: 700;
}
</style>
