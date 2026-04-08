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
