// =============================================================================
// composables/useTheme.ts
// จัดการการเปลี่ยนธีม Dark/Light Mode และบันทึกลง LocalStorage
// =============================================================================

export function useTheme() {
  const theme = useState<'dark' | 'light'>('theme', () => 'dark')

  // เริ่มต้นตั้งค่าจาก LocalStorage (ถ้ามี)
  onMounted(() => {
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'light' | null
    if (savedTheme) {
      theme.value = savedTheme
      applyTheme(savedTheme)
    } else {
      // ถ้าไม่มี ให้ดูจาก System Preference หรือ Default เป็น Dark
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initialTheme = prefersDark ? 'dark' : 'light'
      // สำหรับแอปนี้เรา Default เป็น Dark ตามสไตล์ร้านยำ
      theme.value = 'dark'
      applyTheme('dark')
    }
  })

  function applyTheme(newTheme: 'dark' | 'light') {
    if (process.client) {
      const html = document.documentElement
      if (newTheme === 'light') {
        html.classList.add('light-mode')
        html.classList.remove('dark-mode')
      } else {
        html.classList.add('dark-mode')
        html.classList.remove('light-mode')
      }
      localStorage.setItem('app-theme', newTheme)
    }
  }

  function toggleTheme() {
    const newTheme = theme.value === 'dark' ? 'light' : 'dark'
    theme.value = newTheme
    applyTheme(newTheme)
  }

  return {
    theme,
    toggleTheme,
    isDark: computed(() => theme.value === 'dark')
  }
}
