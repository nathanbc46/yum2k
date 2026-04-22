<template>
  <div 
    class="flex flex-col h-screen overflow-hidden"
    :class="theme === 'light' ? 'light-mode' : ''"
  >
    <!-- Network Status Banner: แสดงเฉพาะเมื่อมีเน็ตและมีงานค้าง -->
    <Transition name="slide-down">
      <div 
      v-if="!isAdminPage && !bannerDismissed && isOnline && pendingCount > 0" 
        class="bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4 z-[60] relative shrink-0 shadow-lg"
      >
        <span class="flex items-center gap-2">
          <span class="animate-pulse">📤</span>
          <span>มีรายการรอส่งขึ้น Cloud...</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="bg-surface-950/20 px-2 py-0.5 rounded-full text-xs font-mono">
            ออร์เดอร์รอส่ง {{ pendingCount }} รายการ
          </span>
          <button 
            @click="() => syncPendingOrders(true)"
            :disabled="isSyncing"
            class="bg-white text-orange-600 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:bg-orange-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSyncing" class="w-3 h-3 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></span>
            <span>{{ isSyncing ? 'กำลังส่ง...' : 'ซิงค์ตอนนี้ 📤' }}</span>
            <!-- Countdown เดียวกับ Background Heartbeat -->
            <span 
              v-if="!isSyncing"
              class="ml-0.5 px-1.5 py-0.5 rounded-md bg-orange-100 text-[10px] font-mono tabular-nums font-bold"
              :class="nextSyncCountdown <= 60 ? 'text-red-600' : 'text-orange-500'"
            >
              {{ Math.floor(nextSyncCountdown / 60) }}:{{ String(nextSyncCountdown % 60).padStart(2, '0') }}
            </span>
          </button>
          <!-- ปุ่มปิดแถบ -->
          <button
            @click="bannerDismissed = true"
            class="ml-1 p-1 rounded-full hover:bg-white/20 active:scale-90 transition-all text-white/80 hover:text-white"
            title="ปิดแถบนี้"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
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
  startHeartbeatSync, stopHeartbeatSync, nextSyncCountdown
} = useSync()
const posStore = usePosStore()
const { theme, toggleTheme } = useTheme()
const toast = useToast()
const route = useRoute()

// ซ่อนแถบสีส้มในหน้า Admin เพราะมี AdminSyncBar จัดการแทนแล้ว
const isAdminPage = computed(() => route.path.startsWith('/admin'))

// ให้พนักงาน POS ปิดแถบได้ชั่วคราว
const bannerDismissed = ref(false)

// แสดงแถบใหม่อีกครั้งเมื่อมี Order ใหม่เข้ามา
watch(pendingCount, (newVal, oldVal) => {
  if (newVal > oldVal) bannerDismissed.value = false
})

let cleanupNetwork: (() => void) | null = null

onMounted(() => {
  cleanupNetwork = setupNetworkListener()
  refreshPendingCount()
  startHeartbeatSync()
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
