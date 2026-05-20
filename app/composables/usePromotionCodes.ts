// =============================================================================
// composables/usePromotionCodes.ts
// ระบบโค้ดลับโปรโมชัน — สร้าง, ตรวจสอบ, และใช้โค้ด
// รูปแบบโค้ด: YAM-XXX (prefix คงที่ + 3 ตัวอักษร/ตัวเลข ไม่มีตัวสับสน)
// =============================================================================

import { db } from '~/db'
import type { PromotionBatch, PromotionCode, Product } from '~/types'

const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_PREFIX = 'YAM-'
const CODE_SUFFIX_LENGTH = 3

/** ผลลัพธ์การตรวจสอบโค้ด */
export interface CodeValidationResult {
  valid: boolean
  code?: PromotionCode
  batch?: PromotionBatch
  products?: Product[]       // สินค้าที่แลกได้ (อาจมากกว่า 1 รายการ)
  errorMessage?: string
}

export function usePromotionCodes() {
  // -----------------------------------------------------------------------
  // Generate: สร้างโค้ดสุ่มที่ไม่ซ้ำกัน
  // -----------------------------------------------------------------------

  function generateRawCode(existingCodes: Set<string>): string {
    let code: string
    let attempts = 0
    do {
      const suffix = Array.from({ length: CODE_SUFFIX_LENGTH }, () =>
        SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
      ).join('')
      code = CODE_PREFIX + suffix
      attempts++
      if (attempts > 10000) throw new Error('ไม่สามารถสร้างโค้ดใหม่ได้ (โค้ดเต็มแล้ว)')
    } while (existingCodes.has(code))
    return code
  }

  async function generateBatch(
    name: string,
    productUuids: string[],
    productNames: string[],
    count: number,
    expiresAt?: Date
  ): Promise<PromotionBatch> {
    if (count < 1 || count > 500) throw new Error('จำนวนโค้ดต้องอยู่ระหว่าง 1–500')
    if (!productUuids.length) throw new Error('ต้องเลือกสินค้าอย่างน้อย 1 รายการ')

    const existingAll = await db.promotionCodes.toArray()
    const existingCodes = new Set(existingAll.map(c => c.code))

    const batchUuid = crypto.randomUUID()
    const now = new Date()

    const batch: Omit<PromotionBatch, 'id'> = {
      uuid: batchUuid,
      name,
      productUuids: [...productUuids],  // spread ออกจาก Vue reactive proxy
      productNames: [...productNames],
      quantity: 1,
      totalCodes: count,
      usedCodes: 0,
      expiresAt,
      isDeleted: false,
      syncStatus: 'pending',
      syncRetryCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    const batchId = await db.promotionBatches.add(batch as PromotionBatch)

    const codes: Omit<PromotionCode, 'id'>[] = []
    for (let i = 0; i < count; i++) {
      const code = generateRawCode(existingCodes)
      existingCodes.add(code)
      codes.push({
        uuid: crypto.randomUUID(),
        batchUuid,
        code,
        isUsed: false,
        isDeleted: false,
        syncStatus: 'pending',
        syncRetryCount: 0,
        createdAt: now,
        updatedAt: now,
      })
    }

    await db.promotionCodes.bulkAdd(codes as PromotionCode[])

    return { ...batch, id: batchId as number }
  }

  // -----------------------------------------------------------------------
  // Validate: ตรวจสอบโค้ดก่อนแลก
  // -----------------------------------------------------------------------

  async function validateCode(rawCode: string): Promise<CodeValidationResult> {
    const normalised = rawCode.trim().toUpperCase()

    const codeRecord = await db.promotionCodes.where('code').equals(normalised).first()
    if (!codeRecord || codeRecord.isDeleted) {
      return { valid: false, errorMessage: 'ไม่พบโค้ดนี้ในระบบ' }
    }
    if (codeRecord.isUsed) {
      return { valid: false, errorMessage: 'โค้ดนี้ถูกใช้แล้ว' }
    }

    const batch = await db.promotionBatches.where('uuid').equals(codeRecord.batchUuid).first()
    if (!batch || batch.isDeleted) {
      return { valid: false, errorMessage: 'ชุดโค้ดนี้ถูกลบแล้ว' }
    }

    if (batch.expiresAt && new Date() > new Date(batch.expiresAt)) {
      return { valid: false, errorMessage: 'โค้ดหมดอายุแล้ว' }
    }

    const products = await db.products
      .where('uuid').anyOf(batch.productUuids)
      .filter(p => p.isActive && !p.isDeleted)
      .toArray()

    if (!products.length) {
      return { valid: false, errorMessage: 'สินค้าที่แลกได้ไม่พร้อมใช้งาน' }
    }

    return { valid: true, code: codeRecord, batch, products }
  }

  // -----------------------------------------------------------------------
  // Redeem: ทำเครื่องหมายว่าใช้โค้ดแล้ว (เรียกหลัง order complete)
  // -----------------------------------------------------------------------

  async function redeemCode(code: string, orderUuid: string): Promise<void> {
    const codeRecord = await db.promotionCodes.where('code').equals(code).first()
    if (!codeRecord?.id) return

    const now = new Date()
    await db.promotionCodes.update(codeRecord.id, {
      isUsed: true,
      usedAt: now,
      usedOrderUuid: orderUuid,
      syncStatus: 'pending',
      updatedAt: now,
    })

    const batch = await db.promotionBatches.where('uuid').equals(codeRecord.batchUuid).first()
    if (batch?.id) {
      await db.promotionBatches.update(batch.id, {
        usedCodes: (batch.usedCodes || 0) + 1,
        syncStatus: 'pending',
        updatedAt: now,
      })
    }
  }

  // -----------------------------------------------------------------------
  // Load: ดึงข้อมูล batches / codes
  // -----------------------------------------------------------------------

  async function loadBatches(): Promise<PromotionBatch[]> {
    return db.promotionBatches
      .filter(b => !b.isDeleted)
      .reverse()
      .sortBy('createdAt')
  }

  async function loadCodes(batchUuid: string): Promise<PromotionCode[]> {
    return db.promotionCodes
      .where('batchUuid').equals(batchUuid)
      .filter(c => !c.isDeleted)
      .sortBy('code')
  }

  async function deleteBatch(batchUuid: string): Promise<void> {
    const now = new Date()
    const batch = await db.promotionBatches.where('uuid').equals(batchUuid).first()
    if (batch?.id) {
      await db.promotionBatches.update(batch.id, { isDeleted: true, syncStatus: 'pending', updatedAt: now })
    }
    const codes = await db.promotionCodes.where('batchUuid').equals(batchUuid).toArray()
    for (const c of codes) {
      if (c.id) await db.promotionCodes.update(c.id, { isDeleted: true, syncStatus: 'pending', updatedAt: now })
    }
  }

  return {
    generateBatch,
    validateCode,
    redeemCode,
    loadBatches,
    loadCodes,
    deleteBatch,
    CODE_PREFIX,
  }
}
