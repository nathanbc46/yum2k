// =============================================================================
// stores/auth.ts
// Store จัดการผู้ใช้งานปัจจุบันที่กำลังเข้าสู่ระบบผ่าน PIN
// =============================================================================

import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { User } from '~/types'
import { hashSHA256, isAlreadyHashed } from '~/utils/crypto'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const isHydrated = ref(false) // เพื่อเช็คว่าโหลด state จาก IndexedDB เสร็จแล้ว

  // ดึงข้อมูล User จาก Local Storage / IndexedDB
  async function hydrate() {
    // ---- ตรวจสอบและสร้าง Admin ถ้ายังไม่มี ----
    const adminExists = await db.users.where('username').equals('admin').first()
    if (!adminExists) {
      await db.users.add({
        uuid: '00000000-0000-4000-a000-000000000001', // Static UUID
        username: 'admin',
        passwordHash: '',
        displayName: 'ผู้จัดการ (Admin)',
        role: 'admin',
        pin: await hashSHA256('1234'), // เข้ารหัส PIN
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log('✅ สร้างบัญชี: Admin (Static UUID)')
    }

    // ---- ตรวจสอบและสร้าง Staff ถ้ายังไม่มี ----
    const staffExists = await db.users.where('username').equals('staff').first()
    if (!staffExists) {
      await db.users.add({
        uuid: '00000000-0000-4000-a000-000000000002', // Static UUID
        username: 'staff',
        passwordHash: '',
        displayName: 'พนักงานขาย (Staff)',
        role: 'staff',
        pin: await hashSHA256('0000'), // เข้ารหัส PIN
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log('✅ สร้างบัญชี: Staff (Static UUID)')
    }

    // ---- Migrate PIN เก่าที่ยังเป็น plain text → Hash อัตโนมัติ ----
    const allUsers = await db.users.toArray()
    for (const user of allUsers) {
      if (user.pin && !isAlreadyHashed(user.pin)) {
        const hashed = await hashSHA256(user.pin)
        await db.users.update(user.id!, { pin: hashed, updatedAt: new Date() })
        console.log(`🔄 Migrate PIN สำเร็จ: ${user.username}`)
      }
    }
    // -----------------------------------------------------------------


    const savedId = localStorage.getItem('yum2k_current_user_id')
    if (savedId) {
      const id = parseInt(savedId, 10)
      if (!isNaN(id)) {
        const user = await db.users.get(id)
        if (user && user.isActive && !user.isDeleted) {
          currentUser.value = user
          // ไม่ต้องอัปเดต lastLoginAt ตรงนี้ เพื่อป้องกันการกระตุ้น Delta Sync ทุกครั้งที่ Refresh
        } else {
          localStorage.removeItem('yum2k_current_user_id')
        }
      }
    }
    isHydrated.value = true
  }

  // เข้าสู่ระบบด้วย PIN 4 หลัก (เข้ารหัส PIN ก่อนเปรียบเทียบทุกครั้ง)
  async function loginWithPin(pin: string): Promise<boolean> {
    // Hash PIN ที่กดมาก่อนเปรียบเทียบกับที่เก็บใน IndexedDB
    const hashedInput = await hashSHA256(pin)
    const allUsers = await db.users.toArray()
    const match = allUsers.find(u => u.pin === hashedInput && u.isActive && !u.isDeleted)

    if (match) {
      currentUser.value = match
      localStorage.setItem('yum2k_current_user_id', match.id!.toString())
      await db.users.update(match.id!, { lastLoginAt: new Date() })
      return true
    }
    return false
  }

  // ออกจากระบบ
  function logout() {
    currentUser.value = null
    localStorage.removeItem('yum2k_current_user_id')
  }

  // ตรวจสอบสิทธิ์
  const isAuthenticated = computed(() => currentUser.value !== null)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isStaff = computed(() => currentUser.value?.role === 'staff')

  return {
    currentUser,
    isHydrated,
    isAuthenticated,
    isAdmin,
    isStaff,
    hydrate,
    loginWithPin,
    logout,
  }
})
