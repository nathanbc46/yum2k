// composables/useLineDailySummary.ts
// ตรวจสอบเวลาทุก 1 นาที และส่งสรุปยอดขายรายวันไป LINE ตามเวลาที่ตั้งไว้

import { getSetting } from '~/db'
import { DEFAULT_RECEIPT_SETTINGS } from './useSettings'

let intervalId: ReturnType<typeof setInterval> | null = null
let lastSentDate = ''

async function checkAndSend() {
  const s = await getSetting('receipt_settings', DEFAULT_RECEIPT_SETTINGS)
  const settings = { ...DEFAULT_RECEIPT_SETTINGS, ...s }
  if (!settings.lineDailySummary) return

  const now = new Date()
  const ICT_MS = 7 * 60 * 60 * 1000
  const ictNow = new Date(now.getTime() + ICT_MS)
  const hour = ictNow.getUTCHours()
  const minute = ictNow.getUTCMinutes()
  const dateStr = ictNow.toISOString().slice(0, 10)

  const targetHour = settings.lineDailySummaryHour ?? 22
  if (hour !== targetHour) return
  if (minute > 2) return             // อนุญาตช่วง HH:00–HH:02 เผื่อ interval miss
  if (dateStr === lastSentDate) return // ส่งวันละครั้ง

  lastSentDate = dateStr
  await $fetch('/api/line-daily-summary').catch(() => {})
}

export function useLineDailySummary() {
  function start() {
    if (!import.meta.client || intervalId) return
    intervalId = setInterval(checkAndSend, 60_000)
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return { start, stop }
}
