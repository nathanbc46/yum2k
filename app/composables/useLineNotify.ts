// composables/useLineNotify.ts
// ส่งแจ้งเตือนไปที่ LINE OA ผ่าน server endpoint (fire-and-forget)
// ตรวจสอบ settings ใน IndexedDB ก่อนส่งทุกครั้ง

import type { Order } from '~/types'
import type { LowStockItem } from './useStockAlert'
import { getSetting } from '~/db'
import { DEFAULT_RECEIPT_SETTINGS } from './useSettings'

async function isEnabled(key: 'lineNewOrder' | 'lineLowStock' | 'lineDailySummary'): Promise<boolean> {
  if (!import.meta.client) return false
  const s = await getSetting('receipt_settings', DEFAULT_RECEIPT_SETTINGS)
  const merged = { ...DEFAULT_RECEIPT_SETTINGS, ...s }
  return merged[key] !== false
}

export function useLineNotify() {
  async function notifyNewOrder(order: Order): Promise<void> {
    if (!navigator.onLine) return
    if (!await isEnabled('lineNewOrder')) return
    await $fetch('/api/line-notify', {
      method: 'POST',
      body: { type: 'new_order', order },
    }).catch(() => {})
  }

  async function notifyLowStock(items: LowStockItem[]): Promise<void> {
    if (!navigator.onLine) return
    if (!items.length || !await isEnabled('lineLowStock')) return
    await $fetch('/api/line-notify', {
      method: 'POST',
      body: { type: 'low_stock', items },
    }).catch(() => {})
  }

  return { notifyNewOrder, notifyLowStock }
}
