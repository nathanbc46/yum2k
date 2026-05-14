// =============================================================================
// composables/usePromotions.ts
// Composable สำหรับจัดการโปรโมชัน (Offline-first)
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { Promotion, PromotionType, PromotionConfig, BirthdayConfig } from '~/types'

export function usePromotions() {
  /**
   * โหลดโปรโมชันทั้งหมด
   */
  async function fetchAll(includeInactive = false): Promise<Promotion[]> {
    let query = db.promotions.where('isDeleted').equals(0)
    if (!includeInactive) {
      query = db.promotions.filter(p => !p.isDeleted && p.isActive)
    }
    else {
      query = db.promotions.filter(p => !p.isDeleted)
    }
    return query.sortBy('updatedAt').then(list => list.reverse())
  }

  /**
   * โหลดเฉพาะโปรโมชันที่ active (ใช้ใน POS startup)
   */
  async function getActivePromotions(): Promise<Promotion[]> {
    return db.promotions
      .filter(p => !p.isDeleted && p.isActive)
      .toArray()
  }

  /**
   * สร้างโปรโมชันใหม่
   */
  async function create(data: {
    name: string
    type: PromotionType
    isActive: boolean
    eligibleProductIds: number[]
    eligibleProductUuids: string[]
    config: PromotionConfig
  }): Promise<Promotion> {
    const now = new Date()
    const promotion: Omit<Promotion, 'id'> = {
      uuid: uuidv4(),
      name: data.name,
      type: data.type,
      isActive: data.isActive,
      eligibleProductIds: data.eligibleProductIds,
      eligibleProductUuids: data.eligibleProductUuids,
      config: data.config,
      syncStatus: 'pending',
      syncRetryCount: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    }
    const id = await db.promotions.add(promotion as Promotion)
    return { ...promotion, id } as Promotion
  }

  /**
   * แก้ไขโปรโมชัน
   */
  async function update(id: number, data: Partial<Omit<Promotion, 'id' | 'uuid' | 'createdAt'>>): Promise<void> {
    await db.promotions.update(id, {
      ...data,
      syncStatus: 'pending',
    })
  }

  /**
   * เปิด/ปิดโปรโมชัน
   */
  async function toggleActive(id: number): Promise<void> {
    const promo = await db.promotions.get(id)
    if (!promo) return
    await db.promotions.update(id, {
      isActive: !promo.isActive,
      syncStatus: 'pending',
    })
  }

  /**
   * ลบโปรโมชัน (Soft Delete)
   */
  async function softDelete(id: number): Promise<void> {
    await db.promotions.update(id, {
      isDeleted: true,
      isActive: false,
      syncStatus: 'pending',
    })
  }

  /**
   * เพิ่มจำนวนที่แจกแล้ว (สำหรับโปรวันเกิด)
   * เรียกหลัง checkout commit — eventual consistency ยอมรับได้สำหรับ soft cap
   */
  async function incrementTotalGiven(id: number, qty: number): Promise<void> {
    const promo = await db.promotions.get(id)
    if (!promo || promo.type !== 'birthday') return
    const config = promo.config as BirthdayConfig
    await db.promotions.update(id, {
      config: {
        ...config,
        totalGiven: (config.totalGiven || 0) + qty,
      },
      syncStatus: 'pending',
    })
  }

  return {
    fetchAll,
    getActivePromotions,
    create,
    update,
    toggleActive,
    softDelete,
    incrementTotalGiven,
  }
}
