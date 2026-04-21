<template>
  <div class="h-screen w-full flex items-center justify-center bg-surface-950 font-sans">
    
    <div class="max-w-md w-full bg-surface-900 rounded-3xl p-6 sm:p-8 border border-surface-800 shadow-2xl relative overflow-hidden my-4">
      <!-- Decor -->
      <div class="absolute -top-32 -right-32 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary-600/10 rounded-full blur-3xl pointer-events-none" />

      <!-- App Logo -->
      <div class="text-center mb-4 sm:mb-8 relative z-10">
        <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-surface-800 text-2xl sm:text-3xl mb-2 sm:mb-4 shadow-inner">
          🍋
        </div>
        <h1 class="text-xl sm:text-2xl font-black text-surface-50 tracking-tight">Yum2K POS</h1>
        <p class="text-[10px] sm:text-sm text-surface-500 mt-0.5">กรุณาใส่รหัส PIN เพื่อเข้าสู่ระบบ</p>
      </div>

      <!-- PIN Display -->
      <div class="flex justify-center gap-3 sm:gap-4 mb-4 sm:mb-8 relative z-10">
        <div 
          v-for="i in 4" 
          :key="i"
          class="w-10 h-12 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center text-xl sm:text-2xl font-bold transition-all"
          :class="pin.length >= i ? 'border-primary-500 bg-primary-500/10 text-primary-400 scale-105' : 'border-surface-800 bg-surface-950/50 text-surface-400'"
        >
          {{ pin.length >= i ? '•' : '' }}
        </div>
      </div> 

      <!-- Error Message -->
      <div class="h-6 mb-2 text-center relative z-10">
        <p v-if="errorMsg" class="text-red-400 text-xs sm:text-sm font-medium animate-pulse">{{ errorMsg }}</p>
      </div>

      <!-- Numpad -->
      <div class="grid grid-cols-3 gap-2 sm:gap-3 relative z-10 max-w-[280px] mx-auto">
        <!-- 1-9 -->
        <button 
          v-for="num in 9" 
          :key="num"
          @click="addNumber(num.toString())"
          class="aspect-square text-xl sm:text-2xl font-semibold bg-surface-800/80 hover:bg-surface-700 text-surface-100 rounded-xl sm:rounded-2xl transition-all active:scale-95 flex items-center justify-center"
        >
          {{ num }}
        </button>
        
        <!-- Clear / Backspace -->
        <button 
          @click="clearNum"
          class="aspect-square flex items-center justify-center text-sm sm:text-base font-medium bg-surface-800/80 hover:bg-surface-700 hover:text-red-400 text-surface-400 rounded-xl sm:rounded-2xl transition-all active:scale-95"
        >
          ล้าง
        </button>
        
        <!-- 0 -->
        <button 
          @click="addNumber('0')"
          class="aspect-square text-xl sm:text-2xl font-semibold bg-surface-800/80 hover:bg-surface-700 text-surface-100 rounded-xl sm:rounded-2xl transition-all active:scale-95 flex items-center justify-center"
        >
          0
        </button>

        <!-- Backspace icon -->
        <button 
          @click="backspace"
          class="aspect-square flex items-center justify-center text-xl sm:text-2xl font-medium bg-surface-800/80 hover:bg-surface-700 text-surface-400 rounded-xl sm:rounded-2xl transition-all active:scale-95"
        >
          ⌫
        </button>
      </div>

    </div>

    <!-- Modal: Internet Required for First-time Setup -->
    <Transition 
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="initStatus === 'need_online'" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" />
        
        <!-- Modal Card -->
        <div class="bg-surface-900 border border-surface-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-10 text-center">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 text-amber-500 mb-6 border border-amber-500/20">
            <span class="text-4xl">🌐</span>
          </div>
          <h2 class="text-xl font-black text-surface-50 mb-4">ต้องการการเชื่อมต่ออินเทอร์เน็ต</h2>
          <p class="text-surface-400 text-sm leading-relaxed mb-8">
            เนื่องจากเป็นการเข้าใช้งานครั้งแรกบนอุปกรณ์นี้ ระบบจำเป็นต้องเชื่อมต่ออินเทอร์เน็ตเพื่อตรวจสอบข้อมูลร้านและพนักงานจาก Cloud ครับ
          </p>
          <button 
            @click="retryInit"
            :disabled="isInitializing"
            class="w-full h-14 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-primary-500/25 active:scale-95 flex items-center justify-center gap-3"
          >
            <span v-if="isInitializing" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ isInitializing ? 'กำลังตรวจสอบ...' : 'ลองใหม่อีกครั้ง' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Global Loading Overlay for Initialization -->
    <div v-if="isInitializing && initStatus === 'ready'" class="fixed inset-0 z-[60] bg-surface-950/80 backdrop-blur-xl flex flex-col items-center justify-center">
      <div class="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mb-6"></div>
      <p class="text-surface-100 font-bold tracking-widest uppercase text-xs">กำลังเตรียมข้อมูลระบบ...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false // ไม่ใช้ layout ปกติ เพื่อให้เป็นจอ login เดี่ยวๆ
})

const router = useRouter()
const authUser = useAuthStore()

const pin = ref('')
const errorMsg = ref('')
const initStatus = ref<'ready' | 'need_online' | 'error'>('ready')
const isInitializing = ref(false)

// เริ่มต้นระบบเมื่อหน้าจอโหลด
onMounted(async () => {
  await retryInit()
})

async function retryInit() {
  isInitializing.value = true
  const result = await authUser.initUserSystem()
  initStatus.value = result.status
  if (result.status === 'error') {
    errorMsg.value = result.message || 'เกิดข้อผิดพลาดในการเริ่มระบบ'
  }
  isInitializing.value = false
}

async function addNumber(num: string) {
  if (pin.value.length < 4) {
    pin.value += num
    errorMsg.value = '' // clear error when typing again
  }
  
  // ตรวจสอบทันทีที่ครบ 4 หลัก
  if (pin.value.length === 4) {
    await submitPin()
  }
}

function clearNum() {
  pin.value = ''
  errorMsg.value = ''
}

function backspace() {
  pin.value = pin.value.slice(0, -1)
  errorMsg.value = ''
}

async function submitPin() {
  const success = await authUser.loginWithPin(pin.value)
  if (success) {
    // Navigate home
    router.push('/')
  } else {
    // Invalid
    errorMsg.value = 'รหัส PIN ไม่ถูกต้อง'
    setTimeout(() => {
      clearNum()
    }, 500)
  }
}
</script>
