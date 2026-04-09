<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="backdropMousedownHandler"
        @mouseup.self="backdropMouseupHandler"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <!-- Modal Box -->
        <div class="relative bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" @mousedown.stop>
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-5 border-b border-surface-800">
            <h2 class="font-bold text-lg text-surface-50">
              {{ isEditing ? '✏️ แก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่ใหม่' }}
            </h2>
            <button
              @click="$emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >×</button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
            <!-- ชื่อหมวดหมู่ -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">
                ชื่อหมวดหมู่ <span class="text-danger">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="เช่น ยำ, เครื่องดื่ม, ข้าว..."
                required
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all placeholder:text-surface-600"
              />
            </div>

            <!-- หมวดหมู่หลัก (Parent) -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">
                หมวดหมู่หลัก (ถ้ามี)
              </label>
              <div class="relative">
                <select
                  v-model="form.parentId"
                  class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option :value="undefined">--- ไม่มี (เป็นหมวดหมู่หลัก) ---</option>
                  <option
                    v-for="cat in parentOptions"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-500">
                  <IconChevronDown class="w-4 h-4" />
                </div>
              </div>
              <p class="text-[10px] text-surface-500 mt-1 italic pl-1">เลือกเพื่อกำหนดให้เป็นหมวดหมู่ย่อย</p>
            </div>

            <!-- คำอธิบาย -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">
                คำอธิบาย (ไม่บังคับ)
              </label>
              <input
                v-model="form.description"
                type="text"
                placeholder="คำอธิบายสั้นๆ..."
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all placeholder:text-surface-600"
              />
            </div>

            <!-- สีและลำดับ -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">สีประจำหมวดหมู่</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.color"
                    type="color"
                    class="h-10 w-14 bg-surface-950 border border-surface-700 rounded-lg cursor-pointer"
                  />
                  <span class="text-xs text-surface-500 font-mono">{{ form.color }}</span>
                </div>
              </div>
              <div>
                <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">ลำดับแสดงผล</label>
                <input
                  v-model.number="form.sortOrder"
                  type="number"
                  min="1"
                  class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            <!-- สถานะ -->
            <div class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800">
              <div>
                <div class="text-sm font-semibold text-surface-50">เปิดใช้งาน</div>
                <div class="text-xs text-surface-500">แสดงหมวดหมู่นี้ในหน้าขาย</div>
              </div>
              <button
                type="button"
                @click="form.isActive = !form.isActive"
                class="relative w-11 h-6 rounded-full transition-colors duration-200"
                :class="form.isActive ? 'bg-primary-600' : 'bg-surface-700'"
              >
                <span
                  class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  :class="form.isActive ? 'translate-x-5' : 'translate-x-0.5'"
                />
              </button>
            </div>

            <!-- Error Message -->
            <p v-if="errorMsg" class="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
              ⚠️ {{ errorMsg }}
            </p>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="$emit('close')"
                class="flex-1 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-900/20"
              >
                {{ isSaving ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useCategories, type CategoryFormData } from '~/composables/useCategories'
import type { Category } from '~/types'
import { ChevronDown as IconChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  editItem?: Category | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { fetchAll, createCategory, updateCategory } = useCategories()

const allCategories = ref<Category[]>([])
const parentOptions = computed(() => {
  // กรองตัวมันเองออก ถ้ากำลังแก้ไขอยู่ (ป้องกันการเลือกตัวเองเป็นพ่อ)
  if (props.editItem?.id) {
    return allCategories.value.filter(c => c.id !== props.editItem?.id)
  }
  return allCategories.value
})

// --- ป้องกัน Modal ปิดเมื่อลากเมาส์ (Drag to Select) ---
let backdropMousedownFlag = false
function backdropMousedownHandler() { backdropMousedownFlag = true }
function backdropMouseupHandler() {
  if (backdropMousedownFlag) emit('close')
  backdropMousedownFlag = false
}

const isEditing = computed(() => !!props.editItem)
const isSaving = ref(false)
const errorMsg = ref('')

// ฟอร์มเริ่มต้น
const defaultForm = (): CategoryFormData => ({
  name: '',
  parentId: undefined,
  parentUuid: undefined,
  description: '',
  color: '#6366f1',
  sortOrder: 1,
  isActive: true,
})

const form = ref<CategoryFormData>(defaultForm())

// เมื่อเปิด Modal ใหม่ หรือสลับ editItem → Reset/Fill form
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    errorMsg.value = ''
    
    // โหลดรายการหมวดหมู่ทั้งหมดเพื่อทำ Dropdown
    fetchAll().then(res => {
      allCategories.value = res
    })

    if (props.editItem) {
      form.value = {
        name: props.editItem.name,
        parentId: props.editItem.parentId,
        parentUuid: props.editItem.parentUuid,
        description: props.editItem.description ?? '',
        color: props.editItem.color ?? '#6366f1',
        sortOrder: props.editItem.sortOrder,
        isActive: props.editItem.isActive,
      }
    } else {
      form.value = defaultForm()
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!form.value.name.trim()) {
    errorMsg.value = 'กรุณาใส่ชื่อหมวดหมู่'
    return
  }
  isSaving.value = true
  errorMsg.value = ''
  // ค้นหา UUID ของ Parent ก่อนส่ง
  if (form.value.parentId) {
    const parent = allCategories.value.find(c => c.id === form.value.parentId)
    form.value.parentUuid = parent?.uuid
  } else {
    form.value.parentUuid = undefined
  }

  try {
    if (isEditing.value && props.editItem?.id) {
      await updateCategory(props.editItem.id, form.value)
    } else {
      await createCategory(form.value)
    }
    emit('saved')
    emit('close')
  } catch (e: any) {
    errorMsg.value = e.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
