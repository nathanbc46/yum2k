// ตั้ง CSS variable --app-height ด้วย window.innerHeight แทน 100dvh
// เพื่อแก้ปัญหา dvh คำนวณผิดบน Android PWA เมื่อ system UI โผล่ระหว่าง reload
export default defineNuxtPlugin(() => {
  function setAppHeight() {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
  }
  setAppHeight()
  window.addEventListener('resize', setAppHeight, { passive: true })
  window.visualViewport?.addEventListener('resize', setAppHeight, { passive: true })
})
