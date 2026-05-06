<template>
  <div class="h-screen w-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 font-sans p-4 overflow-y-auto">

    <div class="max-w-sm w-full my-auto">

      <!-- Main Card -->
      <div class="bg-white rounded-3xl shadow-xl shadow-amber-900/10 border border-amber-100 overflow-hidden">

        <!-- Security Warning Banner — อยู่ใน card เสมอ ไม่หายแม้หน้าจอเล็ก -->
        <div class="bg-amber-500 px-4 py-3 flex items-start gap-3">
          <span class="text-lg shrink-0 mt-0.5">🔒</span>
          <div>
            <p class="font-black text-white text-sm leading-tight">ต้องเปลี่ยนรหัส PIN ก่อนใช้งาน</p>
            <p class="text-amber-100 text-xs mt-0.5 leading-snug">
              PIN เริ่มต้น <span class="font-mono font-black bg-amber-600/40 px-1 rounded">1234</span> ไม่ปลอดภัย — ตั้ง PIN ส่วนตัวเพื่อปกป้องระบบ
            </p>
          </div>
        </div>

        <div class="p-5">

        <!-- Header -->
        <div class="text-center mb-4">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-2xl mb-2 shadow-inner">
            🛡️
          </div>
          <h1 class="text-lg font-black text-gray-800 tracking-tight">ตั้งรหัส PIN ใหม่</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ authStore.currentUser?.displayName || authStore.currentUser?.username }}
          </p>
        </div>

        <!-- Step Indicator -->
        <div class="flex items-center gap-2 mb-5">
          <div class="flex-1 flex items-center gap-2">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all"
              :class="step >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'">
              1
            </div>
            <div class="flex-1 h-1 rounded-full transition-all"
              :class="step >= 2 ? 'bg-amber-500' : 'bg-gray-100'" />
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all"
              :class="step >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'">
              2
            </div>
          </div>
        </div>

        <!-- Step Label -->
        <p class="text-center text-sm font-semibold mb-4 transition-all"
          :class="step === 1 ? 'text-amber-600' : 'text-emerald-600'">
          {{ step === 1 ? 'กรอก PIN ใหม่ 4 หลัก' : '✓ PIN บันทึกแล้ว — กรอกอีกครั้งเพื่อยืนยัน' }}
        </p>

        <!-- PIN Display -->
        <div class="flex justify-center gap-3 mb-4">
          <div
            v-for="i in 4"
            :key="i"
            class="w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all"
            :class="pin.length >= i
              ? (step === 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-600 scale-105' : 'border-amber-500 bg-amber-50 text-amber-600 scale-105')
              : 'border-gray-200 bg-gray-50 text-gray-300'"
          >
            {{ pin.length >= i ? '•' : '' }}
          </div>
        </div>

        <!-- Error Message -->
        <div class="h-6 mb-3 text-center">
          <p v-if="errorMsg" class="text-red-500 text-xs font-semibold animate-pulse">{{ errorMsg }}</p>
        </div>

        <!-- Numpad -->
        <div class="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
          <button
            v-for="num in 9"
            :key="num"
            @click="addNumber(num.toString())"
            :disabled="isSaving"
            class="aspect-square text-xl font-semibold bg-gray-100 hover:bg-amber-100 hover:text-amber-700 text-gray-700 rounded-xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-40 shadow-sm"
          >
            {{ num }}
          </button>

          <button
            @click="clearNum"
            :disabled="isSaving"
            class="aspect-square flex items-center justify-center text-sm font-semibold bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-xl transition-all active:scale-95 disabled:opacity-40 shadow-sm"
          >
            ล้าง
          </button>

          <button
            @click="addNumber('0')"
            :disabled="isSaving"
            class="aspect-square text-xl font-semibold bg-gray-100 hover:bg-amber-100 hover:text-amber-700 text-gray-700 rounded-xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-40 shadow-sm"
          >
            0
          </button>

          <button
            @click="backspace"
            :disabled="isSaving"
            class="aspect-square flex items-center justify-center text-xl bg-gray-100 hover:bg-gray-200 text-gray-400 rounded-xl transition-all active:scale-95 disabled:opacity-40 shadow-sm"
          >
            ⌫
          </button>
        </div>

        <!-- PIN strength hint -->
        <p class="text-center text-[11px] text-gray-400 mt-4 leading-snug">
          หลีกเลี่ยง PIN ที่เดาง่าย เช่น 1234, 0000, วันเกิด
        </p>

        </div><!-- /p-5 -->
      </div><!-- /card -->
    </div><!-- /max-w-sm -->

    <!-- Saving overlay -->
    <Transition name="fade">
      <div v-if="isSaving" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
          <div class="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <p class="text-gray-700 text-sm font-semibold">กำลังบันทึก PIN...</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

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
      errorMsg.value = 'PIN ไม่ตรงกัน กรุณาเริ่มใหม่'
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

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
