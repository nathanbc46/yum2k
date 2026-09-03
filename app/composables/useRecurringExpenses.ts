// =============================================================================
// composables/useRecurringExpenses.ts
// จัดการ Template รายจ่ายประจำ + สร้าง Expense อัตโนมัติ
//
// กลยุทธ์:
//   1. Template เก็บใน Dexie (recurringExpenses)
//   2. generatePendingExpenses() ถูกเรียกใน admin layout onMounted
//   3. Idempotency ผ่าน compound index [recurringExpenseUuid+expenseDate]
//   4. Backfill ย้อนหลังสูงสุด 7 วัน
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { RecurringExpense, Expense, ExpenseCategoryRecord } from '~/types'
import { useAuthStore } from '~/stores/auth'

// guard: ป้องกัน generate ซ้ำในเซสชันเดียว
let hasGeneratedToday = false

const BACKFILL_DAYS = 7

function toDateStr(d: Date): string {
  // ใช้ local date เพื่อป้องกัน timezone offset (UTC+7) ทำให้วันเพี้ยน
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function useRecurringExpenses() {
  const authStore = useAuthStore()

  // -----------------------------------------------------------------------
  // Generate: สร้าง Expense จาก Template ที่ค้างอยู่
  // -----------------------------------------------------------------------

  async function generatePendingExpenses(): Promise<number> {
    if (hasGeneratedToday) return 0
    hasGeneratedToday = true

    const today = toDateStr(new Date())
    const templates = await db.recurringExpenses
      .filter(t => t.isActive && !t.isDeleted)
      .toArray()

    if (templates.length === 0) return 0

    // โหลด category map ครั้งเดียว
    const allCats = await db.expenseCategories.toArray()
    const catUuidToId = new Map<string, number>(
      (allCats as ExpenseCategoryRecord[]).map(c => [c.uuid, c.id!])
    )

    const staffUuid = authStore.currentUser?.uuid ?? ''
    const staffId   = authStore.currentUser?.id ?? 0
    const staffName = authStore.currentUser?.displayName ?? 'ระบบ'

    let totalGenerated = 0

    for (const tpl of templates) {
      // หาวันที่ต้อง generate (ตั้งแต่หลัง lastGeneratedDate จนถึง today)
      const fromDateStr = tpl.lastGeneratedDate
        ? addDays(tpl.lastGeneratedDate, 1)
        : addDays(today, -(BACKFILL_DAYS - 1))

      const datesToGenerate: string[] = []
      let cur = fromDateStr
      while (cur <= today) {
        // ตรวจเงื่อนไขความถี่
        if (tpl.frequency === 'daily') {
          datesToGenerate.push(cur)
        } else if (tpl.frequency === 'monthly' && tpl.dayOfMonth) {
          const dayNum = parseInt(cur.slice(8, 10), 10)
          if (dayNum === tpl.dayOfMonth) {
            datesToGenerate.push(cur)
          }
        }
        cur = addDays(cur, 1)
      }

      if (datesToGenerate.length === 0) continue

      const categoryId = tpl.categoryUuid ? catUuidToId.get(tpl.categoryUuid) : undefined
      const now = new Date()

      for (const dateStr of datesToGenerate) {
        // ตรวจว่ามีอยู่แล้วหรือเปล่า (idempotency)
        const existing = await db.expenses
          .where('[recurringExpenseUuid+expenseDate]')
          .equals([tpl.uuid, dateStr])
          .first()
        if (existing) continue

        const expense: Omit<Expense, 'id'> = {
          uuid:                 uuidv4(),
          recurringExpenseUuid: tpl.uuid,
          amount:               tpl.amount,
          description:          tpl.description,
          category:             tpl.category as any,
          categoryId,
          categoryUuid:         tpl.categoryUuid,
          vendor:               tpl.vendor,
          unit:                 tpl.unit,
          quantity:             tpl.quantity,
          expenseDate:          dateStr,
          recordedBy:           staffName,
          staffId,
          staffUuid,
          isDeleted:            false,
          syncStatus:           'pending',
          createdAt:            now,
          updatedAt:            now,
        }

        await db.expenses.add(expense as Expense)
        totalGenerated++
      }

      // อัปเดต lastGeneratedDate ของ template
      await db.recurringExpenses.update(tpl.id!, {
        lastGeneratedDate: today,
        updatedAt: now,
      })
    }

    if (totalGenerated > 0) {
      console.log(`✅ สร้างรายจ่ายประจำอัตโนมัติ ${totalGenerated} รายการ`)
    }
    return totalGenerated
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  async function loadRecurringExpenses(): Promise<RecurringExpense[]> {
    return db.recurringExpenses.filter(t => !t.isDeleted).toArray()
  }

  async function addRecurringExpense(data: Omit<RecurringExpense, 'id' | 'uuid' | 'isDeleted' | 'syncStatus' | 'createdAt' | 'updatedAt'>): Promise<number | undefined> {
    const now = new Date()
    const record: Omit<RecurringExpense, 'id'> = {
      ...data,
      uuid:       uuidv4(),
      isDeleted:  false,
      syncStatus: 'pending',
      createdAt:  now,
      updatedAt:  now,
    }
    // รีเซ็ต guard เพื่อให้ generate ทันทีในรอบถัดไป
    hasGeneratedToday = false
    return db.recurringExpenses.add(record as RecurringExpense)
  }

  async function updateRecurringExpense(id: number, data: Partial<RecurringExpense>): Promise<void> {
    await db.recurringExpenses.update(id, { ...data, syncStatus: 'pending', updatedAt: new Date() })
    // รีเซ็ต guard เผื่อ template เปลี่ยนวันที่/ความถี่
    hasGeneratedToday = false
  }

  async function deleteRecurringExpense(id: number): Promise<void> {
    await db.recurringExpenses.update(id, { isDeleted: true, syncStatus: 'pending', updatedAt: new Date() })
  }

  async function toggleActiveRecurringExpense(id: number, isActive: boolean): Promise<void> {
    await db.recurringExpenses.update(id, { isActive, syncStatus: 'pending', updatedAt: new Date() })
    if (isActive) hasGeneratedToday = false
  }

  return {
    generatePendingExpenses,
    loadRecurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleActiveRecurringExpense,
  }
}
