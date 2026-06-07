<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Trash2, MoreHorizontal } from 'lucide-vue-next'

interface Option {
  value: string
  label: string
  color?: string
}

const props = withDefaults(defineProps<{
  modelValue: string | null
  options: Option[]
  placeholder?: string
  disabled?: boolean
  allowDelete?: boolean
}>(), {
  placeholder: 'เลือกหรือพิมพ์สร้างใหม่...',
  disabled: false,
  allowDelete: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'create': [value: string]
  'delete': [value: string]
}>()

const isOpen = ref(false)
const search = ref('')
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})
const activeMenuValue = ref<string | null>(null)

const selectedOption = computed(() =>
  props.options.find(o => o.value === props.modelValue) ?? null
)

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

const canCreate = computed(() => {
  const q = search.value.trim()
  if (!q) return false
  return !props.options.some(o => o.label.toLowerCase() === q.toLowerCase())
})

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  activeMenuValue.value = null
  search.value = ''
  nextTick(() => {
    positionDropdown()
    inputRef.value?.focus()
  })
}

function positionDropdown() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropdownHeight = 300
  const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 220)}px`,
    zIndex: '9999',
    ...(showAbove
      ? { bottom: `${window.innerHeight - rect.top}px` }
      : { top: `${rect.bottom + 2}px` }
    )
  }
}

function selectOption(opt: Option) {
  emit('update:modelValue', opt.value)
  isOpen.value = false
  search.value = ''
  activeMenuValue.value = null
}

function createNew() {
  const q = search.value.trim()
  if (!q) return
  emit('create', q)
  emit('update:modelValue', q)
  isOpen.value = false
  search.value = ''
}

function clearValue(e: MouseEvent) {
  e.stopPropagation()
  emit('update:modelValue', null)
}

function openMenu(e: MouseEvent, value: string) {
  e.stopPropagation()
  activeMenuValue.value = activeMenuValue.value === value ? null : value
}

function requestDelete(e: MouseEvent, value: string) {
  e.stopPropagation()
  activeMenuValue.value = null
  isOpen.value = false
  emit('delete', value)
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (
    triggerRef.value && !triggerRef.value.contains(target) &&
    dropdownRef.value && !dropdownRef.value.contains(target)
  ) {
    isOpen.value = false
    search.value = ''
    activeMenuValue.value = null
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div class="relative w-full" ref="triggerRef">
    <!-- Trigger -->
    <div
      @click="openDropdown"
      class="flex items-center min-h-[36px] px-2 py-1 border rounded cursor-pointer gap-1 flex-wrap transition-colors"
      :class="[
        disabled
          ? 'bg-surface-800 cursor-not-allowed opacity-60'
          : 'bg-surface-950 hover:border-indigo-400',
        isOpen
          ? 'border-indigo-500 ring-1 ring-indigo-500/30'
          : 'border-surface-700'
      ]"
    >
      <template v-if="selectedOption">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
          :style="selectedOption.color ? { backgroundColor: selectedOption.color } : { backgroundColor: '#6366f1' }"
        >
          {{ selectedOption.label }}
          <button
            v-if="!disabled"
            @click="clearValue"
            class="ml-0.5 hover:opacity-70 leading-none"
            type="button"
          >×</button>
        </span>
      </template>
      <span v-else class="text-surface-400 text-sm select-none">{{ placeholder }}</span>
    </div>

    <!-- Dropdown (teleported to fixed position) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        :style="dropdownStyle"
        class="bg-surface-900 border border-surface-700 rounded-lg shadow-2xl overflow-hidden"
      >
        <!-- Search input -->
        <div class="p-2 border-b border-surface-700">
          <input
            ref="inputRef"
            v-model="search"
            type="text"
            class="w-full text-sm px-2 py-1.5 border border-surface-600 rounded outline-none focus:border-indigo-500 bg-surface-800 text-surface-100 placeholder-surface-500"
            placeholder="ค้นหาหรือพิมพ์สร้างใหม่..."
            @keydown.enter.prevent="canCreate ? createNew() : (filteredOptions[0] && selectOption(filteredOptions[0]))"
            @keydown.escape="isOpen = false"
          />
        </div>

        <!-- Options list -->
        <div class="max-h-52 overflow-y-auto">
          <p v-if="!filteredOptions.length && !canCreate" class="text-sm text-surface-500 px-3 py-2 text-center">
            ไม่พบรายการ
          </p>

          <div
            v-for="opt in filteredOptions"
            :key="opt.value"
            class="group relative flex items-center px-3 py-2 text-sm transition-colors"
            :class="opt.value === modelValue ? 'bg-indigo-600/20' : 'hover:bg-surface-800'"
          >
            <!-- Option label (clickable area) -->
            <button
              type="button"
              @click="selectOption(opt)"
              class="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              <span
                v-if="opt.color"
                class="inline-block px-2 py-0.5 rounded text-xs font-medium text-white shrink-0"
                :style="{ backgroundColor: opt.color }"
              >{{ opt.label }}</span>
              <span v-else class="text-surface-200 truncate">{{ opt.label }}</span>
              <span v-if="opt.value === modelValue" class="ml-auto text-indigo-400 text-xs shrink-0">✓</span>
            </button>

            <!-- ... menu button (visible on hover, only if allowDelete) -->
            <div v-if="allowDelete" class="relative shrink-0 ml-1">
              <button
                type="button"
                @click="openMenu($event, opt.value)"
                class="p-1 rounded text-surface-500 hover:text-surface-200 hover:bg-surface-700 opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreHorizontal :size="14" />
              </button>

              <!-- Popup menu -->
              <div
                v-if="activeMenuValue === opt.value"
                class="absolute right-0 top-7 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-10 min-w-[120px] py-1"
              >
                <button
                  type="button"
                  @click="requestDelete($event, opt.value)"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 :size="13" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Create option -->
          <button
            v-if="canCreate"
            type="button"
            @click="createNew"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-800 text-left border-t border-surface-700 transition-colors"
          >
            <span class="text-surface-500 text-xs">สร้าง</span>
            <span class="inline-block px-2 py-0.5 rounded text-xs font-medium text-white bg-indigo-500">
              {{ search.trim() }}
            </span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
