<template>
  <slot v-if="!hasError" />
  <div v-else class="h-full flex flex-col items-center justify-center bg-surface-950 text-surface-50 p-8 gap-6">
    <div class="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-4xl border border-red-500/20">
      ⚠️
    </div>
    <div class="text-center">
      <h2 class="text-xl font-black text-surface-50 mb-2">เกิดข้อผิดพลาดที่ไม่คาดคิด</h2>
      <p class="text-surface-400 text-sm max-w-sm leading-relaxed">{{ errorMessage }}</p>
    </div>
    <button
      @click="retry"
      class="px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-all active:scale-95"
    >
      ลองใหม่อีกครั้ง
    </button>
  </div>
</template>

<script setup lang="ts">
const hasError = ref(false)
const errorMessage = ref('กรุณารีเฟรชหน้าจอ หากปัญหายังคงอยู่')

function isChunkLoadError(err: Error): boolean {
  // เกิดเมื่อ SW หรือ dev server reload แล้ว browser ดึง JS chunk เก่าไม่ได้
  return err instanceof TypeError && (
    err.message.includes('Failed to fetch dynamically imported module') ||
    err.message.includes('Importing a module script failed') ||
    err.message.includes('error loading dynamically imported module')
  )
}

onErrorCaptured((err: Error) => {
  console.error('🚨 AppErrorBoundary caught:', err)

  if (isChunkLoadError(err)) {
    // Chunk load error = app ออกเวอร์ชันใหม่ หรือ dev server restart → reload แก้ได้เสมอ
    console.warn('🔄 Chunk load error detected — reloading page...')
    window.location.reload()
    return false
  }

  hasError.value = true
  errorMessage.value = err?.message || 'กรุณารีเฟรชหน้าจอ'
  return false
})

function retry() {
  hasError.value = false
  errorMessage.value = 'กรุณารีเฟรชหน้าจอ หากปัญหายังคงอยู่'
}
</script>
