<template>
  <Transition name="fade">
    <div 
      v-if="showInstallPrompt" 
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
    >
      <div class="bg-surface-900 border border-primary-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-4">
        <!-- Icon -->
        <div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shrink-0">
          🥗
        </div>
        
        <!-- Text -->
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-bold text-white truncate">ติดตั้ง Yum2K POS</h4>
          <p class="text-xs text-surface-400">ติดตั้งแอปเพื่อใช้งานเต็มหน้าจอและลื่นไหลขึ้น</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button 
            @click="dismissPrompt"
            class="px-3 py-2 text-xs font-semibold text-surface-400 hover:text-white transition-colors"
          >
            ไม่ใช่ตอนนี้
          </button>
          <button 
            @click="installApp"
            class="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
          >
            ติดตั้ง
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const showInstallPrompt = ref(false)
let deferredPrompt: any = null

onMounted(() => {
  // ดักจับอีเวนต์ install
  window.addEventListener('beforeinstallprompt', (e) => {
    // ป้องกันการโชว์ดั้งเดิมของ Browser
    e.preventDefault()
    // เก็บไว้เรียกใช้ตอนกดยืนยัน
    deferredPrompt = e
    // แสดง UI ของเรา (ยกเว้นเข้าผ่านแอปที่ติดตั้งแล้ว)
    if (!window.matchMedia('(display-mode: standalone)').matches) {
       showInstallPrompt.value = true
    }
  })

  // เมื่อติดตั้งเสร็จแล้ว
  window.addEventListener('appinstalled', () => {
    showInstallPrompt.value = false
    deferredPrompt = null
    console.log('✅ แอป Yum2K POS ถูกติดตั้งเรียบร้อยแล้ว')
  })
})

function dismissPrompt() {
  showInstallPrompt.value = false
}

async function installApp() {
  if (!deferredPrompt) return
  
  // แสดงหน้าต่างติดตั้งของ Browser
  deferredPrompt.prompt()
  
  // รอผลตอบรับ
  const { outcome } = await deferredPrompt.userChoice
  console.log(`User response to the install prompt: ${outcome}`)
  
  if (outcome === 'accepted') {
    showInstallPrompt.value = false
  }
  deferredPrompt = null
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
