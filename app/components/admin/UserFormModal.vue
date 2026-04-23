<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center">
    <!-- Backdrop (คลิกเพื่อปิดไม่ได้เพื่อป้องกันลั่น) -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

    <!-- Modal Box -->
    <div 
      class="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div class="px-5 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-900/50 rounded-t-2xl shrink-0">
        <h3 class="text-lg font-bold text-surface-50 flex items-center gap-2">
          <span>{{ isEdit ? '✏️ แก้ไขข้อมูลพนักงาน' : '👤 เพิ่มพนักงานใหม่' }}</span>
        </h3>
        <button 
          @click="closeModal"
          class="text-surface-500 hover:text-surface-300 hover:bg-surface-800 p-1.5 rounded-lg transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Body / Form -->
      <div class="p-5 overflow-y-auto scrollbar-thin">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          
          <div class="grid grid-cols-1 gap-5">
            <!-- Username -->
            <div>
              <label class="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wider">ชื่อบัญชีล็อกอิน (Username) *</label>
              <input 
                v-model.trim="form.username" 
                type="text" 
                required
                :disabled="isEdit && form.username === 'admin'"
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all disabled:opacity-50"
                placeholder="เช่น staff01"
              >
            </div>

            <!-- Display Name -->
            <div>
              <label class="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wider">ชื่อ-นามสกุลพนักงาน *</label>
              <input 
                v-model.trim="form.displayName" 
                type="text" 
                required
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                placeholder="ชื่อที่ใช้โชว์เวลากดหน้าจอ"
              >
            </div>

            <!-- Role -->
            <div>
              <label class="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wider">ระดับสิทธิ์ (Role) *</label>
              <select 
                v-model="form.role"
                :disabled="isEdit && form.username === 'admin'"
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none disabled:opacity-50"
              >
                <option value="staff">พนักงานขาย (Staff)</option>
                <option value="admin">ผู้จัดการร้าน (Admin)</option>
              </select>
            </div>

            <!-- PIN Code -->
            <div>
              <label class="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wider">
                รหัส PIN 4 หลัก {{ isEdit ? '(ไม่บังคับ)' : '*' }}
              </label>
              <div class="flex gap-2">
                <input 
                  v-model.trim="form.pin" 
                  type="text" 
                  maxlength="4"
                  pattern="[0-9]{4}"
                  :required="!isEdit"
                  class="flex-1 bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all text-center tracking-[0.5em] font-mono font-bold text-lg"
                  :placeholder="isEdit ? 'ปล่อยว่างถ้าไม่เปลี่ยนรหัส' : '0000'"
                  @input="forceNumbersOnly"
                >
                <button 
                  type="button"
                  @click="generateRandomPin"
                  class="bg-surface-800 border border-surface-700 text-surface-300 hover:text-primary-400 hover:border-primary-500/50 rounded-xl px-4 flex items-center justify-center transition-colors shadow-sm"
                  title="สุ่มรหัส PIN"
                >
                  🎲 สุ่มรหัส
                </button>
              </div>
            </div>

            <!-- Active Status (Only in Edit Mode) -->
            <div v-if="isEdit" class="flex items-center justify-between p-3 bg-surface-950 border border-surface-800 rounded-xl">
              <div>
                <div class="text-sm font-semibold text-surface-100">สถานะการใช้งาน</div>
                <div class="text-xs text-surface-500 mt-0.5">ระงับการเข้าสู่ระบบหากพนักงานลาออก</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="form.isActive" 
                  class="sr-only peer"
                  :disabled="form.username === 'admin'"
                >
                <div class="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success peer-disabled:opacity-50"></div>
              </label>
            </div>

          </div>

          <!-- Error Alert -->
          <div v-if="errorMsg" class="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{{ errorMsg }}</span>
          </div>

        </form>
      </div>

      <!-- Footer Buttons -->
      <div class="px-5 py-4 border-t border-surface-800 flex justify-end gap-3 bg-surface-900/50 rounded-b-2xl shrink-0">
        <button 
          type="button"
          @click="closeModal"
          class="px-5 py-2.5 rounded-xl font-medium text-surface-300 hover:bg-surface-800 hover:text-surface-50 transition-colors"
        >
          ยกเลิก
        </button>
        <button 
          @click="handleSubmit"
          :disabled="isSaving"
          class="px-6 py-2.5 rounded-xl font-bold bg-primary-600 text-white hover:bg-primary-500 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary-900/30"
        >
          <span v-if="isSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>ยันยันบันทึก</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User, UserRole } from '~/types'
import { useUsers } from '~/composables/useUsers'

const { isPinUnique } = useUsers()

const props = defineProps<{
  isOpen: boolean
  userToEdit: User | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: Partial<User>): void
}>()

const isSaving = ref(false)
const errorMsg = ref('')

const form = ref({
  username: '',
  displayName: '',
  role: 'staff' as UserRole,
  pin: '',
  isActive: true
})

const isEdit = computed(() => !!props.userToEdit)

// Watch เมื่อมีการเปิดเทอม หรือส่ง user เข้ามาให้ใส่ข้อมูลเดิม
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    errorMsg.value = ''
    if (props.userToEdit) {
      form.value = {
        username: props.userToEdit.username,
        displayName: props.userToEdit.displayName,
        role: props.userToEdit.role,
        pin: '', // ซ่อนค่าเดิม (ที่เป็น hash ยาวๆ) ไม่ให้แสดงในฟอร์ม
        isActive: props.userToEdit.isActive
      }
    } else {
      // หน้าจอสร้างใหม่
      form.value = {
        username: '',
        displayName: '',
        role: 'staff',
        pin: '',
        isActive: true
      }
    }
  }
})

function generateRandomPin() {
  const random = Math.floor(1000 + Math.random() * 9000)
  form.value.pin = random.toString()
}

function forceNumbersOnly(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.pin = input.value.replace(/[^0-9]/g, '')
}

function closeModal() {
  emit('close')
}

async function handleSubmit() {
  if (!form.value.username || !form.value.displayName) {
    errorMsg.value = 'กรุณากรอกข้อมูล Username และ ชื่อ-นามสกุล ให้ครบถ้วน'
    return
  }
  
  if (!isEdit.value && !form.value.pin) {
    errorMsg.value = 'ต้องระบุรหัส PIN 4 หลัก สำหรับผู้ใช้งานใหม่'
    return
  }

  if (form.value.pin && form.value.pin.length !== 4) {
    errorMsg.value = 'รหัส PIN ต้องมีครบ 4 หลักพอดี'
    return
  }

  isSaving.value = true
  errorMsg.value = ''

  try {
    // 🔍 ตรวจสอบความซ้ำซ้อนของ PIN ก่อน (ถ้ามีการกรอกมาใหม่)
    if (form.value.pin) {
      const isUnique = await isPinUnique(form.value.pin, props.userToEdit?.uuid)
      if (!isUnique) {
        errorMsg.value = 'รหัส PIN นี้ถูกใช้งานแล้วโดยพนักงานท่านอื่น กรุณาใช้รหัสอื่นครับ'
        isSaving.value = false
        return
      }
    }

    const payload: Partial<User> = {
      username: form.value.username,
      displayName: form.value.displayName,
      role: form.value.role,
      isActive: form.value.isActive
    }
    
    // อัปเดตเฉพาะตอนที่มีการพิมพ์รหัสมาใหม่เท่านั้น
    if (form.value.pin) {
      payload.pin = form.value.pin
    }

    emit('save', payload)
  } catch (err: any) {
    errorMsg.value = err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
  } finally {
    isSaving.value = false
  }
}
</script>
