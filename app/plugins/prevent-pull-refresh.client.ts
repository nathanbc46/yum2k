// =============================================================================
// plugins/prevent-pull-refresh.client.ts
// ป้องกัน Pull-to-Refresh บน Android Chrome / iOS Safari PWA
//
// ปัญหา: เมื่อผู้ใช้ดึงหน้าจอลงบน Tablet/มือถือ → Browser รีโหลดหน้า → Layout พัง
// วิธีแก้: Intercept touchmove event เพื่อบล็อก overscroll gesture ที่ระดับ JS
// =============================================================================

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // -----------------------------------------------------------
  // 1. ป้องกัน Pull-to-Refresh ด้วย touchmove interceptor
  //    (ครอบคลุม Android Chrome ที่ CSS overscroll-behavior ยังทำงานไม่ครบ)
  // -----------------------------------------------------------
  let startY = 0

  document.addEventListener('touchstart', (e) => {
    if (e.touches[0]) startY = e.touches[0].clientY
  }, { passive: true })

  document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0]
    if (!touch) return
    const currentY = touch.clientY
    const deltaY = currentY - startY

    // ถ้าดึงลง (deltaY > 0) และ element ที่กำลัง scroll อยู่ที่ด้านบนสุด → บล็อก
    const target = e.target as HTMLElement
    const scrollable = findScrollableParent(target)

    if (deltaY > 0 && (!scrollable || scrollable.scrollTop === 0)) {
      e.preventDefault()
    }
  }, { passive: false })

  // -----------------------------------------------------------
  // 2. ป้องกัน Elastic Scroll บน iOS Safari (Rubber Banding)
  // -----------------------------------------------------------
  document.addEventListener('touchmove', (e) => {
    // อนุญาตเฉพาะ element ที่ scroll ได้จริงๆ
    const target = e.target as HTMLElement
    if (!findScrollableParent(target)) {
      e.preventDefault()
    }
  }, { passive: false })

  // -----------------------------------------------------------
  // Helper: หา Parent Element ที่ scroll ได้
  // -----------------------------------------------------------
  function findScrollableParent(el: HTMLElement | null): HTMLElement | null {
    if (!el || el === document.body) return null

    const { overflowY } = window.getComputedStyle(el)
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight

    if (isScrollable) return el
    return findScrollableParent(el.parentElement)
  }
})
