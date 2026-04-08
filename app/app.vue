<template>
  <div 
    class="flex flex-col h-screen overflow-hidden"
    :class="theme === 'light' ? 'light-mode' : ''"
  >
    <!-- Network Status Banner: แสดงเฉพาะเมื่อมีเน็ตและมีงานค้าง -->
    <Transition name="slide-down">
      <div 
        v-if="isOnline && (pendingCount > 0 || pendingStockAuditCount > 0)" 
        class="bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4 z-[60] relative shrink-0 shadow-lg"
      >
        <span class="flex items-center gap-2">
          <span class="animate-pulse">📤</span>
          <span>มีรายการรอส่งขึ้น Cloud...</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="bg-surface-950/20 px-2 py-0.5 rounded-full text-xs font-mono">
             ออร์เดอร์ {{ pendingCount }} | สต็อก {{ pendingStockAuditCount }}
          </span>
          <button 
            @click="() => syncPendingOrders(true)"
            :disabled="isSyncing"
            class="bg-white text-orange-600 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:bg-orange-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSyncing" class="w-3 h-3 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></span>
            <span>{{ isSyncing ? 'กำลังส่ง...' : 'ซิงค์ตอนนี้ 📤' }}</span>
          </button>
        </span>
      </div>
    </Transition>

    <div class="flex-1 flex flex-col relative overflow-hidden">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
    
    <!-- (ปุ่มสลับธีมถูกย้ายไปที่ Sidebar แล้ว) -->

    <!-- ใบเสร็จ (ซ่อนไว้เสมอ จะแสดงเฉพาะตอนสั่ง Print) -->
    <div class="print-only print-area">
      <PosReceipt v-if="posStore.lastOrder" :order="posStore.lastOrder" />
    </div>

    <!-- PWA -->
    <VitePwaManifest />
    <PwaInstallPrompt />

    <!-- Toast Layer -->
    <ToastProvider />
  </div>
</template>

<script setup lang="ts">
import { useSync } from '~/composables/useSync'
import { usePosStore } from '~/stores/pos'
import { useTheme } from '~/composables/useTheme'
import { useToast } from '~/composables/useToast'
import PosReceipt from '~/components/pos/PosReceipt.vue'
import PwaInstallPrompt from '~/components/admin/PwaInstallPrompt.vue'
import ToastProvider from '~/components/ui/ToastProvider.vue'

const { 
  isOnline, isSyncing, pendingCount, pendingStockAuditCount,
  setupNetworkListener, syncPendingOrders, refreshPendingCount,
  startHeartbeatSync, stopHeartbeatSync
} = useSync()
const posStore = usePosStore()
const { theme, toggleTheme } = useTheme()
const toast = useToast()

let cleanupNetwork: (() => void) | null = null

onMounted(() => {
  cleanupNetwork = setupNetworkListener()
  refreshPendingCount()
  startHeartbeatSync()
})

// แจ้งเตือนเมื่อมีการซิงค์ออร์เดอร์สำเร็จในพื้นหลัง
watch(isSyncing, (val, oldVal) => {
  if (oldVal === true && val === false) {
    // ซิงค์เสร็จแล้ว
    if (pendingCount.value === 0 && pendingStockAuditCount.value === 0) {
      toast.success('☁️ ซิงค์ข้อมูลขึ้น Cloud เรียบร้อยแล้ว')
    }
  }
})

onUnmounted(() => {
  if (cleanupNetwork) cleanupNetwork()
  stopHeartbeatSync()
})
</script>

<style>
/* ปรับปรุง Transition ให้ลื่นไหลขึ้น */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
  margin-bottom: -40px; /* ลดช่องว่างขณะหายไป */
}
</style>
