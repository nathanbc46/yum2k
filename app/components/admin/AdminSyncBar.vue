<script setup lang="ts">
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useSync } from '~/composables/useSync'

const masterSync = useMasterDataSync()
// nextSyncCountdown คือ Countdown เดียวกับ Background Heartbeat ใน useSync.ts
const { syncPendingOrders, fetchRemoteOrders, isOnline, isSyncing, lastSyncAt, nextSyncCountdown } = useSync()
const toast = useToast()

// 🚀 Push Data (Local -> Cloud)
const pushCounts = ref({
  orders: 0, orderNumbers: [] as string[],
  stockLogs: 0, stockLogDetails: [] as string[],
})

// 📥 Pull Data (Cloud -> Local)
const pullCounts = ref({
  categories: 0, categoryNames: [] as string[],
  products: 0, productNames: [] as string[],
  users: 0, userNames: [] as string[],
  stockLogs: 0, stockLogDetails: [] as string[],
  orders: 0, orderNumbers: [] as string[]
})

const isLoadingPush = ref(false)
const isLoadingPull = ref(false)

const totalPush = computed(() => pushCounts.value.orders + pushCounts.value.stockLogs)
const totalPull = computed(() => pullCounts.value.categories + pullCounts.value.products + pullCounts.value.users + pullCounts.value.stockLogs + pullCounts.value.orders)

// แสดงผล MM:SS จาก Countdown ที่ใช้ร่วมกับ Heartbeat (ใช้สำหรับแค่ Push)
const countdownLabel = computed(() => {
  const v = nextSyncCountdown.value
  const m = Math.floor(v / 60)
  const s = v % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

const countdownClass = computed(() => {
  return nextSyncCountdown.value <= 60 ? 'text-amber-400 font-black' : 'text-white/40'
})

// โหลดข้อมูลเครื่อง (Push) - ไม่ต้องใช้เน็ต เช็คได้ถี่
async function loadLocalCounts() {
  if (!import.meta.client) return
  const result = await masterSync.getPendingCounts()
  pushCounts.value = {
    orders: result.orders, orderNumbers: result.orderNumbers,
    stockLogs: result.stockLogs, stockLogDetails: result.stockLogDetails
  }
}

// โหลดข้อมูลจากคลาวด์ (Pull) - ยิงผ่านเน็ต ไม่ควรยิงบ่อย 
async function loadRemoteCounts() {
  if (!import.meta.client || !isOnline.value) return
  const result = await masterSync.getPendingPullCounts()
  pullCounts.value = result
}

// กด Sync ขึ้น Cloud (🚀)
async function handlePush() {
  if (isSyncing.value || !isOnline.value || isLoadingPush.value) return
  isLoadingPush.value = true
  try {
    const res = await syncPendingOrders(true)
    await loadLocalCounts()
    const msg = [
      '📤 ซิงค์ข้อมูลขึ้น Cloud สำเร็จ!',
      res.orders.success > 0 ? `• ออร์เดอร์: ${res.orders.success} รายการ` : '',
      res.auditLogs.success > 0 ? `• ประวัติสต็อก: ${res.auditLogs.success} รายการ` : '',
    ].filter(Boolean).join('\n')
    toast.success(msg, 5000)
  } finally {
    isLoadingPush.value = false
  }
}

// กด Sync ลงมาจาก Cloud (📥)
async function handlePull() {
  if (masterSync.isSyncingMaster.value || !isOnline.value || isLoadingPull.value) return
  isLoadingPull.value = true
  try {
    const resMaster = await masterSync.pullAll(true)
    const orderCount = await fetchRemoteOrders(200, false)
    const msg = [
      '📥 ดึงข้อมูลประวัติจาก Cloud สำเร็จ!',
      orderCount > 0 ? `• ออร์เดอร์: ${orderCount} รายการ` : '',
      resMaster.categories > 0 ? `• หมวดหมู่สินค้า: ${resMaster.categories} รายการ` : '',
      resMaster.products > 0 ? `• รายการสินค้า: ${resMaster.products} รายการ` : '',
      resMaster.users > 0 ? `• พนักงาน: ${resMaster.users} รายการ` : '',
      resMaster.stockLogs > 0 ? `• ประวัติสต็อก: ${resMaster.stockLogs} รายการ` : ''
    ].filter(Boolean).join('\n')
    toast.success(msg, 7000)
    await loadRemoteCounts()
  } catch (e: any) {
    toast.error('การดึงข้อมูลล้มเหลว: ' + e.message)
  } finally {
    isLoadingPull.value = false
  }
}

// Refresh เมื่อ Sync เสร็จจาก Background
watch(lastSyncAt, () => loadLocalCounts())
watch(() => masterSync.lastMasterSyncAt.value, () => loadRemoteCounts())

// รีทริกเกอร์โหลด Remote ถ้าระบบออนไลน์กลับมา
watch(isOnline, (online) => {
  if (online) loadRemoteCounts()
})

if (import.meta.client) {
  onMounted(() => {
    loadLocalCounts()
    loadRemoteCounts()
    
    // Refresh Local (Push) ทุก 10 วินาที
    const localInterval = setInterval(loadLocalCounts, 10000)
    // Refresh Remote (Pull) ทุก 5 นาที (300,000 ms) เพื่อประหยัด Quota และลดการทำงานของเครื่อง
    const remoteInterval = setInterval(loadRemoteCounts, 300000)

    onUnmounted(() => {
      clearInterval(localInterval)
      clearInterval(remoteInterval)
    })
  })
}
</script>

<template>
  <div class="flex flex-col w-full sticky top-0 z-[45]">
    <!-- ============================================== -->
    <!-- 1. PUSH BAR (Local -> Cloud) -->
    <!-- ============================================== -->
    <Transition name="slide-down">
      <div
        v-if="totalPush > 0"
        class="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4 backdrop-blur-md overflow-visible relative z-10"
      >
        <!-- Left: Indicator + Badges -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative flex h-2 w-2 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </div>

          <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0 hidden sm:inline">ข้อความรอ Sync ขึ้น Cloud:</span>

          <div class="flex items-center gap-1.5 flex-wrap">
            <div v-if="pushCounts.orders > 0" class="tooltip-wrapper">
              <span class="badge badge-order">
                📦 <span>ออร์เดอร์</span> <span class="font-black">{{ pushCounts.orders }}</span>
              </span>
              <div class="tooltip-popup">
                <div class="tooltip-title">📦 ออร์เดอร์รอส่งขึ้น Cloud</div>
                <div v-for="num in pushCounts.orderNumbers.slice(0, 5)" :key="num" class="tooltip-item">{{ num }}</div>
              </div>
            </div>
            
            <div v-if="pushCounts.stockLogs > 0" class="tooltip-wrapper">
              <span class="badge badge-stock">
                📊 <span>สต็อก</span> <span class="font-black">{{ pushCounts.stockLogs }}</span>
              </span>
              <div class="tooltip-popup">
                <div class="tooltip-title">📊 ประวัติสต็อกรอส่งขึ้น Cloud</div>
                <div v-for="detail in pushCounts.stockLogDetails.slice(0, 5)" :key="detail" class="tooltip-item">{{ detail }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Push Sync Button -->
        <button
          @click="handlePush"
          :disabled="isLoadingPush || isSyncing || !isOnline"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          :class="isOnline ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-sm' : 'bg-surface-700 text-surface-400'"
        >
          <span :class="{ 'animate-spin': isLoadingPush || isSyncing }">
            {{ isLoadingPush || isSyncing ? '⏳' : '🚀' }}
          </span>
          <span v-if="isLoadingPush || isSyncing">กำลัง Sync...</span>
          <template v-else>
            <span>Sync ขึ้น Cloud</span>
            <span class="ml-1 px-1.5 py-0.5 rounded-md bg-black/15 text-[10px] font-mono tabular-nums" :class="countdownClass">
              {{ countdownLabel }}
            </span>
          </template>
        </button>
      </div>
    </Transition>

    <!-- ============================================== -->
    <!-- 2. PULL BAR (Cloud -> Local) -->
    <!-- ============================================== -->
    <Transition name="slide-down">
      <div
        v-if="totalPull > 0"
        class="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between gap-4 backdrop-blur-md overflow-visible"
      >
        <!-- Left: Indicator + Badges -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative flex h-2 w-2 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </div>

          <span class="text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0 hidden sm:inline">อัปเดตข้อมูลจาก Cloud:</span>

          <div class="flex items-center gap-1.5 flex-wrap">
            <div v-if="pullCounts.orders > 0" class="tooltip-wrapper">
              <span class="badge badge-order">
                📦 <span>ออร์เดอร์</span> <span class="font-black">{{ pullCounts.orders }}</span>
              </span>
              <div class="tooltip-popup">
                <div class="tooltip-title">📦 ออร์เดอร์มีอัปเดต ({{ pullCounts.orders }})</div>
                <div class="tooltip-item italic">ดึงประวัติการขายที่เกิดจากเครื่องอื่น</div>
                <div v-for="num in pullCounts.orderNumbers.slice(0, 5)" :key="num" class="tooltip-item">- {{ num }}</div>
                <div v-if="pullCounts.orderNumbers.length > 5" class="tooltip-item text-xs mt-1 opacity-70">และอื่นๆ...</div>
              </div>
            </div>

            <div v-if="pullCounts.categories > 0" class="tooltip-wrapper">
              <span class="badge badge-cat">
                📂 <span>หมวดหมู่</span> <span class="font-black">{{ pullCounts.categories }}</span>
              </span>
              <div class="tooltip-popup">
                <div class="tooltip-title">📂 หมวดหมู่มีอัปเดต ({{ pullCounts.categories }})</div>
                <div v-for="name in pullCounts.categoryNames.slice(0, 5)" :key="name" class="tooltip-item">- {{ name }}</div>
                <div v-if="pullCounts.categoryNames.length > 5" class="tooltip-item text-xs mt-1 opacity-70">และอื่นๆ...</div>
              </div>
            </div>

            <div v-if="pullCounts.products > 0" class="tooltip-wrapper">
              <span class="badge badge-prod">
                🏷️ <span>สินค้า</span> <span class="font-black">{{ pullCounts.products }}</span>
              </span>
              <div class="tooltip-popup">
                <div class="tooltip-title">🏷️ สินค้ามีอัปเดต ({{ pullCounts.products }})</div>
                <div v-for="name in pullCounts.productNames.slice(0, 5)" :key="name" class="tooltip-item">- {{ name }}</div>
                <div v-if="pullCounts.productNames.length > 5" class="tooltip-item text-xs mt-1 opacity-70">และอื่นๆ...</div>
              </div>
            </div>

            <div v-if="pullCounts.users > 0" class="tooltip-wrapper">
              <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: rgb(16, 185, 129); border-color: rgba(16, 185, 129, 0.25);">
                👥 <span>พนักงาน</span> <span class="font-black">{{ pullCounts.users }}</span>
              </span>
              <div class="tooltip-popup">
                <div class="tooltip-title">👥 พนักงานมีอัปเดต ({{ pullCounts.users }})</div>
                <div v-for="name in pullCounts.userNames.slice(0, 5)" :key="name" class="tooltip-item">- {{ name }}</div>
                <div v-if="pullCounts.userNames.length > 5" class="tooltip-item text-xs mt-1 opacity-70">และอื่นๆ...</div>
              </div>
            </div>
            
            <div v-if="pullCounts.stockLogs > 0" class="tooltip-wrapper">
              <span class="badge badge-stock">
                📊 <span>ประวัติสต็อก</span> <span class="font-black">{{ pullCounts.stockLogs }}</span>
              </span>
              <div class="tooltip-popup">
                <div class="tooltip-title">📊 สต็อกมีการอัปเดต ({{ pullCounts.stockLogs }})</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Pull Sync Button -->
        <button
          @click="handlePull"
          :disabled="isLoadingPull || masterSync.isSyncingMaster.value || !isOnline"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          :class="isOnline ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm' : 'bg-surface-700 text-surface-400'"
        >
          <span :class="{ 'animate-spin': isLoadingPull || masterSync.isSyncingMaster.value }">
            {{ isLoadingPull || masterSync.isSyncingMaster.value ? '⏳' : '📥' }}
          </span>
          <span>{{ isLoadingPull || masterSync.isSyncingMaster.value ? 'กำลังดึงข้อมูล...' : 'Sync ลงมาจาก Cloud' }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 60px;
  opacity: 1;
}

/* --- Tooltip Badges --- */
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip-wrapper:hover .tooltip-popup {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.6rem;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 800;
  cursor: default;
  white-space: nowrap;
  border-width: 1px;
  border-style: solid;
  transition: all 0.15s ease;
}
.badge:hover {
  filter: brightness(1.15);
}
.badge-order { background: rgb(var(--color-primary-500) / 0.1); color: rgb(var(--color-primary-500)); border-color: rgb(var(--color-primary-500) / 0.25); }
.badge-cat   { background: rgb(245 158 11 / 0.1); color: rgb(180 110 0); border-color: rgb(245 158 11 / 0.25); }
.badge-prod  { background: rgb(59 130 246 / 0.1); color: rgb(59 130 246); border-color: rgb(59 130 246 / 0.25); }
.badge-stock { background: rgb(168 85 247 / 0.1); color: rgb(168 85 247); border-color: rgb(168 85 247 / 0.25); }

/* dark mode overrides */
:global(.dark) .badge-cat,
.dark .badge-cat { color: rgb(251 191 36); }

.tooltip-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 200;
  min-width: 180px;
  max-width: 260px;
  /* สีพื้นหลังเข้มเสมอ ทั้ง light & dark mode */
  background: #1e2133;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.tooltip-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.45);
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.tooltip-item {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.88);
  padding: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-more {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.35);
  margin-top: 4px;
  font-style: italic;
}
</style>
