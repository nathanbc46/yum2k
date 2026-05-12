// =============================================================================
// db/seedData.ts
// ข้อมูลตัวอย่างสำหรับ Development และ Testing
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import db from '~/db'
import type { User, Category, Product, ExpenseCategoryRecord } from '~/types'
import { hashSHA256 } from '~/utils/crypto'

/** Seed ข้อมูลเริ่มต้นสำหรับระบบ */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 กำลังตรวจสอบข้อมูลเริ่มต้น...')

  const [userCount] = await Promise.all([
    db.users.count()
  ])

  // ถ้ามีข้อมูล User แล้ว ไม่ต้องรัน Seed ซ้ำ
  if (userCount > 0) {
    console.log('✅ ข้อมูลเริ่มต้น (Admin) มีแล้ว — ข้ามการ Seed Users')
  } else {
    console.log('🏗️ เริ่มสร้างข้อมูลพนักงานเบื้องต้น...')
    const adminPin = await hashSHA256('1234')
    await db.users.add({
      uuid: '00000000-0000-4000-a000-000000000001',
      username: 'admin',
      passwordHash: 'HASHED_PASSWORD_HERE',
      displayName: 'ผู้ดูแลระบบ',
      role: 'admin',
      pin: adminPin,
      isActive: true,
      isDeleted: false,
      requiresPinChange: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User)
    console.log('✅ สร้าง Admin สำเร็จ')
  }

  // --- Seed Expense Categories ---
  await seedExpenseCategories()

    // --- Categories ---
  console.log('🎉 Seed ข้อมูลสมบูรณ์!')
}

/** 
 * สร้างหมวดหมู่รายจ่ายเริ่มต้นและย้ายข้อมูลเดิม (Migration) 
 */
export async function seedExpenseCategories(): Promise<void> {
  const count = await db.expenseCategories.count()
  
  if (count === 0) {
    console.log('🏗️ เริ่มสร้างหมวดหมู่รายจ่ายเริ่มต้น...')
    const defaults: Omit<ExpenseCategoryRecord, 'id'>[] = [
      { uuid: uuidv4(), name: 'วัตถุดิบ', color: '#ef4444', sortOrder: 1, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
      { uuid: uuidv4(), name: 'ค่าน้ำ/ไฟ/แก๊ส', color: '#3b82f6', sortOrder: 2, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
      { uuid: uuidv4(), name: 'ค่าจ้างพนักงาน', color: '#10b981', sortOrder: 3, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
      { uuid: uuidv4(), name: 'ค่าเช่าที่', color: '#f59e0b', sortOrder: 4, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
      { uuid: uuidv4(), name: 'วัสดุสิ้นเปลือง', color: '#8b5cf6', sortOrder: 5, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
      { uuid: uuidv4(), name: 'อื่นๆ', color: '#64748b', sortOrder: 6, isActive: true, isDeleted: false, createdAt: new Date(), updatedAt: new Date() },
    ]
    
    await db.expenseCategories.bulkAdd(defaults as any)
    console.log('✅ สร้างหมวดหมู่รายจ่ายเริ่มต้นสำเร็จ')
  }

  // --- Migration: อัปเดตรายจ่ายเดิมให้ชี้ไปที่ ID ใหม่ ---
  const legacyExpenses = await db.expenses.filter(e => !e.categoryId && !!e.category).toArray()
  if (legacyExpenses.length > 0) {
    console.log(`🔄 กำลังย้ายข้อมูลรายจ่ายเดิม (${legacyExpenses.length} รายการ)...`)
    const allCats = await db.expenseCategories.toArray()
    const nameToInfo = new Map(allCats.map(c => [c.name, { id: c.id!, uuid: c.uuid }]))
    
    // Map รหัสเดิม (English) -> ชื่อไทย
    const codeToName: Record<string, string> = {
      'ingredient': 'วัตถุดิบ',
      'utility': 'ค่าน้ำ/ไฟ/แก๊ส',
      'wage': 'ค่าจ้างพนักงาน',
      'rent': 'ค่าเช่าที่',
      'supplies': 'วัสดุสิ้นเปลือง',
      'other': 'อื่นๆ'
    }

    for (const exp of legacyExpenses) {
      const thaiName = codeToName[exp.category!] || 'อื่นๆ'
      const info = nameToInfo.get(thaiName)
      if (info) {
        await db.expenses.update(exp.id!, {
          categoryId: info.id,
          categoryUuid: info.uuid
        })
      }
    }
    console.log('✅ ย้ายข้อมูลรายจ่ายเดิมเรียบร้อย')
  }
}

