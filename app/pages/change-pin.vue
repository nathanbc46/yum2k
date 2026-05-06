<template>
  <div class="h-screen w-full flex items-center justify-center bg-surface-950 font-sans">

    <div class="max-w-md w-full bg-surface-900 rounded-3xl p-6 sm:p-8 border border-surface-800 shadow-2xl relative overflow-hidden my-4">
      <!-- Decor -->
      <div class="absolute -top-32 -right-32 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary-600/10 rounded-full blur-3xl pointer-events-none" />

      <!-- Header -->
      <div class="text-center mb-4 sm:mb-8 relative z-10">
        <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-surface-800 text-2xl sm:text-3xl mb-2 sm:mb-4 shadow-inner">
          🔐
        </div>
        <h1 class="text-xl sm:text-2xl font-black text-surface-50 tracking-tight">ตั้งรหัส PIN ใหม่</h1>
        <p class="text-[10px] sm:text-sm text-surface-500 mt-0.5">
          {{ authStore.currentUser?.displayName || authStore.currentUser?.username }}
        </p>
        <p class="text-[10px] sm:text-xs text-amber-400/80 mt-1">
          {{ step === 1 ? 'กรุณากรอก PIN ใหม่ 4 หลัก' : 'กรุณากรอก PIN อีกครั้งเพื่อยืนยัน' }}
        </p>
      </div>

      <!-- Step indicator -->
      <div class="flex justify-center gap-2 mb-4 sm:mb-6 relative z-10">
        <div
          class="h-1.5 w-8 rounded-full transition-all"
          :class="step >= 1 ? 'bg-primary-500' : 'bg-surface-700'"
        />
        <div
          class="h-1.5 w-8 rounded-full transition-all"
          :class="step >= 2 ? 'bg-primary-500' : 'bg-surface-700'"
        />
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

      <!-- Error / Success Message -->
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
          :disabled="isSaving"
          class="aspect-square text-xl sm:text-2xl font-semibold bg-surface-800/80 hover:bg-surface-700 text-surface-100 rounded-xl sm:rounded-2xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
        >
          {{ num }}
        </button>

        <!-- Clear -->
        <button
          @click="clearNum"
          :disabled="isSaving"
          class="aspect-square flex items-center justify-center text-sm sm:text-base font-medium bg-surface-800/80 hover:bg-surface-700 hover:text-red-400 text-surface-400 rounded-xl sm:rounded-2xl transition-all active:scale-95 disabled:opacity-50"
        >
          ล้าง
        </button>

        <!-- 0 -->
        <button
          @click="addNumber('0')"
          :disabled="isSaving"
          class="aspect-square text-xl sm:text-2xl font-semibold bg-surface-800/80 hover:bg-surface-700 text-surface-100 rounded-xl sm:rounded-2xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
        >
          0
        </button>

        <!-- Backspace -->
        <button
          @click="backspace"
          :disabled="isSaving"
          class="aspect-square flex items-center justify-center text-xl sm:text-2xl font-medium bg-surface-800/80 hover:bg-surface-700 text-surface-400 rounded-xl sm:rounded-2xl transition-all active:scale-95 disabled:opacity-50"
        >
          ⌫
        </button>
      </div>

      <!-- Saving overlay -->
      <div v-if="isSaving" class="absolute inset-0 z-20 flex items-center justify-center bg-surface-900/80 rounded-3xl backdrop-blur-sm">
        <div class="flex flex-col items-center gap-3">
          <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          <p class="text-surface-300 text-sm font-medium">กำลังบันทึก...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const router = useRouter()

const pin = ref('')
const step = ref<1 | 2>(1)
const firstPin = ref('')
const errorMsg = ref('')
const isSaving = ref(false)

function addNumber(num: string) {
  if (pin.value.length < 4) {
    pin.value += num
    errorMsg.value = ''
  }
  if (pin.value.length === 4) {
    handlePinComplete()
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

function handlePinComplete() {
  if (step.value === 1) {
    firstPin.value = pin.value
    pin.value = ''
    step.value = 2
  } else {
    if (pin.value === firstPin.value) {
      savePin(pin.value)
    } else {
      errorMsg.value = 'PIN ไม่ตรงกัน กรุณาลองใหม่'
      setTimeout(() => {
        pin.value = ''
        firstPin.value = ''
        step.value = 1
        errorMsg.value = ''
      }, 800)
    }
  }
}

async function savePin(newPin: string) {
  isSaving.value = true
  try {
    await authStore.changePin(newPin)
    router.push('/')
  } catch (err) {
    console.error('Failed to update PIN:', err)
    errorMsg.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    pin.value = ''
    firstPin.value = ''
    step.value = 1
  } finally {
    isSaving.value = false
  }
}
</script>
