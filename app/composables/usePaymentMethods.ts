import type { PaymentMethod } from '~/types'

export interface PaymentMethodConfig {
  value: PaymentMethod
  label: string
  icon: string
  /** CSS classes สำหรับ badge แสดงประวัติออร์เดอร์ */
  badgeClass: string
  /** CSS classes สำหรับปุ่มที่ถูกเลือก (bg + border + shadow) */
  activeClass: string
  /** CSS class สีตัวอักษรเมื่อปุ่มถูกเลือก */
  activeTextClass: string
  /** true = ต้องกรอกจำนวนเงิน (แสดง cash calculator) */
  requiresAmount: boolean
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    value: 'cash',
    label: 'เงินสด',
    icon: '💵',
    badgeClass: 'bg-green-500/10 text-green-400 border-green-500/20',
    activeClass: 'bg-primary-600/10 border-primary-500 shadow-lg shadow-primary-900/20',
    activeTextClass: 'text-primary-400',
    requiresAmount: true,
  },
  {
    value: 'promptpay',
    label: 'พร้อมเพย์',
    icon: '📱',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    activeClass: 'bg-secondary-500/10 border-secondary-500 shadow-lg shadow-secondary-900/10',
    activeTextClass: 'text-secondary-400',
    requiresAmount: false,
  },
  {
    value: 'thaithawthai',
    label: 'ไทยช่วยไทย',
    icon: '🇹🇭',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    activeClass: 'bg-red-600/10 border-red-500 shadow-lg shadow-red-900/20',
    activeTextClass: 'text-red-400',
    requiresAmount: false,
  },
  {
    value: 'card',
    label: 'บัตรเครดิต',
    icon: '💳',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    activeClass: 'bg-purple-600/10 border-purple-500 shadow-lg shadow-purple-900/20',
    activeTextClass: 'text-purple-400',
    requiresAmount: false,
  },
  {
    value: 'unpaid',
    label: 'ยังไม่ชำระ',
    icon: '⏳',
    badgeClass: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    activeClass: 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/20',
    activeTextClass: 'text-blue-400',
    requiresAmount: false,
  },
  {
    value: 'other',
    label: 'อื่นๆ',
    icon: '💰',
    badgeClass: 'bg-surface-800 text-surface-600 border-surface-700',
    activeClass: 'bg-surface-700 border-surface-600',
    activeTextClass: 'text-surface-400',
    requiresAmount: false,
  },
]

/** ปุ่มในหน้า POS (รวม unpaid สำหรับสั่งก่อนจ่ายทีหลัง) */
export const POS_PAYMENT_METHODS = PAYMENT_METHODS.filter(p =>
  ['cash', 'promptpay', 'thaithawthai', 'unpaid'].includes(p.value)
)

/** ปุ่มใน Modal ชำระเงินค้าง (orders.vue) — ไม่มี unpaid */
export const PAY_MODAL_METHODS = PAYMENT_METHODS.filter(p =>
  ['cash', 'promptpay', 'thaithawthai'].includes(p.value)
)

export function getPaymentConfig(method: string): PaymentMethodConfig {
  return PAYMENT_METHODS.find(p => p.value === method) ?? PAYMENT_METHODS.find(p => p.value === 'other')!
}

export function getPaymentLabel(method: string): string {
  return getPaymentConfig(method).label
}

export function getPaymentIcon(method: string): string {
  return getPaymentConfig(method).icon
}

export function getPaymentBadgeClass(method: string): string {
  return getPaymentConfig(method).badgeClass
}

/** คืนค่า "icon label" เช่น "💵 เงินสด" */
export function getPaymentDisplay(method: string): string {
  const c = getPaymentConfig(method)
  return `${c.icon} ${c.label}`
}
