// composables/useSessionTimeout.ts
// Auto-logout หลังจากไม่มีการใช้งาน (ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต)

const TIMEOUT_MS = 30 * 60 * 1000  // 30 นาที
const WARNING_MS = 2 * 60 * 1000   // เตือนล่วงหน้า 2 นาที

export function useSessionTimeout() {
  const authStore = useAuthStore()
  const toast = useToast()

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let warningId: ReturnType<typeof setTimeout> | null = null
  let warningToastId: string | null = null

  function clearTimers() {
    if (timeoutId) clearTimeout(timeoutId)
    if (warningId) clearTimeout(warningId)
    if (warningToastId) {
      toast.removeToast(warningToastId)
      warningToastId = null
    }
    timeoutId = null
    warningId = null
  }

  function resetTimer() {
    clearTimers()
    if (!authStore.isAuthenticated) return

    warningId = setTimeout(() => {
      warningToastId = toast.warning('⚠️ ระบบจะออกจากระบบอัตโนมัติใน 2 นาที เนื่องจากไม่มีการใช้งาน กรุณาแตะหน้าจอเพื่อยกเลิก', 0)
    }, TIMEOUT_MS - WARNING_MS)

    timeoutId = setTimeout(async () => {
      authStore.logout()
      await navigateTo('/login')
    }, TIMEOUT_MS)
  }

  function stop() {
    clearTimers()
  }

  return { resetTimer, stop }
}
