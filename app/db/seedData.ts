// =============================================================================
// db/seedData.ts
// ข้อมูลตัวอย่างสำหรับ Development และ Testing
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import db from '~/db'
import type { User, Category, Product } from '~/types'
import { hashSHA256 } from '~/utils/crypto'

/** Seed ข้อมูลเริ่มต้นสำหรับระบบ */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 กำลังตรวจสอบข้อมูลเริ่มต้น...')

  const [userCount] = await Promise.all([
    db.users.count()
  ])

  // ถ้ามีข้อมูล User แล้ว ไม่ต้องรัน Seed ซ้ำ
  if (userCount > 0) {
    console.log('✅ ข้อมูลเริ่มต้น (Admin) มีแล้ว ข้ามการ Seed')
    return
  }

  console.log('🏗️ เริ่มสร้างข้อมูลเบื้องต้น...')

  // เข้ารหัส PIN เริ่มต้น
  const adminPin = await hashSHA256('1234')

  await db.transaction('rw', [db.users, db.categories, db.products], async () => {
    // --- Users ---
    if (userCount === 0) {
      await db.users.add({
        uuid: '00000000-0000-4000-a000-000000000001', // Static UUID for admin
        username: 'admin',
        passwordHash: 'HASHED_PASSWORD_HERE',
        displayName: 'ผู้ดูแลระบบ',
        role: 'admin',
        pin: adminPin,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User)
      console.log('✅ สร้าง Admin สำเร็จ (Static UUID)')
    }

    // --- Categories ---
    // ไม่มีการสร้างหมวดหมู่เริ่มต้นตามที่ USER ร้องขอ

    // --- Products ---
    // ไม่มีการสร้างสินค้าเริ่มต้น
  })

  console.log('🎉 Seed ข้อมูลสมบูรณ์!')
}
