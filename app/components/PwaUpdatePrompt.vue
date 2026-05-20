<template>
  <Transition name="pwa-slide-up">
    <div
      v-if="needRefresh"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-3rem)] max-w-sm"
    >
      <div class="flex items-center gap-3 px-4 py-3.5 bg-surface-900 border border-primary-500/40 rounded-2xl shadow-2xl shadow-primary-500/10 backdrop-blur-md">
        <div class="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center text-lg">
          🚀
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-surface-50 leading-tight">มีเวอร์ชันใหม่พร้อมแล้ว</p>
          <p class="text-[11px] text-surface-400 mt-0.5">กดอัพเดทเพื่อใช้งานเวอร์ชันล่าสุด</p>
        </div>
        <button
          @click="updateApp"
          class="flex-shrink-0 px-3.5 py-2 bg-primary-500 hover:bg-primary-400 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary-500/30"
        >
          อัพเดท
        </button>
        <button
          @click="dismiss"
          class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-all"
          title="ปิด (อัพเดทครั้งหน้าที่เปิดแอป)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { usePwaUpdate, _setPwaRegistration, _setPwaRefresh } from '~/composables/usePwaUpdate'

const { needRefresh: swNeedRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, reg) {
    _setPwaRegistration(reg, updateServiceWorker)
  }
})

// sync needRefresh จาก SW ไปยัง singleton state
watch(swNeedRefresh, val => _setPwaRefresh(val), { immediate: true })

const { needRefresh, updateApp } = usePwaUpdate()

function dismiss() {
  _setPwaRefresh(false)
}
</script>

<style scoped>
.pwa-slide-up-enter-active,
.pwa-slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.pwa-slide-up-enter-from,
.pwa-slide-up-leave-to {
  transform: translateX(-50%) translateY(120%);
  opacity: 0;
}
.pwa-slide-up-enter-to,
.pwa-slide-up-leave-from {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
</style>
