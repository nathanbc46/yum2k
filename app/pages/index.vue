<template>
  <AppErrorBoundary>
    <!-- Loading State -->
    <div v-if="posStore.isLoading" class="flex-1 flex flex-col items-center justify-center bg-surface-950 gap-4">
      <div class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      <p class="text-surface-500 text-sm">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="posStore.loadError" class="flex-1 flex flex-col items-center justify-center bg-surface-950 p-8 gap-6">
      <div class="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-4xl border border-red-500/20">
        ⚠️
      </div>
      <div class="text-center">
        <h2 class="text-xl font-black text-surface-50 mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
        <p class="text-surface-400 text-sm max-w-sm leading-relaxed">{{ posStore.loadError }}</p>
      </div>
      <button
        @click="posStore.loadData()"
        class="px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-all active:scale-95"
      >
        ลองใหม่อีกครั้ง
      </button>
    </div>

    <!-- Normal POS UI -->
    <template v-else>
      <PrinterStatusBanner class="print:hidden" />
      <div class="flex-1 min-h-0 overflow-hidden bg-surface-950 relative print:hidden">
        <PosLayout v-if="posStore.viewMode === 'pos'">
          <template #cart="{ closeMobile }">
            <PosCart @close-mobile="closeMobile" />
          </template>
          <template #grid><PosProductGrid /></template>
          <template #categories><PosCategories /></template>
        </PosLayout>
        <PosKitchen v-else />
      </div>

      <div class="hidden print:block print:absolute print:inset-0 print:bg-white print:z-50">
        <PosReceipt v-if="posStore.lastOrder" :order="posStore.lastOrder" />
      </div>

      <PosAddonSelection />
      <PosBankAlert />
    </template>
  </AppErrorBoundary>
</template>

<script setup lang="ts">
import PosLayout from '~/components/pos/PosLayout.vue'
import PosCategories from '~/components/pos/PosCategories.vue'
import PosCart from '~/components/pos/PosCart.vue'
import PosReceipt from '~/components/pos/PosReceipt.vue'
import PosAddonSelection from '~/components/pos/PosAddonSelection.vue'
import PosKitchen from '~/components/pos/PosKitchen.vue'
import PosBankAlert from '~/components/pos/PosBankAlert.vue'
import AppErrorBoundary from '~/components/ui/AppErrorBoundary.vue'
import { usePosStore } from '~/stores/pos'
import { useBankTransferAlert } from '~/composables/useBankTransferAlert'

const posStore = usePosStore()
const { startListening, stopListening } = useBankTransferAlert()

onMounted(async () => {
  await posStore.loadData()
  startListening()
})

onUnmounted(() => {
  stopListening()
})

definePageMeta({ layout: false })
</script>
