<!-- =============================================================================
  PosReceipt.vue
  ใบเสร็จสำหรับพิมพ์ผ่าน Thermal Printer (58mm / 80mm)
  - ข้อมูลร้านดึงจาก useSettings
  - แสดง Add-ons ที่เลือกในแต่ละรายการ
  - Print CSS ที่เข้ากันได้กับเครื่องพิมพ์ความร้อน
============================================================================= -->
<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import type { Order } from '~/types'

const props = defineProps<{
  order: Order | null
}>()

const { receiptSettings, loadReceiptSettings } = useSettings()

onMounted(async () => {
  await loadReceiptSettings()
})

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const paymentMethodLabel = (method: string) => {
  const map: Record<string, string> = {
    cash: 'เงินสด',
    promptpay: 'พร้อมเพย์',
    card: 'บัตรเครดิต/เดบิต',
    unpaid: 'ยังไม่ชำระเงิน',
    other: 'อื่นๆ',
  }
  return map[method] ?? method
}

const paperWidthClass = computed(() =>
  receiptSettings.value.paperSize === '58mm' ? 'receipt-58mm' : 'receipt-80mm'
)
</script>

<template>
  <div
    v-if="order"
    :class="['receipt-base font-mono text-black bg-white', paperWidthClass]"
  >
    <!-- ===== Header ===== -->
    <div class="text-center border-b border-dashed border-black pb-2 mb-3">
      <p class="text-lg font-black uppercase leading-tight">{{ receiptSettings.shopName }}</p>
      <p v-if="receiptSettings.shopTagline" class="text-[11px] mt-0.5">{{ receiptSettings.shopTagline }}</p>
      <p v-if="receiptSettings.shopAddress" class="text-[9px] mt-0.5 leading-relaxed">{{ receiptSettings.shopAddress }}</p>
      <p v-if="receiptSettings.shopPhone" class="text-[10px] mt-0.5">📞 {{ receiptSettings.shopPhone }}</p>
      <p class="text-[9px] mt-1 text-gray-500">{{ formatDate(order.createdAt) }}</p>
    </div>

    <!-- ===== Order Info ===== -->
    <div class="mb-3 text-[10px] space-y-0.5">
      <p v-if="receiptSettings.showOrderNumber">เลขที่บิล: <strong>{{ order.orderNumber }}</strong></p>
      <p v-if="receiptSettings.showStaffName">พนักงาน: {{ order.staffName }}</p>
      <p>ชำระ: {{ paymentMethodLabel(order.paymentMethod) }}</p>
      <div v-if="order.deliveryRef" class="mt-1.5 border border-black p-1 text-center font-bold text-[10px]">
        🛵 DELIVERY: {{ order.deliveryRef }}
      </div>
    </div>

    <!-- ===== Items ===== -->
    <div class="border-t border-dashed border-black pt-2 mb-3">
      <!-- Column Header -->
      <div class="flex justify-between text-[9px] text-gray-500 mb-1 px-0.5">
        <span class="flex-1">รายการ</span>
        <span class="w-7 text-right">จำนวน</span>
        <span class="w-14 text-right">ราคา</span>
      </div>

      <div v-for="item in order.items" :key="`${item.productId}_${item.productName}`" class="mb-1.5 text-[11px]">
        <!-- ชื่อสินค้า + ราคา -->
        <div class="flex justify-between items-start">
          <span class="flex-1 leading-tight pr-1">{{ item.productName }}</span>
          <div class="flex shrink-0">
            <span class="w-7 text-right">x{{ item.quantity }}</span>
            <span class="w-14 text-right">{{ item.totalPrice.toLocaleString() }}</span>
          </div>
        </div>
        <!-- Add-ons (ถ้ามี) -->
        <div v-if="item.addons && item.addons.length > 0" class="text-[9px] text-gray-500 pl-2 mt-0.5">
          <span v-for="(addon, i) in item.addons" :key="addon.id">
            {{ addon.name }}{{ addon.price > 0 ? ` (+${addon.price}฿)` : '' }}{{ i < item.addons!.length - 1 ? ', ' : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- ===== Summary ===== -->
    <div class="space-y-0.5 mb-3 text-xs border-t border-dashed border-black pt-2">
      <div class="flex justify-between">
        <span>ยอดรวม</span>
        <span>{{ order.subtotal.toLocaleString() }}</span>
      </div>
      <div v-if="order.discountAmount > 0" class="flex justify-between">
        <span>ส่วนลด</span>
        <span>-{{ order.discountAmount.toLocaleString() }}</span>
      </div>
      <div v-if="receiptSettings.showTaxInfo && order.taxAmount > 0" class="flex justify-between text-[10px] text-gray-500">
        <span>ภาษี ({{ order.taxRate }}%)</span>
        <span>{{ order.taxAmount.toLocaleString() }}</span>
      </div>
      <div class="flex justify-between text-sm font-black border-t border-black pt-1 mt-1">
        <span>ยอดสุทธิ</span>
        <span>{{ order.totalAmount.toLocaleString() }} บาท</span>
      </div>
      <div v-if="order.amountReceived > 0 && order.paymentMethod === 'cash'" class="flex justify-between text-[10px]">
        <span>รับเงิน</span>
        <span>{{ order.amountReceived.toLocaleString() }}</span>
      </div>
      <div v-if="order.changeAmount > 0" class="flex justify-between text-[11px] font-bold">
        <span>เงินทอน</span>
        <span>{{ order.changeAmount.toLocaleString() }}</span>
      </div>
    </div>

    <!-- หมายเหตุ -->
    <div v-if="order.note" class="text-[10px] border border-dashed border-gray-400 px-2 py-1 mb-3 rounded">
      หมายเหตุ: {{ order.note }}
    </div>

    <!-- ===== Footer ===== -->
    <div class="text-center pt-2 border-t border-dashed border-black mt-2">
      <p class="text-[11px] font-bold">{{ receiptSettings.footerMessage }}</p>
      <p class="text-[8px] mt-1 text-gray-400">Yum2K POS · Offline First</p>
    </div>
  </div>
</template>

<style scoped>
.receipt-base {
  padding: 4mm 3mm;
  color: #000;
  background: #fff;
}
.receipt-58mm {
  width: 48mm;   /* พื้นที่พิมพ์ได้จริงของกระดาษ 58mm */
  font-size: 10px;
}
.receipt-80mm {
  width: 72mm;   /* พื้นที่พิมพ์ได้จริงของกระดาษ 80mm */
  font-size: 11px;
}

@media print {
  /* ซ่อนทุกอย่างยกเว้น .receipt-base */
  body * {
    visibility: hidden;
  }
  .receipt-base, .receipt-base * {
    visibility: visible;
  }
  .receipt-base {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    box-shadow: none !important;
  }
  @page {
    margin: 0;
    size: auto;
  }
}
</style>
