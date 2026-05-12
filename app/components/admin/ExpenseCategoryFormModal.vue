<template>
  <div v-if="isOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-2xl bg-surface-900 border border-surface-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
      <!-- Header -->
      <header class="px-8 py-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/50">
        <div>
          <h2 class="text-2xl font-bold text-surface-50 flex items-center gap-3">
            <span>🏷️ จัดการหมวดหมู่รายจ่าย</span>
          </h2>
          <p class="text-sm text-surface-500 mt-1">เพิ่ม แก้ไข หรือลบหมวดหมู่สำหรับจัดกลุ่มรายจ่าย</p>
        </div>
        <button @click="$emit('close')" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-800 text-surface-400 transition-all">✕</button>
      </header>

      <!-- Content -->
      <div class="p-8 space-y-6">
        <!-- Add New Form -->
        <div class="flex items-end gap-3 p-4 bg-surface-950/50 rounded-2xl border border-surface-800">
          <div class="flex-1 space-y-1.5">
            <label class="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">ชื่อหมวดหมู่ใหม่</label>
            <input 
              v-model="newCategoryName"
              type="text"
              placeholder="เช่น ค่าการตลาด, ค่าซ่อมแซม..."
              class="w-full h-11 px-4 bg-surface-900 border-surface-700 rounded-xl text-surface-50 focus:ring-primary-500 focus:border-primary-500"
              @keyup.enter="handleAdd"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">สี</label>
            <input 
              v-model="newCategoryColor"
              type="color"
              class="w-16 h-11 p-1 bg-surface-900 border-surface-700 rounded-xl cursor-pointer"
            />
          </div>
          <button 
            @click="handleAdd"
            :disabled="!newCategoryName.trim()"
            class="h-11 px-6 bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus :size="18" />
            <span>เพิ่ม</span>
          </button>
        </div>

        <!-- List -->
        <div class="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          <div 
            v-for="cat in categories" 
            :key="cat.id"
            class="group flex items-center gap-4 p-4 bg-surface-800/40 rounded-2xl border border-surface-700/50 hover:bg-surface-800/70 transition-all"
          >
            <div 
              class="w-4 h-4 rounded-full shrink-0"
              :style="{ backgroundColor: cat.color || '#6366f1' }"
            ></div>
            
            <div class="flex-1">
              <input 
                v-if="editingId === cat.id"
                v-model="editingName"
                type="text"
                class="w-full bg-surface-950 border-surface-700 rounded-lg px-3 py-1 text-sm text-surface-50"
                @blur="handleUpdate(cat)"
                @keyup.enter="handleUpdate(cat)"
                auto-focus
              />
              <span v-else class="text-sm font-bold text-surface-100">{{ cat.name }}</span>
            </div>

            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                @click="startEdit(cat)"
                class="p-2 text-surface-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                title="แก้ไขชื่อ"
              >
                <Pencil :size="16" />
              </button>
              <button 
                @click="handleDelete(cat)"
                class="p-2 text-surface-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                title="ลบ"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-8 py-6 border-t border-surface-800 bg-surface-900/50 flex justify-end">
        <button 
          @click="$emit('close')"
          class="px-8 py-3 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-2xl transition-all"
        >
          ปิดหน้าต่าง
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { useExpenseCategories } from '~/composables/useExpenseCategories'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import type { ExpenseCategoryRecord } from '~/types'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'updated'])

const { categories, fetchAll, addCategory, updateCategory, deleteCategory } = useExpenseCategories()
const { confirm } = useConfirm()
const toast = useToast()

const newCategoryName = ref('')
const newCategoryColor = ref('#6366f1')

const editingId = ref<number | null>(null)
const editingName = ref('')

async function handleAdd() {
  if (!newCategoryName.value.trim()) return
  try {
    await addCategory(newCategoryName.value.trim(), newCategoryColor.value)
    newCategoryName.value = ''
    toast.success('เพิ่มหมวดหมู่สำเร็จ')
    emit('updated')
  } catch (err: any) {
    toast.error('ไม่สามารถเพิ่มได้: ' + err.message)
  }
}

function startEdit(cat: ExpenseCategoryRecord) {
  editingId.value = cat.id!
  editingName.value = cat.name
}

async function handleUpdate(cat: ExpenseCategoryRecord) {
  if (!editingName.value.trim() || editingName.value === cat.name) {
    editingId.value = null
    return
  }
  try {
    await updateCategory(cat.id!, { name: editingName.value.trim() })
    editingId.value = null
    toast.success('แก้ไขสำเร็จ')
    emit('updated')
  } catch (err: any) {
    toast.error('ล้มเหลว: ' + err.message)
  }
}

async function handleDelete(cat: ExpenseCategoryRecord) {
  const ok = await confirm({
    title: 'ยืนยันการลบ',
    message: `คุณต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่? (ข้อมูลรายจ่ายที่มีอยู่จะไม่ถูกลบ แต่จะหายจากหมวดหมู่นี้)`,
    confirmText: 'ลบหมวดหมู่',
    type: 'danger'
  })
  if (!ok) return

  try {
    await deleteCategory(cat.id!)
    toast.success('ลบหมวดหมู่เรียบร้อย')
    emit('updated')
  } catch (err: any) {
    toast.error('ล้มเหลว: ' + err.message)
  }
}

onMounted(() => {
  fetchAll()
})
</script>
