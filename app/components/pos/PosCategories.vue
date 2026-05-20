<template>
  <div class="flex flex-col h-full py-2">

    <!-- ========== เมื่อยังไม่เลือกหมวดหมู่: แสดงรายการหมวดหมู่ (สไตล์การ์ด) ========== -->
    <template v-if="store.activeCategoryId === null">
      <div class="flex-1 flex flex-col gap-2 p-2 overflow-y-auto scrollbar-thin">
        <!-- การ์ดหมวดหมู่ -->
        <button
          v-for="cat in store.displayedCategories"
          :key="cat.id"
          class="btn-touch relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-1.5 h-[72px] transition-all hover:scale-[1.03] active:scale-95 text-center"
          :style="{
            borderColor: (cat.color || '#6366f1') + '60',
            backgroundColor: (cat.color || '#6366f1') + '18',
          }"
          @click="store.setActiveCategory(cat.id!)"
        >
          <div
            v-if="hasSubcategories(cat.id)"
            class="absolute top-1 right-1 opacity-60"
            :style="{ color: cat.color || '#818cf8' }"
          >
            <ChevronRight class="w-3 h-3 stroke-[3]" />
          </div>
          <div class="font-black text-surface-50 text-xs leading-tight line-clamp-2">{{ cat.name }}</div>
          <div class="text-[10px] font-bold px-2 py-0.5 rounded-full" :style="{ color: cat.color || '#818cf8', backgroundColor: (cat.color || '#6366f1') + '25' }">
            {{ store.categoryProductCounts[cat.id!] ?? 0 }}
          </div>
        </button>
      </div>

      <!-- ปุ่มจัดการด้านล่าง (toggle popover) -->
      <div class="p-2 border-t border-surface-800 shrink-0 relative pos-category-menu">
        <!-- ปุ่มโปรโมชันที่เปิดอยู่ -->
        <div v-if="displayedPromos.length > 0" class="mb-2 space-y-1.5">
          <button
            v-for="promo in displayedPromos"
            :key="promo.id"
            @click="handlePromoClick(promo)"
            class="w-full h-11 rounded-xl px-3 flex items-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]"
            :class="promo.type === 'birthday'
              ? 'bg-pink-100 dark:bg-pink-600/20 border border-pink-300 dark:border-pink-500/30 text-pink-700 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-600/30'
              : store.activePromotionFilter?.id === promo.id
                ? 'bg-amber-200 dark:bg-amber-500/30 border border-amber-400 dark:border-amber-400/60 text-amber-800 dark:text-amber-300'
                : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'"
          >
            <span class="shrink-0 text-base">{{ promoIcon(promo) }}</span>
            <span class="truncate flex-1 text-left text-xs">{{ promo.name }}</span>
            <span
              v-if="promo.type !== 'birthday' && store.activePromotionFilter?.id === promo.id"
              class="shrink-0 text-[9px] font-black bg-amber-400 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded-full"
            >ON</span>
          </button>
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-4 opacity-0 scale-95"
          enter-to-class="translate-y-0 opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100 scale-100"
          leave-to-class="translate-y-4 opacity-0 scale-95"
        >
          <div
            v-if="showMenuNoCategory"
            class="absolute bottom-full left-2 right-2 mb-3 bg-surface-900/95 backdrop-blur-xl border border-surface-700/50 rounded-2xl shadow-2xl p-2 z-[60] flex flex-col gap-1 ring-1 ring-white/5"
          >
            <div class="px-3 py-2.5 mb-1 border-b border-surface-800/50">
              <div class="text-[10px] text-surface-500 uppercase tracking-widest font-bold mb-0.5">ผู้ใช้งานปัจจุบัน</div>
              <div class="text-sm font-black text-primary-400 truncate">
                {{ authUser.currentUser?.displayName || authUser.currentUser?.username }}
              </div>
            </div>
            <NuxtLink
              to="/orders"
              @click="showMenuNoCategory = false"
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-all font-bold group"
            >
              <span class="text-xl group-hover:scale-110 transition-transform">📋</span>
              <span class="text-sm hidden md:block">ประวัติการขาย</span>
            </NuxtLink>
            <NuxtLink
              v-if="authUser.isAdmin"
              to="/admin"
              @click="showMenuNoCategory = false"
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-all font-bold group"
            >
              <span class="text-xl group-hover:scale-110 transition-transform">⚙️</span>
              <span class="text-sm hidden md:block">จัดการระบบ (Admin)</span>
            </NuxtLink>
            <div class="h-px bg-surface-800/50 mx-2 my-1" />
            <button
              @click="toggleTheme"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all font-bold group"
            >
              <span class="text-xl group-hover:rotate-12 transition-transform">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
              <span class="text-sm hidden md:block">โหมด{{ theme === 'dark' ? 'สว่าง' : 'มืด' }}</span>
            </button>
            <button
              @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold group"
            >
              <LogOut class="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span class="text-sm hidden md:block">ออกจากระบบ</span>
            </button>
          </div>
        </Transition>
        <button
          @click.stop="showMenuNoCategory = !showMenuNoCategory"
          class="w-full flex items-center justify-center gap-3 h-14 rounded-2xl transition-all font-black text-sm group relative overflow-hidden"
          :class="showMenuNoCategory
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
            : 'bg-surface-800 text-surface-400 hover:bg-surface-700'"
        >
          <Menu v-if="!showMenuNoCategory" class="w-6 h-6 transition-transform group-hover:scale-110" />
          <X v-else class="w-6 h-6 transition-transform group-hover:rotate-90" />
          <span class="tracking-tight hidden md:block">{{ showMenuNoCategory ? 'ปิดเมนู' : 'การจัดการ' }}</span>
          <div v-if="showMenuNoCategory" class="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        </button>
      </div>
    </template>

    <!-- ========== เมื่อเลือกหมวดหมู่แล้ว: แสดงรายการหมวดหมู่ + toggle menu ========== -->
    <template v-else>
      <div class="flex-1 flex flex-col gap-2 p-2 overflow-y-auto scrollbar-thin">
        <!-- ปุ่มย้อนกลับ -->
        <button
          v-if="store.currentParentId"
          class="btn-touch flex gap-2 rounded-xl p-2 items-center justify-center transition-colors border bg-surface-900 text-primary-400 border-primary-500/30 hover:bg-surface-800 active:scale-95 shrink-0"
          @click="store.goBack()"
        >
          <ChevronLeft class="w-4 h-4" />
          <span class="text-xs font-black">ย้อนกลับ</span>
        </button>

        <!-- การ์ดหมวดหมู่ (สไตล์เดียวกับฝั่ง no-category) -->
        <button
          v-for="cat in store.displayedCategories"
          :key="cat.id"
          class="btn-touch relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-1.5 h-[72px] transition-all hover:scale-[1.03] active:scale-95 text-center"
          :style="store.activeCategoryId === cat.id ? {
            borderColor: (cat.color || '#6366f1'),
            backgroundColor: (cat.color || '#6366f1'),
            boxShadow: `0 4px 16px ${(cat.color || '#6366f1')}55`,
          } : {
            borderColor: (cat.color || '#6366f1') + '60',
            backgroundColor: (cat.color || '#6366f1') + '18',
          }"
          @click="store.setActiveCategory(cat.id!)"
        >
          <div
            v-if="hasSubcategories(cat.id)"
            class="absolute top-1 right-1"
            :class="store.activeCategoryId === cat.id ? 'text-white/80' : 'opacity-60'"
            :style="store.activeCategoryId !== cat.id ? { color: cat.color || '#818cf8' } : {}"
          >
            <ChevronRight class="w-3 h-3 stroke-[3]" />
          </div>
          <div
            class="font-black text-xs leading-tight line-clamp-2 w-full text-center"
            :class="store.activeCategoryId === cat.id ? 'text-white' : 'text-surface-50'"
          >{{ cat.name }}</div>
          <div
            class="text-[10px] font-bold px-2 py-0.5 rounded-full"
            :class="store.activeCategoryId === cat.id ? 'bg-white/20 text-white' : ''"
            :style="store.activeCategoryId !== cat.id ? { color: cat.color || '#818cf8', backgroundColor: (cat.color || '#6366f1') + '25' } : {}"
          >
            {{ store.categoryProductCounts[cat.id!] ?? 0 }}
          </div>
        </button>
      </div>

      <!-- ปุ่มจัดการด้านล่าง (toggle popover) -->
      <div class="p-2 border-t border-surface-800 shrink-0 relative pos-category-menu">
        <!-- ปุ่มโปรโมชันที่เปิดอยู่ -->
        <div v-if="displayedPromos.length > 0" class="mb-2 space-y-1.5">
          <button
            v-for="promo in displayedPromos"
            :key="promo.id"
            @click="handlePromoClick(promo)"
            class="w-full h-11 rounded-xl px-3 flex items-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]"
            :class="promo.type === 'birthday'
              ? 'bg-pink-100 dark:bg-pink-600/20 border border-pink-300 dark:border-pink-500/30 text-pink-700 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-600/30'
              : store.activePromotionFilter?.id === promo.id
                ? 'bg-amber-200 dark:bg-amber-500/30 border border-amber-400 dark:border-amber-400/60 text-amber-800 dark:text-amber-300'
                : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'"
          >
            <span class="shrink-0 text-base">{{ promoIcon(promo) }}</span>
            <span class="truncate flex-1 text-left text-xs">{{ promo.name }}</span>
            <span
              v-if="promo.type !== 'birthday' && store.activePromotionFilter?.id === promo.id"
              class="shrink-0 text-[9px] font-black bg-amber-400 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded-full"
            >ON</span>
          </button>
        </div>

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
            <div class="px-3 py-2.5 mb-1 border-b border-surface-800/50">
              <div class="text-[10px] text-surface-500 uppercase tracking-widest font-bold mb-0.5">ผู้ใช้งานปัจจุบัน</div>
              <div class="text-sm font-black text-primary-400 truncate">
                {{ authUser.currentUser?.displayName || authUser.currentUser?.username }}
              </div>
            </div>

            <NuxtLink
              to="/orders"
              @click="showMenu = false"
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-all font-bold group"
            >
              <span class="text-xl group-hover:scale-110 transition-transform">📋</span>
              <span class="text-sm hidden md:block">ประวัติการขาย</span>
            </NuxtLink>
            <NuxtLink
              v-if="authUser.isAdmin"
              to="/admin"
              @click="showMenu = false"
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-surface-400 hover:text-surface-50 hover:bg-surface-800 transition-all font-bold group"
            >
              <span class="text-xl group-hover:scale-110 transition-transform">⚙️</span>
              <span class="text-sm hidden md:block">จัดการระบบ (Admin)</span>
            </NuxtLink>

            <div class="h-px bg-surface-800/50 mx-2 my-1" />

            <button
              @click="toggleTheme"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all font-bold group"
            >
              <span class="text-xl group-hover:rotate-12 transition-transform">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
              <span class="text-sm hidden md:block">โหมด{{ theme === 'dark' ? 'สว่าง' : 'มืด' }}</span>
            </button>

            <button
              @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold group"
            >
              <LogOut class="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span class="text-sm hidden md:block">ออกจากระบบ</span>
            </button>
          </div>
        </Transition>

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
          <div v-if="showMenu" class="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        </button>
      </div>
    </template>

    <!-- โปรวันเกิด Modal -->
    <PosBirthdayModal
      :is-open="showBirthdayModal"
      :birthday-promotions="displayedPromos.filter(p => p.type === 'birthday')"
      @close="showBirthdayModal = false"
      @confirm="handleFreeItemConfirm"
    />

    <!-- Modal ยืนยันออกจากระบบ -->
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
import { useCart } from '~/composables/useCart'
import { LogOut, ChevronLeft, ChevronRight, Menu, X } from 'lucide-vue-next'
import type { BirthdayConfig, ProductWithCategory, Promotion } from '~/types'

const store = usePosStore()
const authUser = useAuthStore()
const router = useRouter()
const { theme, toggleTheme } = useTheme()
const cart = useCart()

const showMenu = ref(false)
const showMenuNoCategory = ref(false)
const showLogoutConfirm = ref(false)
const showBirthdayModal = ref(false)

const displayedPromos = computed(() =>
  store.activePromotions.filter(p => {
    if (p.type === 'birthday') {
      const c = p.config as BirthdayConfig
      return (c.totalGiven || 0) < c.maxGiven
    }
    return true
  })
)

function handlePromoClick(promo: Promotion) {
  if (promo.type === 'birthday') {
    showBirthdayModal.value = true
  } else {
    const isSame = store.activePromotionFilter?.id === promo.id
    store.setPromotionFilter(isSame ? null : promo)
  }
}

function promoIcon(promo: Promotion) {
  return promo.type === 'birthday' ? '🎂' : '🎁'
}

async function handleFreeItemConfirm(items: Array<{ product: ProductWithCategory, qty: number, promotionId: number, promotionName: string }>) {
  for (const item of items) {
    await cart.addFreeItem(item.product, item.promotionId, item.promotionName, item.qty)
  }
  showBirthdayModal.value = false
}

if (process.client) {
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.pos-category-menu')) {
      showMenu.value = false
      showMenuNoCategory.value = false
    }
  })
}

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
