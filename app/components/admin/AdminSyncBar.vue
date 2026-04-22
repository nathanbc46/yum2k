<script setup lang="ts">
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useSync } from '~/composables/useSync'

const masterSync = useMasterDataSync()
// nextSyncCountdown คือ Countdown เดียวกับ Background Heartbeat ใน useSync.ts
const { syncPendingOrders, isOnline, isSyncing, lastSyncAt, nextSyncCountdown } = useSync()
const toast = useToast()

// จำนวนรายการที่รอ Sync (รวมรายชื่อสำหรับ Tooltip)
const counts = ref({
  categories: 0, categoryNames: [] as string[],
  products: 0, productNames: [] as string[],
  orders: 0, orderNumbers: [] as string[],
  stockLogs: 0, stockLogDetails: [] as string[],
})
const isLoading = ref(false)

const totalPending = computed(() => {
  return counts.value.categories + counts.value.products + counts.value.orders + counts.value.stockLogs
})

// แสดงผล MM:SS จาก Countdown ที่ใช้ร่วมกับ Heartbeat
const countdownLabel = computed(() => {
  const v = nextSyncCountdown.value
  const m = Math.floor(v / 60)
  const s = v % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

// เปลี่ยนสีเมื่อเหลือน้อยกว่า 1 นาที
const countdownClass = computed(() => {
  return nextSyncCountdown.value <= 60 ? 'text-amber-400 font-black' : 'text-white/40'
})

// โหลดจำนวนรายการที่รอ Sync (ใช้ logic เดียวกับ pushAll)
async function loadCounts() {
  if (!import.meta.client) return
  const result = await masterSync.getPendingCounts()
  counts.value = result
}

// กด Sync ขึ้น Cloud (ทำงานเฉพาะตอนกดปุ่มเท่านั้น)
async function handleSync() {
  if (isSyncing.value || !isOnline.value) return
  isLoading.value = true
  try {
    // ใช้ force=true เพื่อกดดัน toast อัตโนมัติใน syncPendingOrders ไม่ให้ซ้อนกัน
    // (toast อัตโนมัติจะแสดงเฉพาะเมื่อ force=false เท่านั้น)
    const res = await syncPendingOrders(true)
    await loadCounts()
    const msg = [
      '📤 ซิงค์ข้อมูลขึ้น Cloud สำเร็จ!',
      res.orders.success > 0 ? `• ออร์เดอร์: ${res.orders.success} รายการ` : '',
      res.categories > 0 ? `• หมวดหมู่: ${res.categories} รายการ` : '',
      res.products > 0 ? `• สินค้า: ${res.products} รายการ` : '',
      res.auditLogs.success > 0 ? `• ประวัติสต็อก: ${res.auditLogs.success} รายการ` : '',
    ].filter(Boolean).join('\n')
    toast.success(msg, 5000)
  } finally {
    isLoading.value = false
  }
}

// Refresh ตัวเลขเมื่อ Sync เสร็จ (ทั้ง manual และ background)
watch(lastSyncAt, () => loadCounts())
watch(() => masterSync.lastMasterSyncAt.value, () => loadCounts())

if (import.meta.client) {
  onMounted(() => {
    loadCounts()
    // Refresh ตัวเลขทุก 30 วินาที (ไม่ต้องจัดการ countdown เองแล้ว)
    const refreshInterval = setInterval(loadCounts, 30000)
    onUnmounted(() => clearInterval(refreshInterval))
  })
}
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="totalPending > 0"
      class="bg-amber-500/5 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4 sticky top-0 z-[45] backdrop-blur-md overflow-visible"
    >
      <!-- Left: Indicator + Badges -->
      <div class="flex items-center gap-3 min-w-0">
        <!-- Pulse dot -->
        <div class="relative flex h-2 w-2 shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </div>

        <span class="text-[11px] font-bold text-amber-600/80 dark:text-amber-400/80 shrink-0 hidden sm:inline">รอ Sync:</span>

        <!-- Badges with Hover Tooltip -->
        <div class="flex items-center gap-1.5 flex-wrap">

          <!-- Orders Badge -->
          <div v-if="counts.orders > 0" class="tooltip-wrapper">
            <span class="badge badge-order">
              📦 <span>ออร์เดอร์</span> <span class="font-black">{{ counts.orders }}</span>
            </span>
            <div class="tooltip-popup">
              <div class="tooltip-title">📦 ออร์เดอร์ที่รอ Sync</div>
              <div v-for="num in counts.orderNumbers.slice(0, 5)" :key="num" class="tooltip-item">
                {{ num }}
              </div>
              <div v-if="counts.orderNumbers.length > 5" class="tooltip-more">
                +{{ counts.orderNumbers.length - 5 }} รายการ
              </div>
            </div>
          </div>

          <!-- Categories Badge -->
          <div v-if="counts.categories > 0" class="tooltip-wrapper">
            <span class="badge badge-cat">
              📂 <span>หมวดหมู่</span> <span class="font-black">{{ counts.categories }}</span>
            </span>
            <div class="tooltip-popup">
              <div class="tooltip-title">📂 หมวดหมู่ที่รอ Sync</div>
              <div v-for="name in counts.categoryNames.slice(0, 5)" :key="name" class="tooltip-item">
                {{ name }}
              </div>
              <div v-if="counts.categoryNames.length > 5" class="tooltip-more">
                +{{ counts.categoryNames.length - 5 }} รายการ
              </div>
            </div>
          </div>

          <!-- Products Badge -->
          <div v-if="counts.products > 0" class="tooltip-wrapper">
            <span class="badge badge-prod">
              🏷️ <span>สินค้า</span> <span class="font-black">{{ counts.products }}</span>
            </span>
            <div class="tooltip-popup">
              <div class="tooltip-title">🏷️ สินค้าที่รอ Sync</div>
              <div v-for="name in counts.productNames.slice(0, 5)" :key="name" class="tooltip-item">
                {{ name }}
              </div>
              <div v-if="counts.productNames.length > 5" class="tooltip-more">
                +{{ counts.productNames.length - 5 }} รายการ
              </div>
            </div>
          </div>

          <!-- Stock Logs Badge -->
          <div v-if="counts.stockLogs > 0" class="tooltip-wrapper">
            <span class="badge badge-stock">
              📊 <span>สต็อก</span> <span class="font-black">{{ counts.stockLogs }}</span>
            </span>
            <div class="tooltip-popup">
              <div class="tooltip-title">📊 ประวัติสต็อกที่รอ Sync</div>
              <div v-for="detail in counts.stockLogDetails.slice(0, 5)" :key="detail" class="tooltip-item">
                {{ detail }}
              </div>
              <div v-if="counts.stockLogDetails.length > 5" class="tooltip-more">
                +{{ counts.stockLogDetails.length - 5 }} รายการ
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Right: Sync Button -->
      <button
        @click="handleSync"
        :disabled="isLoading || isSyncing || !isOnline"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        :class="isOnline
          ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-sm'
          : 'bg-surface-700 text-surface-400'"
      >
        <span :class="{ 'animate-spin': isLoading || isSyncing }">
          {{ isLoading || isSyncing ? '⏳' : '🚀' }}
        </span>
        <span v-if="isLoading || isSyncing">กำลัง Sync...</span>
        <template v-else>
          <span>Sync ขึ้น Cloud</span>
          <!-- Countdown -->
          <span class="ml-1 px-1.5 py-0.5 rounded-md bg-black/15 text-[10px] font-mono tabular-nums" :class="countdownClass">
            {{ countdownLabel }}
          </span>
        </template>
      </button>
    </div>
  </Transition>
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
