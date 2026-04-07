// =============================================================================
// db/seedData.ts
// ข้อมูลตัวอย่างสำหรับ Development และ Testing
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import db from '~/db'
import type { User, Category, Product } from '~/types'

/** Seed ข้อมูลเริ่มต้นสำหรับระบบ */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 กำลัง Seed ข้อมูลเริ่มต้น...')

  await db.transaction('rw', [db.users, db.categories, db.products], async () => {
    // --- Users ---
    const adminId = await db.users.add({
      uuid: uuidv4(),
      username: 'admin',
      passwordHash: 'HASHED_PASSWORD_HERE', // ใส่ Hash จริงก่อน Deploy
      displayName: 'ผู้ดูแลระบบ',
      role: 'admin',
      pin: '1234',
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User)

    await db.users.add({
      uuid: uuidv4(),
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

    console.log('✅ สร้าง Users แล้ว')

    // --- Categories ---
    const catYamId = await db.categories.add({
      uuid: uuidv4(),
      name: 'ยำ',
      description: 'ยำสูตรต่างๆ',
      color: '#FF5733',
      sortOrder: 1,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Category)

    const catDrinkId = await db.categories.add({
      uuid: uuidv4(),
      name: 'เครื่องดื่ม',
      description: 'น้ำดื่มและเครื่องดื่มต่างๆ',
      color: '#3498DB',
      sortOrder: 2,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Category)

    console.log('✅ สร้าง Categories แล้ว')

    // --- Products ---

    // สินค้าหลัก: ยำมะม่วง (สต็อกปกติ)
    const yamMamuangId = await db.products.add({
      uuid: uuidv4(),
      categoryId: catYamId as number,
      sku: 'YAM-001',
      name: 'ยำมะม่วง',
      salePrice: 60,
      costPrice: 36, // 60% ของ 60
      stockQuantity: 100,
      alertThreshold: 10,
      trackInventory: true,
      mappingType: undefined, // สินค้าปกติ
      inventoryMappings: undefined,
      isActive: true,
      sortOrder: 1,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product)

    // สินค้าหลัก: ยำวุ้นเส้น
    const yamWoonsenId = await db.products.add({
      uuid: uuidv4(),
      categoryId: catYamId as number,
      sku: 'YAM-002',
      name: 'ยำวุ้นเส้น',
      salePrice: 60,
      costPrice: 36,
      stockQuantity: 80,
      alertThreshold: 10,
      trackInventory: true,
      mappingType: undefined,
      inventoryMappings: undefined,
      isActive: true,
      sortOrder: 2,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product)

    /**
     * โปรโมชัน: "โปร ยำมะม่วง 10 แถม 1"
     * - ราคา: 550 บาท (แทนที่จะเป็น 600 บาท)
     * - เมื่อขาย 1 ชุด → ตัดสต็อก ยำมะม่วง จำนวน 11 ชิ้น
     */
    await db.products.add({
      uuid: uuidv4(),
      categoryId: catYamId as number,
      sku: 'PROMO-001',
      name: 'โปร ยำมะม่วง 10 แถม 1',
      salePrice: 550,
      costPrice: 396, // 60% ของ 660 (ต้นทุน 11 ชิ้น)
      stockQuantity: 0,       // ไม่ Track สต็อกของตัวเอง
      alertThreshold: 0,
      trackInventory: false,  // ให้ Track จากสินค้าหลักแทน
      mappingType: 'promotion',
      inventoryMappings: [
        {
          sourceProductId: yamMamuangId as number,
          quantity: 11, // ตัดสต็อก ยำมะม่วง 11 ชิ้น
        },
      ],
      isActive: true,
      sortOrder: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product)

    /**
     * Bundle: "เซ็ตยำคู่"
     * - ราคา: 100 บาท
     * - เมื่อขาย 1 เซ็ต → ตัดสต็อก ยำมะม่วง 1 + ยำวุ้นเส้น 1
     */
    await db.products.add({
      uuid: uuidv4(),
      categoryId: catYamId as number,
      sku: 'BUNDLE-001',
      name: 'เซ็ตยำคู่ (มะม่วง + วุ้นเส้น)',
      salePrice: 100,
      costPrice: 72,
      stockQuantity: 0,
      alertThreshold: 0,
      trackInventory: false,
      mappingType: 'bundle',
      inventoryMappings: [
        {
          sourceProductId: yamMamuangId as number,
          quantity: 1, // ตัดสต็อก ยำมะม่วง 1 ชิ้น
        },
        {
          sourceProductId: yamWoonsenId as number,
          quantity: 1, // ตัดสต็อก ยำวุ้นเส้น 1 ชิ้น
        },
      ],
      isActive: true,
      sortOrder: 20,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product)

    // เครื่องดื่ม: น้ำเปล่า
    await db.products.add({
      uuid: uuidv4(),
      categoryId: catDrinkId as number,
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

    console.log('✅ สร้าง Products แล้ว')
  })

  console.log('🎉 Seed ข้อมูลสำเร็จ!')
}
