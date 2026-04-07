// =============================================================================
// composables/useUsers.ts
// Composable สำหรับการทำ CRUD พนักงาน (Admin/Staff)
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { User, UserRole } from '~/types'
import { hashSHA256, isAlreadyHashed } from '~/utils/crypto'

export function useUsers() {
  /**
   * ดึงข้อมูลผู้ใช้งานทั้งหมดที่ยังไม่ถูกลบ (isDeleted = false)
   */
  async function loadUsers(): Promise<User[]> {
    return await db.users.filter(u => u.isDeleted === false).toArray()
  }

  /**
   * สร้างผู้ใช้งานใหม่ (เข้ารหัส PIN โดยอัตโนมัติ)
   */
  async function createUser(data: Omit<User, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'passwordHash'>): Promise<number> {
    
    // ตรวจสอบ Username ซ้ำ
    const existing = await db.users.where('username').equals(data.username).first()
    if (existing && !existing.isDeleted) {
      throw new Error(`Username "${data.username}" ถูกใช้งานแล้ว`)
    }

    // Hash PIN ก่อนเก็บ (ถ้าไม่ได้ Hash ล่วงหน้ามาแล้ว)
    const hashedPin = data.pin && !isAlreadyHashed(data.pin)
      ? await hashSHA256(data.pin)
      : data.pin

    const now = new Date()
    const id = await db.users.add({
      ...data,
      pin: hashedPin,
      uuid: uuidv4(),
      passwordHash: '', // สำหรับ PIN-based system
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    } as User)
    
    return id as number
  }

  /**
   * อัปเดตข้อมูลผู้ใช้งานที่มีอยู่ (เข้ารหัส PIN โดยอัตโนมัติถ้ามีการเปลี่ยนแปลง)
   */
  async function updateUser(id: number, data: Partial<User>): Promise<void> {
    const user = await db.users.get(id)
    if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้')

    // ถ้ามีการแก้ username ต้องเช็คว่าทับกับคนอื่นไหม
    if (data.username && data.username !== user.username) {
      const existing = await db.users.where('username').equals(data.username).first()
      if (existing && !existing.isDeleted) {
        throw new Error(`Username "${data.username}" ถูกใช้งานแล้ว`)
      }
    }

    // Hash PIN ใหม่ถ้ามีการเปลี่ยนแปลง (และยังไม่ได้ Hash)
    if (data.pin && !isAlreadyHashed(data.pin)) {
      data.pin = await hashSHA256(data.pin)
    }

    await db.users.update(id, {
      ...data,
      updatedAt: new Date()
    })
  }

  /**
   * สลับสถานะเปิด/ปิดผู้ใช้งาน
   */
  async function toggleUserActive(id: number, isActive: boolean): Promise<void> {
    await db.users.update(id, {
      isActive,
      updatedAt: new Date()
    })
  }

  /**
   * Soft Delete ผู้ใช้งาน (ซ่อนเฉยๆ ไม่ลบจริง)
   */
  async function deleteUser(id: number): Promise<void> {
    const user = await db.users.get(id)
    if (user?.username === 'admin') {
      throw new Error('ไม่สามารถลบบัญชีระบบ (admin) พื้นฐานได้')
    }

    await db.users.update(id, {
      isDeleted: true,
      updatedAt: new Date()
    })
  }

  return {
    loadUsers,
    createUser,
    updateUser,
    toggleUserActive,
    deleteUser
  }
}
