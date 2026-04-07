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
        displayName: 'น้องแนน',
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
    let catYamId = 0
    let catDrinkId = 0

    if (catCount === 0) {
      catYamId = await db.categories.add({
        uuid: uuidv4(),
        name: 'ยำ',
        description: 'ยำสูตรต่างๆ',
        color: '#FF5733',
        sortOrder: 1,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Category) as number

      catDrinkId = await db.categories.add({
        uuid: uuidv4(),
        name: 'เครื่องดื่ม',
        description: 'น้ำดื่มและเครื่องดื่มต่างๆ',
        color: '#3498DB',
        sortOrder: 2,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Category) as number
      console.log('✅ สร้าง Categories สำเร็จ')
    } else {
        // หากมีหมวดหมู่แล้ว ให้ดึง ID มาใช้สำหรับสินค้า
        const yams = await db.categories.where('name').equals('ยำ').first()
        const drinks = await db.categories.where('name').equals('เครื่องดื่ม').first()
        catYamId = yams?.id || 0
        catDrinkId = drinks?.id || 0
    }

    // --- Products ---
    if (prodCount === 0 && catYamId && catDrinkId) {
      // ยำมะม่วง
      const yamMamuangId = await db.products.add({
        uuid: uuidv4(),
        categoryId: catYamId,
        sku: 'YAM-001',
        name: 'ยำมะม่วง',
        salePrice: 60,
        costPrice: 36,
        stockQuantity: 100,
        alertThreshold: 10,
        trackInventory: true,
        isActive: true,
        sortOrder: 1,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product)

      // ยำวุ้นเส้น
      const yamWoonsenId = await db.products.add({
        uuid: uuidv4(),
        categoryId: catYamId,
        sku: 'YAM-002',
        name: 'ยำวุ้นเส้น',
        salePrice: 60,
        costPrice: 36,
        stockQuantity: 80,
        alertThreshold: 10,
        trackInventory: true,
        isActive: true,
        sortOrder: 2,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product)

      // โปรยำมะม่วง 10 แถม 1
      await db.products.add({
        uuid: uuidv4(),
        categoryId: catYamId,
        sku: 'PROMO-001',
        name: 'โปร ยำมะม่วง 10 แถม 1',
        salePrice: 550,
        costPrice: 396,
        stockQuantity: 0,
        trackInventory: false,
        mappingType: 'promotion',
        inventoryMappings: [{ sourceProductId: yamMamuangId as number, quantity: 11 }],
        isActive: true,
        sortOrder: 10,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product)

      // น้ำเปล่า
      await db.products.add({
        uuid: uuidv4(),
        categoryId: catDrinkId,
        sku: 'DRK-001',
        name: 'น้ำเปล่า',
        salePrice: 10,
        costPrice: 6,
        stockQuantity: 200,
        alertThreshold: 20,
        trackInventory: true,
        isActive: true,
        sortOrder: 1,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product)
      console.log('✅ สร้าง Products สำเร็จ')
    }
  })

  console.log('🎉 Seed ข้อมูลสมบูรณ์!')
}
