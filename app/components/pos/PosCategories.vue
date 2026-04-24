<template>
  <div class="flex flex-col h-full">
    <!-- ปุ่มหมวดหมู่เรียงลงมา -->
    <div class="flex-1 flex flex-col gap-2 p-2 overflow-y-auto scrollbar-thin">
      <!-- ปุ่มย้อนกลับ -->
      <button
        v-if="store.currentParentId"
        class="btn-touch flex gap-3 rounded-xl p-3 items-center transition-colors border bg-surface-900 text-primary-400 border-primary-500/30 hover:bg-surface-800 active:scale-95 shrink-0 mb-1"
        @click="store.goBack()"
      >
        <ChevronLeft class="w-5 h-5" />
        <span class="text-sm font-black italic">ย้อนกลับ</span>
      </button>

      <!-- ปุ่มสินค้าทั้งหมด (ขายดี) -->
      <button
        v-if="!store.currentParentId"
        class="btn-touch relative group flex flex-col gap-1 rounded-2xl px-2 py-4 items-center text-center transition-all duration-300 border-2 shrink-0 active:scale-95 shadow-sm"
        :class="[
          store.activeCategoryId === null 
            ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20 -translate-y-0.5'
            : 'bg-surface-900 text-surface-50 border-surface-800 hover:border-surface-700 hover:shadow-md hover:-translate-y-0.5'
        ]"
        @click="store.setActiveCategory(null)"
      >
        <div class="text-xl mb-0.5">🔥</div>
        <span 
          class="text-sm font-black line-clamp-2 leading-tight transition-colors duration-300"
          :class="store.activeCategoryId === null ? 'text-white' : 'text-surface-50'"
        >
          ทั้งหมด (ขายดี)
        </span>
        <span 
          class="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider transition-all duration-300 border"
          :class="store.activeCategoryId === null 
            ? 'bg-white/20 text-white border-white/30' 
            : 'bg-surface-950/40 text-surface-500 border-surface-700/50'"
        >
          {{ store.products.length }} รายการ
        </span>
      </button>

      <button
        v-for="cat in store.displayedCategories"
        :key="cat.id"
        class="btn-touch relative group flex flex-col gap-1 rounded-2xl px-2 py-4 items-center text-center transition-all duration-300 border-2 shrink-0 active:scale-95 shadow-sm"
        :class="[
          store.activeCategoryId === cat.id 
            ? 'bg-primary-500 text-white border-primary-600 shadow-lg shadow-primary-500/20 -translate-y-0.5'
            : 'bg-surface-900 text-surface-50 border-surface-800 hover:border-surface-700 hover:shadow-md hover:-translate-y-0.5'
        ]"
        @click="store.setActiveCategory(cat.id!)"
      >
        <!-- จุดสีประจำหมวดหมู่ (แบบเดิม) -->
        <div 
          v-if="cat.color"
          class="w-3.5 h-3.5 rounded-full mb-1 border-2 border-white/20 shadow-sm"
          :style="{ backgroundColor: cat.color }"
        ></div>
        
        <span 
          class="text-sm font-black line-clamp-2 leading-tight transition-colors duration-300"
          :class="store.activeCategoryId === cat.id ? 'text-white' : 'text-surface-50'"
        >
          {{ cat.name }}
        </span>
        
        <!-- Pill Badge แสดงจำนวนสินค้า -->
        <span 
          class="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider transition-all duration-300 border"
          :class="store.activeCategoryId === cat.id 
            ? 'bg-white/20 text-white border-white/30' 
            : 'bg-surface-950/40 text-surface-500 border-surface-700/50'"
        >
          {{ store.categoryProductCounts[cat.id!] }} รายการ
        </span>

        <!-- ไอคอนบ่งบอกว่ามีหมวดหมู่ย่อย (Subcategory Indicator) -->
        <div 
          v-if="hasSubcategories(cat.id)"
          class="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-all duration-300"
          :class="store.activeCategoryId === cat.id ? 'text-white' : 'text-primary-500'"
        >
          <ChevronRight class="w-4 h-4 stroke-[3]" />
        </div>
      </button>
    </div>

    <!-- ปุ่มจัดการด้านล่างแบบซ่อน (Compact Menu) -->
    <div class="p-2 border-t border-surface-800 shrink-0 relative">
      <!-- Pop-over Menu Items -->
      <Transition 
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-4 opacity-0 scale-95"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100 scale-100"
        leave-to-class="translate-y-4 opacity-0 scale-95"
      >
        <div 
          v-if="showMenu" 
          class="absolute bottom-full left-2 right-2 mb-3 bg-surface-900/95 backdrop-blur-xl border border-surface-700/50 rounded-2xl shadow-2xl p-2 z-[60] flex flex-col gap-1 ring-1 ring-white/5"
        >
          <!-- ส่วนข้อมูลผู้ใช้ -->
          <div class="px-3 py-2.5 mb-1 border-b border-surface-800/50">
            <div class="text-[10px] text-surface-500 uppercase tracking-widest font-bold mb-0.5">ผู้ใช้งานปัจจุบัน</div>
            <div class="text-sm font-black text-primary-400 truncate">
              {{ authUser.currentUser?.displayName || authUser.currentUser?.username }}
            </div>
          </div>

          <NuxtLink
            v-if="authUser.isAdmin"
            to="/admin"
            @click="showMenu = false"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-all font-bold group"
          >
            <span class="text-xl group-hover:scale-110 transition-transform">⚙️</span>
            <span class="text-sm hidden md:block">จัดการระบบ (Admin)</span>
          </NuxtLink>

          <div class="h-px bg-surface-800/50 mx-2 my-1"></div>

          <!-- สลับธีม -->
          <button
            @click="toggleTheme"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all font-bold group"
          >
            <span class="text-xl group-hover:rotate-12 transition-transform">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
            <span class="text-sm hidden md:block">โหมด{{ theme === 'dark' ? 'สว่าง' : 'มืด' }}</span>
          </button>

          <!-- Logout -->
          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold group"
          >
            <LogOut class="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span class="text-sm hidden md:block">ออกจากระบบ</span>
          </button>
        </div>
      </Transition>

      <!-- Main Toggle Button -->
      <button 
        @click.stop="showMenu = !showMenu"
        class="w-full flex items-center justify-center gap-3 h-14 rounded-2xl transition-all font-black text-sm group relative overflow-hidden"
        :class="showMenu 
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
          : 'bg-surface-800 text-surface-400 hover:bg-surface-700'"
      >
        <Menu v-if="!showMenu" class="w-6 h-6 transition-transform group-hover:scale-110" />
        <X v-else class="w-6 h-6 transition-transform group-hover:rotate-90" />
        <span class="tracking-tight hidden md:block">{{ showMenu ? 'ปิดเมนู' : 'การจัดการ' }}</span>
        
        <!-- Subtle Glow for Active -->
        <div v-if="showMenu" class="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
      </button>
    </div>

    <!-- Modal ยืนยันการออกจากระบบ (สวยๆ) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showLogoutConfirm" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div v-if="showLogoutConfirm" class="bg-surface-900 border border-surface-800 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden p-8 flex flex-col items-center text-center">
              <!-- Icon Header -->
              <div class="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 animate-pulse">
                <LogOut :size="40" />
              </div>
              
              <h3 class="text-2xl font-black text-surface-50 mb-2">ยืนยันออกจากระบบ?</h3>
              <p class="text-surface-600 mb-8 leading-relaxed font-medium">คุณต้องการสลับผู้ใช้ หรือออกจากระบบการขายในขณะนี้ใช่หรือไม่?</p>
              
              <div class="flex flex-col w-full gap-3">
                <button 
                  @click="confirmLogout"
                  class="w-full h-14 bg-red-500 hover:bg-red-400 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-500/20"
                >
                  ใช่, ออกจากระบบ
                </button>
                <button 
                  @click="showLogoutConfirm = false"
                  class="w-full h-14 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-2xl transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { usePosStore } from '~/stores/pos'
import { useAuthStore } from '~/stores/auth'
import { useTheme } from '~/composables/useTheme'
import { LogOut, ChevronLeft, ChevronRight, Menu, X } from 'lucide-vue-next'

const store = usePosStore()
const authUser = useAuthStore()
const router = useRouter()
const { theme, toggleTheme } = useTheme()

const showMenu = ref(false)
const showLogoutConfirm = ref(false)

// ปิดเมนูเมื่อคลิกที่อื่น
if (process.client) {
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      showMenu.value = false
    }
  })
}

// ตรวจสอบว่าหมวดหมู่มีหมวดหมู่ย่อยหรือไม่
const hasSubcategories = (catId: number | undefined) => {
  if (!catId) return false
  return store.categories.some(c => c.parentId === catId)
}

function handleLogout() {
  showMenu.value = false
  showLogoutConfirm.value = true
}

function confirmLogout() {
  authUser.logout()
  router.push('/login')
  showLogoutConfirm.value = false
}
</script>
