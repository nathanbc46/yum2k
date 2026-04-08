// =============================================================================
// db/seedData.ts
// ข้อมูลตัวอย่างสำหรับ Development และ Testing
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import db from '~/db'
import type { User, Category, Product } from '~/types'

/** Seed ข้อมูลเริ่มต้นสำหรับระบบ */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 กำลังตรวจสอบข้อมูลเริ่มต้น...')

  const [userCount, catCount, prodCount] = await Promise.all([
    db.users.count(),
    db.categories.count(),
    db.products.count()
  ])

  // ถ้ามีข้อมูลครบแล้ว ไม่ต้องรัน Seed ซ้ำ
  if (userCount > 0 && catCount > 0 && prodCount > 0) {
    console.log('✅ ข้อมูลเริ่มต้นมีครบแล้ว ข้ามการ Seed')
    return
  }

  console.log('🏗️ เริ่มสร้างข้อมูลเบื้องต้น...')

  await db.transaction('rw', [db.users, db.categories, db.products], async () => {
    // --- Users ---
    if (userCount === 0) {
      const adminId = await db.users.add({
        uuid: '00000000-0000-4000-a000-000000000001', // Static UUID for admin
        username: 'admin',
        passwordHash: 'HASHED_PASSWORD_HERE',
        displayName: 'ผู้ดูแลระบบ',
        role: 'admin',
        pin: '1234',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User)

      await db.users.add({
        uuid: '00000000-0000-4000-a000-000000000002', // Static UUID for staff01
        username: 'staff01',
        passwordHash: 'HASHED_PASSWORD_HERE',
        displayName: 'น้องกุ๋งกิ๋ง',
        role: 'staff',
        pin: '5678',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User)
      console.log('✅ สร้าง Users สำเร็จ (Static UUID)')
    }

    // --- Categories ---
    if (catCount === 0) {
      await db.categories.add({
        uuid: '00000000-0000-4000-b000-000000000001', // Static UUID for ยำ
        name: 'ยำ',
        description: 'ยำสูตรต่างๆ',
        color: '#FF5733',
        sortOrder: 1,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Category)
      console.log('✅ สร้าง Categories สำเร็จ: ยำ (Static UUID)')
    }

    // --- Products (ลบออกตามที่ USER ร้องขอ) ---
    // ไม่มีการสร้างสินค้าเริ่มต้น
  })

  console.log('🎉 Seed ข้อมูลสมบูรณ์!')
}
