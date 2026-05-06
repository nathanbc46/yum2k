// =============================================================================
// middleware/auth.global.ts
// Middleware ตรวจสอบสิทธิ์การเข้าใช้งาน ก่อนที่จะเปลี่ยนหน้า
// =============================================================================

import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // 1. รอให้ Hydrate (ดึงข้อมูลจาก LocalStorage/IndexedDB) เสร็จก่อน
  if (!authStore.isHydrated) {
    if (import.meta.client) { // รันเฉพาะฝั่ง Client
      await authStore.hydrate()
    }
  }

  // 2. ข้ามการตรวจถ้ากำลังไปหน้า login หรือ change-pin
  if (to.path === '/login') {
    if (authStore.isAuthenticated) {
      return navigateTo('/') // ถ้า login แล้ว พยายามเข้าหน้า /login ให้เด้งไปหน้าแรก
    }
    return
  }

  // 3. ถ้ายังไม่ได้ login ให้ไปหน้า login เสมอ
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  // 4. บังคับเปลี่ยน PIN ถ้า requiresPinChange = true
  if (authStore.currentUser?.requiresPinChange && to.path !== '/change-pin') {
    return navigateTo('/change-pin')
  }

  // 5. การจัดการสิทธิ์ (Role-Based Access)
  // ถ้าพยายามเข้าหน้า /admin แต่ไม่ใช่ admin ให้เด้งกลับหน้าตั้งต้น
  if (to.path.startsWith('/admin')) {
    if (!authStore.isAdmin) {
      console.warn('⛔ Access Denied: Admin only')
      return navigateTo('/')
    }
  }
})
