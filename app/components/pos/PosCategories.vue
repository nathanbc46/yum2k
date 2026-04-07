<template>
  <div class="flex flex-col h-full">
    <!-- ปุ่มหมวดหมู่เรียงลงมา -->
    <div class="flex-1 flex flex-col gap-2 p-2 overflow-y-auto scrollbar-thin">
      <button
        v-for="cat in store.categories"
        :key="cat.id"
        class="btn-touch flex flex-col gap-1 rounded-xl p-3 items-center text-center transition-colors border shrink-0"
        :class="[
          store.activeCategoryId === cat.id 
            ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20'
            : 'bg-surface-800 text-surface-300 border-transparent hover:bg-surface-700'
        ]"
        @click="store.setActiveCategory(cat.id!)"
      >
        <!-- แสดงสีของหมวดหมู่ (ถ้ามี) แบบเป็นจุด / หรือถ้ามีไอคอนใส่ไอคอน -->
        <span 
          v-if="cat.color"
          class="w-3 h-3 rounded-full mb-1"
          :style="{ backgroundColor: cat.color }"
        ></span>
        
        <span class="text-sm font-medium line-clamp-2">{{ cat.name }}</span>
      </button>
    </div>

    <!-- ปุ่ม Action ด้านล่าง -->
    <div class="p-2 border-t border-surface-800 space-y-1.5 shrink-0">
      <!-- ประวัติการขาย -->
      <NuxtLink
        to="/orders"
        class="flex flex-col items-center gap-0.5 py-2 rounded-xl text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
        title="ประวัติการขาย"
      >
        <span class="text-lg">📜</span>
        <span class="text-[10px] font-medium">ออร์เดอร์</span>
      </NuxtLink>

      <!-- แผงจัดการ Admin (แสดงเฉพาะ Admin) -->
      <NuxtLink
        v-if="authUser.isAdmin"
        to="/admin"
        class="flex flex-col items-center gap-0.5 py-2 rounded-xl text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
        title="แผงจัดการร้าน"
      >
        <span class="text-lg">⚙️</span>
        <span class="text-[10px] font-medium">จัดการ</span>
      </NuxtLink>

      <!-- Divider -->
      <div class="border-t border-surface-800/60 mx-2 pt-1.5">
        <!-- ชื่อผู้ใช้ -->
        <div class="text-center text-[10px] text-surface-500 mb-1 truncate px-1">
          {{ authUser.currentUser?.displayName || authUser.currentUser?.username }}
        </div>
        <!-- สลับธีม -->
        <button
          @click="toggleTheme"
          class="w-full flex flex-col items-center gap-0.5 py-2 rounded-xl text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
          :title="theme === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'"
        >
          <span class="text-lg leading-none">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
          <span class="text-[10px] font-medium">{{ theme === 'dark' ? 'สว่าง' : 'มืด' }}</span>
        </button>

        <!-- Logout -->
        <button
          @click="handleLogout"
          class="w-full flex flex-col items-center gap-0.5 py-2 rounded-xl text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors group"
          title="ออกจากระบบ"
        >
          <LogOut class="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          <span class="text-[10px] font-medium mt-0.5">ออกระบบ</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePosStore } from '~/stores/pos'
import { useAuthStore } from '~/stores/auth'
import { useTheme } from '~/composables/useTheme'
import { LogOut } from 'lucide-vue-next'

const store = usePosStore()
const authUser = useAuthStore()
const { theme, toggleTheme } = useTheme()
const router = useRouter()

function handleLogout() {
  if (confirm('ต้องการสลับผู้ใช้/ออกจากระบบหรือไม่?')) {
    authUser.logout()
    router.push('/login')
  }
}
</script>
