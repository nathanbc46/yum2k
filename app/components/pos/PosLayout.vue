<template>
  <div class="h-full w-full flex flex-col md:flex-row overflow-hidden bg-surface-950 text-surface-50">
    
    <!-- Mobile Tabs Navigation (Top) -->
    <!-- ref สำหรับวัดความสูง Tab Bar จริงเพื่อกำหนด top ของ Cart Panel (Mobile) -->
    <div ref="tabBarRef" class="md:hidden grid grid-cols-2 bg-surface-900 border-b border-surface-800 shrink-0 z-50">
      <button 
        @click="activeTab = 'grid'"
        class="flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all relative"
        :class="activeTab === 'grid' ? 'text-primary-400' : 'text-surface-500'"
      >
        <UtensilsCrossed :size="20" />
        <span>เมนูสินค้า</span>
        <div v-if="activeTab === 'grid'" class="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-t-full" />
      </button>
      <button 
        @click="activeTab = 'cart'"
        class="flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all relative"
        :class="activeTab === 'cart' ? 'text-primary-400' : 'text-surface-500'"
      >
        <div class="relative">
          <ShoppingCart :size="20" />
          <span v-if="cartCount > 0" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-surface-900 font-bold">
            {{ cartCount }}
          </span>
        </div>
        <span>ตะกร้า</span>
        <div v-if="activeTab === 'cart'" class="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-t-full" />
      </button>
    </div>

    <!-- Layout Container -->
    <div class="flex-1 flex overflow-hidden">
      <!-- ซ้ายมือ: ตะกร้า (Desktop: 30%, Mobile: Full/Hidden) -->
      <!-- ตะกร้า: Mobile → fixed full-screen (top ใช้ค่าจริงจาก tabBarRef ไม่ hardcode top-14) -->
      <aside 
        class="md:w-[30%] md:min-w-[320px] md:max-w-[400px] border-r border-surface-800 bg-surface-900 flex flex-col overflow-hidden transition-all"
        :class="[activeTab === 'cart' ? 'fixed inset-x-0 bottom-0 z-40 md:relative md:inset-auto md:top-auto md:bottom-auto' : 'hidden md:flex']"
        :style="activeTab === 'cart' ? { top: tabBarBottomPx } : {}"
      >
        <slot name="cart" :active-tab="activeTab" :close-mobile="() => activeTab = 'grid'" />
      </aside>

      <!-- ตรงกลาง: กริดสินค้า (Desktop: 55%, Mobile: Full/Hidden) -->
      <main 
        class="flex-1 flex flex-col bg-surface-950 px-2 sm:px-4 py-2 sm:py-4 overflow-hidden relative"
        :class="{ 'hidden md:flex': activeTab === 'cart' }"
      >
        <slot name="grid" />
      </main>

      <!-- ขวามือ: หมวดหมู่ + เมนูการจัดการ -->
      <!-- overflow-hidden แทน overflow-y-auto เพื่อป้องกัน hamburger scroll หายออกนอก view -->
      <!-- (การ scroll ของ category list จัดการใน PosCategories.vue แทน) -->
      <aside
        class="w-[90px] sm:w-[110px] md:w-[15%] md:min-w-[120px] md:max-w-[180px] border-l border-surface-800 bg-surface-900 flex flex-col min-h-0 overflow-hidden"
        :class="{ 'hidden md:flex': activeTab === 'cart' }"
      >
        <slot name="categories" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UtensilsCrossed, ShoppingCart } from 'lucide-vue-next'
import { useCart } from '~/composables/useCart'
import { usePosStore } from '~/stores/pos'

const { totalItems: cartCount } = useCart()
const posStore = usePosStore()

const activeTab = ref<'grid' | 'cart'>('grid')

// --- Dynamic Top สำหรับ Cart Panel บน Mobile ---
// วัดตำแหน่งจริงของ Tab Bar (ซึ่งอาจเปลี่ยนเมื่อ Banner ด้านบนปรากฏ/หาย)
const tabBarRef = useTemplateRef<HTMLElement>('tabBarRef')
const tabBarBottomPx = ref('56px') // fallback = top-14

onMounted(() => {
  const updateTabBarBottom = () => {
    const rect = tabBarRef.value?.getBoundingClientRect()
    if (rect) tabBarBottomPx.value = rect.bottom + 'px'
  }
  updateTabBarBottom()
  // ติดตามเมื่อ viewport หรือ Banner ด้านบนเปลี่ยนขนาด
  const ro = new ResizeObserver(updateTabBarBottom)
  ro.observe(document.documentElement)
  onUnmounted(() => ro.disconnect())
})

// อัตโนมัติสลับไปหน้าตะกร้าถ้ามีการกดสั่งบนมือถือ (Optional)
// watch(cartCount, (newVal, oldVal) => {
//   if (newVal > oldVal && window.innerWidth < 768) {
//     activeTab.value = 'cart'
//   }
// })
</script>
