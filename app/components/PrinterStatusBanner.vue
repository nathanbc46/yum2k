<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="show"
      class="flex items-center gap-3 px-4 py-2.5 bg-primary-50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-500/20 text-primary-900 dark:text-primary-400 text-sm"
    >
      <span class="shrink-0 text-base">🖨️</span>
      <span class="flex-1 font-semibold">ยังไม่ได้เชื่อมต่อเครื่องพิมพ์ USB</span>
      <button
        @click="reconnect"
        :disabled="isConnecting"
        class="shrink-0 px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
      >
        {{ isConnecting ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อเครื่องพิมพ์' }}
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { usePrinter } from '~/composables/usePrinter'
import { useSettings } from '~/composables/useSettings'

const { getUSBPrinter, connectUSBPrinter, isUSBSupported } = usePrinter()
const { receiptSettings, loadReceiptSettings } = useSettings()

const show = ref(false)
const isConnecting = ref(false)

async function checkStatus() {
  await loadReceiptSettings()
  if (receiptSettings.value.printerMethod !== 'usb') {
    show.value = false
    return
  }
  if (!isUSBSupported()) {
    show.value = false
    return
  }
  const device = await getUSBPrinter()
  show.value = !device
}

async function reconnect() {
  isConnecting.value = true
  try {
    const device = await connectUSBPrinter()
    show.value = !device
  } finally {
    isConnecting.value = false
  }
}

onMounted(checkStatus)
</script>
