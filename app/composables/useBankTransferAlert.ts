// =============================================================================
// composables/useBankTransferAlert.ts
// ฟัง Supabase Realtime ตาราง bank_transfers → เสียงแจ้งเตือน + visual banner
// =============================================================================

import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================================
// Shared state สำหรับ PosBankAlert component
// ============================================================
export const bankAlertState = reactive({
  visible: false,
  amount: 0,
  bankName: null as string | null,
})

let dismissTimer: ReturnType<typeof setTimeout> | null = null

function showAlert(amount: number, bankName: string | null) {
  if (dismissTimer) clearTimeout(dismissTimer)
  bankAlertState.amount = amount
  bankAlertState.bankName = bankName
  bankAlertState.visible = true
  dismissTimer = setTimeout(() => { bankAlertState.visible = false }, 8000)
}

// ============================================================
// Realtime channel (singleton — สร้างครั้งเดียวต่อ session)
// ============================================================
let channel: RealtimeChannel | null = null
const isListening = ref(false)

export function useBankTransferAlert() {
  const supabase = import.meta.client ? useSupabaseClient<any>() : null
  const toast = useToast()

  // TTS: พูดข้อความแจ้งเตือนเป็นภาษาไทย
  function speak(text: string) {
    if (!import.meta.client || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'th-TH'
    utterance.rate = 0.85
    utterance.pitch = 1.05
    utterance.volume = 1.0
    window.speechSynthesis.speak(utterance)
  }

  function formatAmountText(amount: number): string {
    return amount % 1 === 0
      ? amount.toLocaleString('th-TH')
      : amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Supabase Realtime — ฟัง INSERT ใหม่บนตาราง bank_transfers
  function startListening() {
    if (!import.meta.client || !supabase || isListening.value) return

    channel = supabase
      .channel('bank-transfers-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bank_transfers' },
        (payload: any) => {
          const { amount, bank_name } = payload.new as { amount: number; bank_name?: string }
          const bankName: string | null = bank_name ?? null
          const formatted = formatAmountText(amount)
          const bankLabel = bankName ? ` ${bankName}` : ''

          // แสดง banner
          showAlert(amount, bankName)

          // พูดแจ้งเตือน
          speak(`เงินเข้า ${formatted} บาท`)

          // Toast สำรองที่ top-right
          toast.success(`💸 เงินเข้า${bankLabel} ฿${formatted}`, 8000)
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isListening.value = true
        }
      })
  }

  function stopListening() {
    if (!supabase || !channel) return
    supabase.removeChannel(channel)
    channel = null
    isListening.value = false
  }

  return { startListening, stopListening, isListening, speak }
}
