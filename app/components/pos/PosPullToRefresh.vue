<template>
  <!-- Visual Indicator: โผล่จากด้านบนตาม gesture -->
  <Transition name="ptr-fade">
    <div
      v-if="isPulling || isRefreshing"
      class="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
      :style="indicatorStyle"
    >
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-200"
        :class="isRefreshing
          ? 'bg-surface-800 text-surface-300'
          : isReadyToRelease
            ? 'bg-green-500/90 text-white'
            : 'bg-surface-800/90 text-surface-400'"
      >
        <!-- Spinner ขณะ refreshing -->
        <span
          v-if="isRefreshing"
          class="w-4 h-4 border-2 border-surface-500 border-t-primary-400 rounded-full animate-spin"
        />
        <!-- Arrow icon ขณะดึง -->
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 transition-transform duration-200"
          :style="{ transform: isReadyToRelease ? 'rotate(180deg)' : 'rotate(0deg)' }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
        <span>
          {{ isRefreshing ? 'กำลังโหลดข้อมูล...' : isReadyToRelease ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช' }}
        </span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { usePosStore } from '~/stores/pos'
import { useSync } from '~/composables/useSync'
import { useToast } from '~/composables/useToast'

const THRESHOLD = 64   // px ที่ต้องดึงก่อน trigger
const MAX_PULL = 100   // px สูงสุดที่แสดง indicator

const posStore = usePosStore()
const { syncPendingOrders } = useSync()
const toast = useToast()

const pullDistance = ref(0)
const isPulling = ref(false)
const isRefreshing = ref(false)

const isReadyToRelease = computed(() => pullDistance.value >= THRESHOLD)

const indicatorStyle = computed(() => ({
  transform: `translateY(${Math.min(pullDistance.value, MAX_PULL) - 50}px)`,
  transition: isPulling.value ? 'none' : 'transform 0.3s ease',
}))

// ---- Touch Tracking ----
let startY = 0
let startScrollTop = 0
let trackingPull = false

function findScrollableParent(el: HTMLElement | null): HTMLElement | null {
  if (!el || el === document.body) return null
  const { overflowY } = window.getComputedStyle(el)
  if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el
  return findScrollableParent(el.parentElement)
}

function onTouchStart(e: TouchEvent) {
  if (isRefreshing.value) return
  const touch = e.touches[0]
  if (!touch) return
  startY = touch.clientY
  const scrollable = findScrollableParent(e.target as HTMLElement)
  startScrollTop = scrollable?.scrollTop ?? 0
  trackingPull = !scrollable || startScrollTop === 0
}

function onTouchMove(e: TouchEvent) {
  if (isRefreshing.value || !trackingPull) return
  const touch = e.touches[0]
  if (!touch) return

  const deltaY = touch.clientY - startY
  if (deltaY <= 0) {
    // ดึงขึ้น หรือ scroll ปกติ — ไม่ block
    if (isPulling.value) {
      isPulling.value = false
      pullDistance.value = 0
    }
    return
  }

  // ตรวจอีกครั้งว่า scrollable parent ยังอยู่ที่บนสุด
  const scrollable = findScrollableParent(e.target as HTMLElement)
  if (scrollable && scrollable.scrollTop > 0) {
    trackingPull = false
    return
  }

  // Block native PTR / overscroll
  e.preventDefault()

  // Damping effect: ยิ่งดึงมาก ยิ่งหนัก
  const damped = Math.min(deltaY * 0.5, MAX_PULL)
  pullDistance.value = damped
  isPulling.value = true
}

function onTouchEnd() {
  if (!isPulling.value) return

  if (isReadyToRelease.value && !isRefreshing.value) {
    triggerRefresh()
  } else {
    pullDistance.value = 0
    isPulling.value = false
  }
  trackingPull = false
}

// ---- Refresh Logic ----
async function triggerRefresh() {
  isPulling.value = false
  pullDistance.value = 0
  isRefreshing.value = true

  try {
    await syncPendingOrders()
    await posStore.loadData(true)
    toast.success('รีเฟรชข้อมูลเรียบร้อย')
  } catch {
    toast.error('รีเฟรชไม่สำเร็จ กรุณาลองใหม่')
  } finally {
    isRefreshing.value = false
  }
}

// ---- Lifecycle ----
onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
})
</script>

<style scoped>
.ptr-fade-enter-active,
.ptr-fade-leave-active {
  transition: opacity 0.2s ease;
}
.ptr-fade-enter-from,
.ptr-fade-leave-to {
  opacity: 0;
}
</style>
