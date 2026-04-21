<template>
  <div class="flex-1 min-h-0 overflow-hidden bg-surface-950 relative print:hidden">
    <PosLayout>
      <!-- ซ้าย: ตะกร้า -->
      <template #cart>
        <PosCart />
      </template>

      <!-- กลาง: สินค้าตามหมวดหมู่ -->
      <template #grid>
        <PosProductGrid />
      </template>

      <!-- ขวา: เมนูหมวดหมู่ -->
      <template #categories>
        <PosCategories />
      </template>
    </PosLayout>
  </div>

  <!-- ใบเสร็จสำหรับพิมพ์ (จะถูกซ่อนไว้ในหน้าจอปกติ และแสดงเฉพาะตอนสั่งพิมพ์) -->
  <div class="hidden print:block print:absolute print:inset-0 print:bg-white print:z-50">
    <PosReceipt v-if="posStore.lastOrder" :order="posStore.lastOrder" />
  </div>

  <!-- Modal สำหรับเลือก/แก้ไข Addons (Global Overlay) -->
  <PosAddonSelection />
</template>

<script setup lang="ts">
import PosLayout from '~/components/pos/PosLayout.vue'
import PosCategories from '~/components/pos/PosCategories.vue'
import PosCart from '~/components/pos/PosCart.vue'
import PosReceipt from '~/components/pos/PosReceipt.vue'
import PosAddonSelection from '~/components/pos/PosAddonSelection.vue'
import { usePosStore } from '~/stores/pos'

const posStore = usePosStore()

// โหลดข้อมูลเมื่อเข้าหน้าจอขาย
onMounted(async () => {
  await posStore.loadData()
})

definePageMeta({ layout: false })
</script>
