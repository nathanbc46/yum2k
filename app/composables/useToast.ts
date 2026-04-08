/**
 * useToast.ts
 * ระบบจัดการ Toast Notification (Global State)
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
}

// Global State (ใช้ภายนอก Composable ได้)
const toasts = ref<ToastItem[]>([])

export function useToast() {
  /**
   * เพิ่มรายการ Toast ใหม่
   */
  function addToast(message: string, type: ToastType = 'info', duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { id, message, type, duration }
    
    // เพิ่มเข้าไปที่จุดเริ่มต้น (แสดงด้านบน)
    toasts.value.push(newToast)

    // ลบอัตโนมัติเมื่อครบกำหนด
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }

  /**
   * ลบรายการ Toast ตาม ID
   */
  function removeToast(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  // Helper functions
  const success = (msg: string, dur?: number) => addToast(msg, 'success', dur)
  const error   = (msg: string, dur?: number) => addToast(msg, 'error', dur)
  const warning = (msg: string, dur?: number) => addToast(msg, 'warning', dur)
  const info    = (msg: string, dur?: number) => addToast(msg, 'info', dur)

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}
