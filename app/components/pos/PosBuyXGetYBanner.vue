<template>
  <div v-if="eligibilities.length > 0" class="px-3 py-2 space-y-1.5">
    <button
      v-for="elig in eligibilities"
      :key="elig.promotion.id"
      type="button"
      @click="$emit('open-selector', elig)"
      class="w-full rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.99] text-left"
      :class="elig.isTriggered
        ? 'bg-green-100 dark:bg-green-600/20 border border-green-300 dark:border-green-500/40 hover:bg-green-200 dark:hover:bg-green-600/30'
        : 'bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 hover:bg-amber-200 dark:hover:bg-amber-500/20'"
    >
      <!-- ไอคอน -->
      <span class="text-xl shrink-0">{{ elig.isTriggered ? '🎁' : '🛒' }}</span>

      <!-- ข้อมูล -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span
            class="text-xs font-bold truncate"
            :class="elig.isTriggered ? 'text-green-800 dark:text-green-400' : 'text-amber-800 dark:text-amber-400'"
          >
            {{ elig.promotion.name }}
          </span>
          <span
            class="text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-full"
            :class="elig.isTriggered
              ? 'bg-green-200 dark:bg-green-500/20 text-green-900 dark:text-green-300'
              : 'bg-amber-200 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300'"
          >
            {{ elig.eligibleCountInCart }}/{{ elig.buyQty }}
          </span>
        </div>

        <!-- Progress bar -->
        <div class="w-full bg-black/10 dark:bg-black/20 rounded-full h-1.5">
          <div
            class="h-1.5 rounded-full transition-all duration-500"
            :class="elig.isTriggered ? 'bg-green-500 dark:bg-green-400' : 'bg-amber-500 dark:bg-amber-400'"
            :style="{ width: `${Math.min(100, (elig.eligibleCountInCart % elig.buyQty || (elig.isTriggered ? elig.buyQty : 0)) / elig.buyQty * 100)}%` }"
          />
        </div>

        <div class="text-[10px] mt-1" :class="elig.isTriggered ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300/70'">
          {{ buildProgressText(elig) }}
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { buildProgressText } from '~/composables/useBuyXGetY'
import type { BuyXGetYEligibility } from '~/composables/useBuyXGetY'

defineProps<{
  eligibilities: BuyXGetYEligibility[]
}>()

defineEmits<{
  'open-selector': [eligibility: BuyXGetYEligibility]
}>()
</script>
