// =============================================================================
// composables/useConfirm.ts
// Composable สำหรับเรียกใช้ Modal ยืนยันการทำงาน (Confirmation)
// =============================================================================

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

const isOpen = ref(false)
const options = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: 'ยืนยัน',
  cancelText: 'ยกเลิก',
  type: 'danger'
})

let resolvePromise: (value: boolean) => void

export function useConfirm() {
  const confirm = (opt: ConfirmOptions): Promise<boolean> => {
    options.value = {
      confirmText: 'ยืนยัน',
      cancelText: 'ยกเลิก',
      type: 'danger',
      ...opt
    }
    isOpen.value = true
    
    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  const handleConfirm = () => {
    isOpen.value = false
    if (resolvePromise) resolvePromise(true)
  }

  const handleCancel = () => {
    isOpen.value = false
    if (resolvePromise) resolvePromise(false)
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel
  }
}
