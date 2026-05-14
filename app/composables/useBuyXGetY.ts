// =============================================================================
// composables/useBuyXGetY.ts
// Pure functions สำหรับคำนวณความก้าวหน้าโปรซื้อ X แถม Y
// =============================================================================

import type { CartItem } from '~/composables/useCart'
import type { Promotion, BuyXGetYConfig } from '~/types'

export interface BuyXGetYEligibility {
  promotion: Promotion
  eligibleCountInCart: number   // จำนวนสินค้าในกลุ่มโปรที่อยู่ในตะกร้า
  buyQty: number
  freeQty: number
  isTriggered: boolean          // ถึงเกณฑ์แล้ว (eligibleCountInCart >= buyQty)
  remaining: number             // เหลืออีกกี่ชิ้น
}

/**
 * ตรวจสอบความก้าวหน้าของโปรซื้อ X แถม Y สำหรับทุกโปรที่ active
 * เป็น pure function ไม่มี DB calls — รับ cartItems + promotions ที่โหลดไว้แล้ว
 */
export function checkBuyXGetYEligibility(
  cartItems: CartItem[],
  promotions: Promotion[],
): BuyXGetYEligibility[] {
  const buyXGetYPromos = promotions.filter(p => p.type === 'buyXGetY' && p.isActive && !p.isDeleted)

  return buyXGetYPromos.map((promo) => {
    const config = promo.config as BuyXGetYConfig
    // นับจำนวนสินค้าในโปร (ไม่นับ free items)
    const eligibleCountInCart = cartItems
      .filter(item => !item.isFreeItem && promo.eligibleProductIds.includes(item.product.id!))
      .reduce((sum, item) => sum + item.quantity, 0)

    // คำนวณรอบที่ครบแล้ว (สำหรับรอบปัจจุบัน)
    const completedRounds = Math.floor(eligibleCountInCart / config.buyQty)
    const freeItemsAlreadyInCart = cartItems
      .filter(item => item.isFreeItem && item.promotionId === promo.id)
      .reduce((sum, item) => sum + item.quantity, 0)
    const freeItemsNeeded = completedRounds * config.freeQty - freeItemsAlreadyInCart

    const remaining = config.buyQty - (eligibleCountInCart % config.buyQty)
    const isTriggered = freeItemsNeeded > 0

    return {
      promotion: promo,
      eligibleCountInCart,
      buyQty: config.buyQty,
      freeQty: config.freeQty,
      isTriggered,
      remaining: isTriggered ? 0 : remaining,
    }
  })
}

/**
 * สร้างข้อความแสดงความก้าวหน้า
 */
export function buildProgressText(eligibility: BuyXGetYEligibility): string {
  if (eligibility.isTriggered) {
    return `ครบแล้ว! กดเพื่อเลือกของแถม ${eligibility.freeQty} ชิ้น 🎁`
  }
  const pct = Math.round((eligibility.eligibleCountInCart % eligibility.buyQty) / eligibility.buyQty * 100)
  return `เหลืออีก ${eligibility.remaining} ชิ้น (${pct}%)`
}

export function useBuyXGetY() {
  return { checkBuyXGetYEligibility, buildProgressText }
}
