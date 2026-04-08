<template>
  <div class="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none min-w-[320px] max-w-md">
    <TransitionGroup 
      name="toast-list" 
      tag="div" 
      class="flex flex-col gap-3"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto p-4 rounded-2xl shadow-2xl backdrop-blur-md border flex items-start gap-3 transition-all duration-300"
        :class="[
          toast.type === 'success' ? 'bg-success/10 border-success/20 text-success' :
          toast.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger' :
          toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
          'bg-surface-800/80 border-surface-700 text-surface-50'
        ]"
      >
        <!-- Icon -->
        <span class="text-xl shrink-0 mt-0.5">
          <template v-if="toast.type === 'success'">✅</template>
          <template v-else-if="toast.type === 'error'">❌</template>
          <template v-else-if="toast.type === 'warning'">⚠️</template>
          <template v-else>ℹ️</template>
        </span>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold whitespace-pre-wrap leading-relaxed">{{ toast.message }}</p>
        </div>

        <!-- Close -->
        <button 
          @click="removeToast(toast.id)"
          class="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors opacity-50 hover:opacity-100"
        >
          <span class="text-xs">✕</span>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
/* Toast List Transitions */
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.9);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.9);
}

/* Ensure smooth moving when others leave */
.toast-list-move {
  transition: transform 0.4s ease;
}
</style>
