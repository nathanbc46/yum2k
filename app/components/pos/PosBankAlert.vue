<template>
  <Teleport to="body">
    <Transition name="bank-alert">
      <div
        v-if="visible"
        class="fixed inset-0 z-[200] pointer-events-none flex items-end justify-center pb-16"
      >
        <div class="pointer-events-auto bg-emerald-900/95 border-2 border-emerald-400/60 rounded-3xl shadow-2xl px-10 py-6 flex items-center gap-5 backdrop-blur-md max-w-sm w-full mx-4"
          @click="dismiss"
        >
          <div class="w-14 h-14 rounded-2xl bg-emerald-400/20 flex items-center justify-center text-3xl shrink-0">
            💸
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-emerald-300 text-xs font-semibold uppercase tracking-widest mb-0.5">
              เงินโอนเข้า{{ bankLabel }}
            </p>
            <p class="text-white font-black text-3xl leading-none">
              ฿{{ formattedAmount }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { bankAlertState } from '~/composables/useBankTransferAlert'

const visible = computed(() => bankAlertState.visible)
const formattedAmount = computed(() => bankAlertState.amount?.toLocaleString('th-TH', {
  minimumFractionDigits: bankAlertState.amount % 1 !== 0 ? 2 : 0,
  maximumFractionDigits: 2,
}) ?? '0')
const bankLabel = computed(() => bankAlertState.bankName ? ` (${bankAlertState.bankName})` : '')

function dismiss() {
  bankAlertState.visible = false
}
</script>

<style scoped>
.bank-alert-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.bank-alert-leave-active {
  transition: all 0.3s ease-in;
}
.bank-alert-enter-from {
  opacity: 0;
  transform: translateY(60px) scale(0.95);
}
.bank-alert-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.97);
}
</style>
