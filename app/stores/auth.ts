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

  /**
   * ระบบเริ่มต้นผู้ใช้งาน (เฉพาะกรณีเครื่องใหม่ที่ไม่มีข้อมูล)
   * 1. เช็ค Local Users
   * 2. หากไม่มี -> เช็คเน็ต -> เช็ค Cloud -> Pull หรือ Seed
   */
  async function initUserSystem(): Promise<{ status: 'ready' | 'need_online' | 'error', message?: string }> {
    const [userCount, catCount] = await Promise.all([
      db.users.count(),
      db.categories.count()
    ])

    // หากมีทั้ง User และ Category แล้ว ถือว่าพร้อม (สินค้าอาจจะเป็น 0 ได้ถ้ายังไม่ได้สร้าง)
    if (userCount > 0 && catCount > 0) return { status: 'ready' }

    // กรณีไม่มี User ในเครื่องเลย (เครื่องใหม่)
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      return { status: 'need_online', message: 'กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อเริ่มต้นใช้งานครั้งแรก' }
    }

    try {
      const { checkRemoteUsersExist, pullAll } = useMasterDataSync()
      const hasCloudUsers = await checkRemoteUsersExist()

      if (hasCloudUsers) {
        console.log('☁️ ตรวจพบข้อมูลใน Cloud กำลังดึงข้อมูลทั้งหมด...')
        await pullAll(true)
        return { status: 'ready' }
      } else {
        console.log('🌱 ไม่พบผู้ใช้ใน Cloud กำลังสร้างข้อมูลเริ่มต้น (Seed Data)...')
        const { seedDatabase } = await import('~/db/seedData')
        await seedDatabase()
        return { status: 'ready' }
      }
    } catch (error: any) {
      console.error('❌ ไม่สามารถเริ่มต้นระบบผู้ใช้งานได้:', error)
      return { status: 'error', message: error.message }
    }
  }

  /**
   * จัดการกรณีตรวจพบการเปลี่ยนรหัสผ่านจากเครื่องอื่น
   */
  function handleSecurityInvalidation() {
    const toast = useToast()
    toast.error('รหัสผ่านของคุณถูกเปลี่ยนจากอุปกรณ์อื่น เพื่อความปลอดภัยกรุณาเข้าสู่ระบบใหม่', 10000)
    logout()
    // ใช้เวลาเล็กน้อยให้ Toast แสดงก่อน Redirect
    setTimeout(() => {
      navigateTo('/login')
    }, 1500)
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
    initUserSystem,
    handleSecurityInvalidation,
    loginWithPin,
    logout,
  }
})
