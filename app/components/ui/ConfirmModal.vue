<!-- =============================================================================
  components/ui/ConfirmModal.vue
  Modal ยืนยันการทำงานส่วนกลาง (Global Confirm Modal)
  - ดีไซน์ Premium, Touch-friendly
  - รองรับสีตามประเภท (Danger, Warning, Info)
============================================================================= -->
<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-md" @click="handleCancel" />

        <!-- Modal Box -->
        <div class="relative w-full max-w-sm bg-surface-900 border border-surface-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <!-- Icon Header -->
          <div class="pt-10 pb-6 text-center">
            <div 
              class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg"
              :class="[
                options.type === 'danger' ? 'bg-red-500/10 text-red-500 shadow-red-900/20' :
                options.type === 'warning' ? 'bg-amber-500/10 text-amber-500 shadow-amber-900/20' :
                'bg-primary-500/10 text-primary-500 shadow-primary-900/20'
              ]"
            >
              <span v-if="options.type === 'danger'">🗑️</span>
              <span v-else-if="options.type === 'warning'">⚠️</span>
              <span v-else>ℹ️</span>
            </div>
            
            <h3 class="text-xl font-black text-surface-50 px-6">{{ options.title }}</h3>
            <p class="text-surface-400 text-sm mt-3 px-8 leading-relaxed whitespace-pre-line">{{ options.message }}</p>
          </div>

          <!-- Actions -->
          <div class="p-6 flex gap-3 bg-surface-950/30">
            <button 
              @click="handleCancel"
              class="flex-1 py-4 rounded-2xl bg-surface-800 text-surface-200 font-bold hover:bg-surface-700 transition-all active:scale-95"
            >
              {{ options.cancelText }}
            </button>
            <button 
              @click="handleConfirm"
              class="flex-[1.5] py-4 rounded-2xl text-white font-black shadow-xl transition-all active:scale-95"
              :class="[
                options.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40' :
                options.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40' :
                'bg-primary-600 hover:bg-primary-500 shadow-primary-900/40'
              ]"
            >
              {{ options.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useConfirm } from '~/composables/useConfirm'

const { isOpen, options, handleConfirm, handleCancel } = useConfirm()
</script>

<style scoped>
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>
