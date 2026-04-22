// =============================================================================
// composables/useUsers.ts
// Composable สำหรับการทำ CRUD พนักงาน (Admin/Staff)
// =============================================================================

import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { User, UserRole } from '~/types'
import { hashSHA256, isAlreadyHashed } from '~/utils/crypto'
import { useSync } from './useSync'

export function useUsers() {
  /**
   * ดึงข้อมูลผู้ใช้งานทั้งหมดที่ยังไม่ถูกลบ (isDeleted = false)
   */
  async function loadUsers(): Promise<User[]> {
    return await db.users.filter(u => u.isDeleted === false).toArray()
  }

  // --- Helper: Sync ผู้ใช้ 1 คนขึ้น Cloud ทันที ---
  async function _syncUserToCloud(user: User): Promise<void> {
    const supabase = useSupabaseClient<any>()
    const payload = {
      uuid: user.uuid,
      username: user.username,
      display_name: user.displayName,
      role: user.role,
      pin: user.pin,
      is_active: user.isActive,
      is_deleted: user.isDeleted,
      updated_at: user.updatedAt.toISOString(),
    }
    const { error } = await supabase.from('pos_users').upsert(payload, { onConflict: 'uuid' })
    if (error) {
      console.error('Master Data Sync Error:', error)
      throw new Error(`อัปเดตข้อมูลขึ้น Cloud ไม่สำเร็จ: ${error.message}`)
    }
  }

  /**
   * สร้างผู้ใช้งานใหม่ (เข้ารหัส PIN โดยอัตโนมัติ)
   */
  async function createUser(data: Omit<User, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'passwordHash'>): Promise<number> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถเพิ่มพนักงานได้ขณะออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ต')
    }

    const supabase = useSupabaseClient<any>()
    const { count } = await supabase.from('pos_users').select('*', { count: 'exact', head: true }).eq('username', data.username).eq('is_deleted', false)
    if (count && count > 0) throw new Error(`Username "${data.username}" ถูกใช้งานแล้วในระบบ`)

    const hashedPin = data.pin && !isAlreadyHashed(data.pin)
      ? await hashSHA256(data.pin)
      : data.pin

    const now = new Date()
    const newUser = {
      ...data,
      pin: hashedPin,
      uuid: uuidv4(),
      passwordHash: '', 
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    } as User

    await _syncUserToCloud(newUser)
    
    const id = await db.users.add(newUser)
    return id as number
  }

  /**
   * อัปเดตข้อมูลผู้ใช้งานที่มีอยู่
   */
  async function updateUser(id: number, data: Partial<User>): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถแก้ไขข้อมูลพนักงานได้ขณะออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ต')
    }

    const user = await db.users.get(id)
    if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้')

    if (data.username && data.username !== user.username) {
      const supabase = useSupabaseClient<any>()
      const { count } = await supabase.from('pos_users').select('*', { count: 'exact', head: true }).eq('username', data.username).eq('is_deleted', false).neq('uuid', user.uuid)
      if (count && count > 0) throw new Error(`Username "${data.username}" ถูกใช้งานแล้วในระบบ`)
    }

    if (data.pin && !isAlreadyHashed(data.pin)) {
      data.pin = await hashSHA256(data.pin)
    }

    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date()
    }

    await _syncUserToCloud(updatedUser)
    await db.users.update(id, updatedUser)
  }

  /**
   * สลับสถานะเปิด/ปิดผู้ใช้งาน
   */
  async function toggleUserActive(id: number, isActive: boolean): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถเปลี่ยนสถานะพนักงานได้ขณะออฟไลน์')
    }

    const user = await db.users.get(id)
    if (!user) return

    const updatedUser = { ...user, isActive, updatedAt: new Date() }
    await _syncUserToCloud(updatedUser)
    await db.users.update(id, updatedUser)
  }

  /**
   * Soft Delete ผู้ใช้งาน (ซ่อนเฉยๆ ไม่ลบจริง)
   */
  async function deleteUser(id: number): Promise<void> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถลบพนักงานได้ขณะออฟไลน์')
    }

    const user = await db.users.get(id)
    if (user?.username === 'admin') {
      throw new Error('ไม่สามารถลบบัญชีระบบ (admin) พื้นฐานได้')
    }
    if (!user) return

    const updatedUser = { ...user, isDeleted: true, updatedAt: new Date() }
    await _syncUserToCloud(updatedUser)
    await db.users.update(id, updatedUser)
  }

  const { isOnline } = useSync()

  return {
    isOnline,
    loadUsers,
    createUser,
    updateUser,
    toggleUserActive,
    deleteUser
  }
}
