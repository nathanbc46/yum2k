<template>
  <!-- Admin Layout: Sidebar + Main Content -->
  <div class="flex h-screen bg-surface-950 text-surface-50 overflow-hidden relative">

    <!-- Mobile Header (Hamburger) -->
    <div class="lg:hidden absolute top-4 left-4 z-[60]">
      <button 
        @click="isSidebarOpen = !isSidebarOpen"
        class="w-10 h-10 bg-surface-900 border border-surface-700 rounded-xl flex items-center justify-center text-surface-400 shadow-lg"
      >
        <Menu v-if="!isSidebarOpen" :size="20" />
        <X v-else :size="20" />
      </button>
    </div>

    <!-- Sidebar Navigation -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col bg-surface-900 border-r border-surface-800 transition-transform duration-300 transform lg:translate-x-0 lg:relative"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Logo / Brand & User Profile -->
      <div class="p-5 border-b border-surface-800 pt-16 lg:pt-5">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🍋</span>
          <div>
            <div class="font-bold text-sm text-surface-50">Yum2K</div>
            <div class="text-[10px] text-surface-500 uppercase tracking-widest">แผงจัดการ</div>
          </div>
        </div>

        <!-- Current User Box -->
        <div class="bg-surface-800 rounded-xl p-3 flex items-center justify-between border border-surface-700">
          <div class="flex items-center gap-2 overflow-hidden flex-1">
            <span class="text-lg shrink-0">👤</span>
            <div class="truncate pr-2">
              <div class="text-xs font-bold text-surface-50 truncate">{{ authUser.currentUser?.displayName || 'Unknown' }}</div>
              <div class="text-[10px] text-primary-400 font-medium">Administrator</div>
            </div>
          </div>
          
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="toggleTheme"
              class="text-surface-400 hover:text-primary-400 p-1.5 rounded-lg transition-colors bg-surface-900/50 hover:bg-surface-700"
              :title="theme === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'"
            >
              <Sun v-if="theme === 'dark'" :size="16" />
              <Moon v-else :size="16" />
            </button>
            <button 
              @click="handleLogout"
              class="text-surface-400 hover:text-red-400 p-1.5 rounded-lg transition-colors bg-surface-900/50 hover:bg-red-500/10"
              title="ออกจากระบบ"
            >
              <LogOut :size="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- Nav Links -->
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <!-- ปุ่มกลับหน้าขาย (เด่นชัด) -->
        <NuxtLink
          to="/"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-3 bg-surface-800 border border-surface-700 text-surface-300 hover:text-primary-400 hover:border-primary-500/40 transition-all"
          @click="isSidebarOpen = false"
        >
          <span>⬅️</span>
          <span>กลับหน้าขาย (POS)</span>
        </NuxtLink>

        <!-- เส้นคั่น -->
        <div class="border-t border-surface-800 mb-2"></div>

        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          :class="$route.path === link.to
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
            : 'text-surface-400 hover:text-surface-50 hover:bg-surface-800'"
          @click="isSidebarOpen = false"
        >
          <span class="text-base">{{ link.icon }}</span>
          <span>{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <!-- กลับหน้าขาย -->
      <div class="p-3 border-t border-surface-800">
        <!-- Sync Status Bar -->
        <div class="mb-2 px-1">
          <div class="flex items-center gap-1.5 mb-2">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="isOnline ? 'bg-success animate-pulse' : 'bg-surface-600'"
            />
            <span class="text-[10px] text-surface-500 font-medium">
              {{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}
            </span>
            <span v-if="lastMasterSyncAt" class="text-[10px] text-surface-600 ml-auto">
              {{ formatSyncTime(lastMasterSyncAt) }}
            </span>
          </div>

          <!-- Push -->
          <button
            @click="handlePush"
            :disabled="!isOnline || isSyncingMaster"
            class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all mb-1.5"
            :class="!isOnline || isSyncingMaster
              ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
              : 'bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-600/20'"
          >
            <span :class="{ 'animate-spin': isSyncingMaster && syncDir === 'push' }">📤</span>
            <span>{{ isSyncingMaster && syncDir === 'push' ? 'กำลัง Push...' : 'Push ขึ้น Cloud' }}</span>
          </button>

          <!-- Pull -->
          <button
            @click="handlePull"
            :disabled="!isOnline || isSyncingMaster"
            class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all"
            :class="!isOnline || isSyncingMaster
              ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
              : 'bg-secondary-600/20 text-secondary-400 hover:bg-secondary-600/30 border border-secondary-600/20'"
          >
            <span :class="{ 'animate-spin': isSyncingMaster && syncDir === 'pull' }">📥</span>
            <span>{{ isSyncingMaster && syncDir === 'pull' ? 'กำลัง Pull...' : 'Pull จาก Cloud' }}</span>
          </button>

          <!-- Error -->
          <p v-if="masterSyncError" class="text-[10px] text-danger mt-1.5 px-1 leading-snug">
            ⚠️ {{ masterSyncError }}
          </p>
        </div>
      </div>
    </aside>

    <!-- Overlay for mobile sidebar -->
    <div 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
    />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useSync } from '~/composables/useSync'
import { useAuthStore } from '~/stores/auth'
import { useTheme } from '~/composables/useTheme'
import { useToast } from '~/composables/useToast'
import { LogOut, Sun, Moon, Menu, X } from 'lucide-vue-next'

const router = useRouter()
const authUser = useAuthStore()
const { theme, toggleTheme } = useTheme()
const toast = useToast()

const isSidebarOpen = ref(false)

const { isOnline, syncPendingOrders, fetchRemoteOrders } = useSync()
const {
  isSyncingMaster,
  lastMasterSyncAt,
  masterSyncError,
  pushAll,
  pullAll
} = useMasterDataSync()

const syncDir = ref<'push' | 'pull' | null>(null)

// Format วันเวลาแบบง่ายๆ
function formatSyncTime(date: Date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

async function handlePush() {
  syncDir.value = 'push'
  try {
    // 1. ซิงค์ข้อมูลหลัก (Categories, Products)
    const resMaster = await pushAll()
    
    // 2. ซิงค์ข้อมูลธุรกรรม (Orders, Stock Logs)
    const resTrans = await syncPendingOrders(true) // Force sync
    
    const msg = [
      '📤 ส่งข้อมูลขึ้น Cloud สำเร็จ!',
      `• ข้อมูลออร์เดอร์: ${resTrans.orders.success} รายการ`,
      `• หมวดหมู่สินค้า: ${resMaster.categories} รายการ`,
      `• รายการสินค้า: ${resMaster.products} รายการ`,
      `• ประวัติสต็อก: ${resTrans.auditLogs.success} รายการ`
    ].join('\n')

    // ถ้ามี Error ให้แจ้งเตือนเพิ่มเติม
    const allErrors = [...resTrans.orders.errors, ...resTrans.auditLogs.errors]
    if (allErrors.length > 0) {
      toast.warning(msg + `\n\n⚠️ พบข้อผิดพลาด ${allErrors.length} รายการ`, 10000)
    } else {
      toast.success(msg, 6000)
    }
  } catch (e: any) {
    console.error(e)
    toast.error('การส่งข้อมูลล้มเหลว: ' + e.message)
  } finally {
    syncDir.value = null
  }
}

async function handlePull() {
  syncDir.value = 'pull'
  try {
    // 1. ดึงข้อมูลหลัก (Force Pull)
    const resMaster = await pullAll(true)
    
    // 2. ดึงข้อมูลออร์เดอร์ย้อนหลัง (เช่น 200 รายการ)
    const orderCount = await fetchRemoteOrders(200, false)
    
    const msg = [
      '📥 ดึงข้อมูลประวัติจาก Cloud สำเร็จ!',
      `• ข้อมูลออร์เดอร์: ${orderCount} รายการ`,
      `• หมวดหมู่สินค้า: ${resMaster.categories} รายการ`,
      `• รายการสินค้า: ${resMaster.products} รายการ`,
      `• ประวัติสต็อก: ${resMaster.stockLogs} รายการ`
    ].join('\n')
    
    toast.success(msg, 7000)
  } catch (e: any) {
    console.error(e)
    toast.error('การดึงข้อมูลล้มเหลว: ' + e.message)
  } finally {
    syncDir.value = null
  }
}

const navLinks = [
  { to: '/admin',                icon: '📊', label: 'หน้าแรกสรุปยอด' },
  { to: '/admin/reports',        icon: '📈', label: 'วิเคราะห์ยอดขาย' },
  { to: '/admin/closing-report', icon: '🏪', label: 'สรุปยอดปิดร้าน' },
  { to: '/admin/products',       icon: '📦', label: 'จัดการสินค้า' },
  { to: '/admin/categories',     icon: '🗂️', label: 'จัดการหมวดหมู่' },
  { to: '/admin/stock-audit',    icon: '📋', label: 'ประวัติสต็อก' },
  { to: '/admin/users',          icon: '👥', label: 'จัดการพนักงาน' },
  { to: '/admin/settings',       icon: '⚙️', label: 'ตั้งค่าร้านค้า' },
]

function handleLogout() {
  if (confirm('ต้องการสลับผู้ใช้/ออกจากระบบหรือไม่?')) {
    authUser.logout()
    router.push('/login')
  }
}

</script>
