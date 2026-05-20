import { ref } from 'vue'

// Singleton state — shared ระหว่างทุก component ที่ใช้ composable นี้
const needRefresh = ref(false)
const isChecking = ref(false)
const checkResult = ref<'up-to-date' | null>(null)

let _swRegistration: ServiceWorkerRegistration | undefined
let _updateServiceWorker: ((reload?: boolean) => Promise<void>) | undefined

/** เรียกจาก PwaUpdatePrompt.vue เพื่อ register SW reference */
export function _setPwaRegistration(
  reg: ServiceWorkerRegistration | undefined,
  updateFn: (reload?: boolean) => Promise<void>
) {
  _swRegistration = reg
  _updateServiceWorker = updateFn
}

/** เรียกจาก PwaUpdatePrompt.vue เมื่อ SW ใหม่พร้อม */
export function _setPwaRefresh(val: boolean) {
  needRefresh.value = val
}

export function usePwaUpdate() {
  async function checkForUpdate() {
    if (!_swRegistration || isChecking.value) return
    isChecking.value = true
    checkResult.value = null
    try {
      await _swRegistration.update()
      // รอสักครู่ให้ SW ตอบกลับก่อนสรุปผล
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (!needRefresh.value) {
        checkResult.value = 'up-to-date'
        setTimeout(() => { checkResult.value = null }, 3000)
      }
    } catch {
      // ไม่มี network หรือ SW error — ไม่แสดง error
    } finally {
      isChecking.value = false
    }
  }

  async function updateApp() {
    await _updateServiceWorker?.(true)
  }

  return { needRefresh, isChecking, checkResult, checkForUpdate, updateApp }
}
