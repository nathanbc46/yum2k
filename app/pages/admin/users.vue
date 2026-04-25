<template>
  <div class="p-6 h-full flex flex-col bg-surface-950 text-surface-50 overflow-hidden">
    
    <!-- 🟢 Header section -->
    <div class="flex items-center justify-between mb-6 shrink-0">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-3">
          <span>👥</span>
          <span>จัดการพนักงาน (Users)</span>
          <!-- Online/Offline Badge -->
          <span 
            v-if="!isOnline"
            class="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse"
          >
            OFFLINE - งดแก้ไขข้อมูล
          </span>
          <span 
            v-else
            class="text-[10px] bg-success/20 text-success border border-success/30 px-2 py-0.5 rounded-full uppercase tracking-widest"
          >
            Online
          </span>
        </h1>
        <p class="text-surface-400 text-sm mt-1">
          เพิ่ม/ลบ สิทธิ์และรหัสเข้าใช้งานของพนักงานภายในร้าน (ต้องใช้อินเทอร์เน็ตในการจัดการ)
        </p>
      </div>
      
      <button 
        @click="openCreateModal"
        :disabled="!isOnline"
        class="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-xl font-bold font-sans flex items-center gap-2 shadow-lg shadow-primary-900/40 transition-transform active:scale-95 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>+</span>
        <span>เพิ่มผู้ใช้งาน</span>
      </button>
    </div>

    <!-- ⚠️ Offline Warning Banner -->
    <div 
      v-if="!isOnline"
      class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-sm"
    >
      <span class="text-xl">⚠️</span>
      <p>ขออภัย ขณะนี้ระบบอยู่ในโหมดออฟไลน์ <strong>ไม่สามารถเพิ่ม แก้ไข หรือลบพนักงานได้</strong> เพื่อป้องกันความผิดพลาดของข้อมูล กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนทำรายการ</p>
    </div>

    <!-- 🟢 Main Table Area -->
    <div class="flex-1 bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden flex flex-col relative">
      
      <div v-if="isLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-900/80 backdrop-blur-sm">
        <span class="text-4xl animate-spin mb-4">⌛</span>
        <span class="text-surface-300 font-medium">กำลังโหลดข้อมูล...</span>
      </div>

      <div class="flex-1 overflow-auto scrollbar-thin">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-surface-800 text-surface-300 sticky top-0 z-10">
            <tr>
              <th class="py-4 px-6 font-semibold">ชื่อ-นามสกุล</th>
              <th class="py-4 px-6 font-semibold">Username</th>
              <th class="py-4 px-6 font-semibold">ระดับสิทธิ์ (Role)</th>
              <th class="py-4 px-6 font-semibold text-center">รหัส PIN</th>
              <th class="py-4 px-6 font-semibold text-center">สถานะ</th>
              <th class="py-4 px-6 font-semibold text-right">📝 จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="users.length === 0 && !isLoading">
              <td colspan="6" class="text-center py-20 text-surface-500 text-base">
                ยังไม่มีข้อมูลผู้ใช้งาน
              </td>
            </tr>

            <tr 
              v-for="user in users" 
              :key="user.id"
              class="border-b border-surface-800/50 hover:bg-surface-800 transition-colors"
              :class="{ 'opacity-50 grayscale': !user.isActive }"
            >
              <td class="py-3 px-6 font-medium">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300">
                    {{ user.displayName.substring(0, 2) }}
                  </div>
                  {{ user.displayName }}
                </div>
              </td>
              <td class="py-3 px-6 text-surface-400 font-mono">{{ user.username }}</td>
              <td class="py-3 px-6">
                <!-- Role Badge -->
                <span 
                  class="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase border"
                  :class="user.role === 'admin' 
                    ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' 
                    : 'bg-surface-700 text-surface-300 border-surface-600'"
                >
                  {{ user.role === 'admin' ? '🔥 Admin' : '👤 Staff' }}
                </span>
              </td>
              <td class="py-3 px-6 text-center">
                <div class="inline-flex items-center gap-2">
                  <div class="bg-surface-950 px-3 py-1 rounded-lg border border-surface-700 font-mono text-surface-400 tracking-[0.3em]">
                    ••••
                  </div>
                </div>
              </td>
              <td class="py-3 px-6 text-center">
                <span v-if="user.isActive" class="text-success text-lg" title="ใช้งานได้">🟢</span>
                <span v-else class="text-surface-500 text-lg" title="ถูกระงับ">⚪</span>
              </td>
              <td class="py-3 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditModal(user)"
                    :disabled="!isOnline"
                    class="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white rounded-lg transition-colors border border-surface-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="แก้ไขข้อมูล"
                  >
                    ✏️
                  </button>
                  <button 
                    @click="handleDelete(user)"
                    :disabled="user.username === 'admin' || !isOnline"
                    class="p-2 bg-surface-800 hover:bg-red-500/20 text-surface-500 hover:text-red-400 rounded-lg transition-colors border border-surface-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="ลบผู้ใช้นี้"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Footer Stat -->
      <div class="bg-surface-800/50 px-6 py-3 border-t border-surface-800 text-xs text-surface-500 flex justify-between">
        <span>จำนวนพนักงานทั้งหมด: <strong class="text-surface-100">{{ users.length }}</strong> คน</span>
      </div>
    </div>

    <!-- 🟢 Modal Form -->
    <UserFormModal 
      :is-open="isModalOpen"
      :user-to-edit="selectedUser"
      @close="closeModal"
      @save="handleSaveUser"
    />

  </div>
</template>

<script setup lang="ts">
import { useUsers } from '~/composables/useUsers'
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import type { User } from '~/types'
import UserFormModal from '~/components/admin/UserFormModal.vue'

definePageMeta({ layout: 'admin' })

const { isOnline, loadUsers, createUser, updateUser, deleteUser } = useUsers()
const { lastPullTimestamp } = useMasterDataSync()
const toast = useToast()
const { confirm } = useConfirm()

const users = ref<User[]>([])
const isLoading = ref(true)

// Modal State
const isModalOpen = ref(false)
const selectedUser = ref<User | null>(null)

async function fetchUsers() {
  isLoading.value = true
  try {
    users.value = await loadUsers()
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

// Auto-refresh เมื่อมีการ Pull ข้อมูลจาก Cloud สำเร็จ
watch(lastPullTimestamp, () => {
  console.log('🔄 Detect Cloud Pull: Refreshing Users...')
  fetchUsers()
})

function openCreateModal() {
  selectedUser.value = null
  isModalOpen.value = true
}

function openEditModal(user: User) {
  selectedUser.value = { ...user } // clone
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedUser.value = null
}

async function handleSaveUser(payload: Partial<User>) {
  try {
    if (selectedUser.value) {
      // Edit
      await updateUser(selectedUser.value.id!, payload)
    } else {
      // Create
      await createUser(payload as any)
    }
    
    // Refresh Table
    closeModal()
    await fetchUsers()
    toast.success('บันทึกข้อมูลสำเร็จ')
  } catch (err: any) {
    toast.error(err.message) // Modal จะยังไม่ปิด โชว์ toast ไปก่อน
  }
}

async function handleDelete(user: User) {
  if (user.username === 'admin') {
    toast.warning('ไม่สามารถลบบัญชีผู้จัดการหลักได้')
    return
  }
  
  const confirmed = await confirm({
    title: 'ยืนยันการระงับการใช้งาน',
    message: `คุณแน่ใจหรือไม่ที่จะลบพนักงาน "${user.displayName}"?\n(บัญชีนี้จะถูกระงับและไม่สามารถล็อกอินได้อีก)`,
    confirmText: 'ระงับการใช้งาน',
    type: 'danger'
  })

  if (confirmed) {
    try {
      await deleteUser(user.id!)
      await fetchUsers()
      toast.success('ระงับการใช้งานพนักงานเรียบร้อยแล้ว')
    } catch (err: any) {
      toast.error(err.message)
    }
  }
}
</script>
