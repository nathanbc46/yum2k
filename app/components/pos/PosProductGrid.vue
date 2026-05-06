<template>
  <div class="flex flex-col h-full">
    <!-- Header: แสดงหมวดหมู่ที่กำลังค้นหา หรือเลือกอยู่ -->
    <header class="flex items-center justify-between mb-4 shrink-0">
      <div>
        <!-- Breadcrumbs สื่อลำดับชั้น -->
        <div 
          v-if="store.categoryPath.length > 1" 
          class="flex items-center gap-1 text-[10px] text-surface-500 uppercase tracking-widest mb-1 italic font-bold"
        >
          <template v-for="(cat, idx) in store.categoryPath" :key="cat.id">
            <span :class="{ 'text-primary-500/80': idx < store.categoryPath.length - 1 }">
              {{ cat.name }}
            </span>
            <span v-if="idx < store.categoryPath.length - 1" class="opacity-30 mx-0.5">/</span>
          </template>
        </div>

        <h2 class="text-2xl font-bold text-surface-50">
          {{ store.activeCategory?.name ?? 'สินค้าทั้งหมด' }}
        </h2>
      </div>

      <div class="flex items-center gap-4">
        <div class="text-surface-400 text-sm font-black uppercase tracking-tighter bg-surface-900/50 px-4 py-2 rounded-2xl border border-surface-800/50 shadow-inner">
          {{ store.filteredProducts.length }} รายการ
        </div>

        <!-- ปุ่ม Reset กลับสู่หน้าหลัก (Root) -->
        <button 
          v-if="store.currentParentId || store.activeCategoryId"
          @click="store.resetNavigation()"
          class="w-12 h-12 flex items-center justify-center bg-surface-900 border border-surface-800 hover:border-primary-500/50 hover:bg-primary-500/10 text-surface-400 hover:text-primary-400 rounded-2xl transition-all active:scale-95 shadow-lg group/home"
          title="กลับไปหน้าหลัก"
        >
          <span class="text-2xl transition-transform group-hover/home:scale-110">🏠</span>
        </button>
      </div>
    </header>

    <!-- Content Switcher -->
    <div class="flex-1 overflow-hidden">
      <!-- 1. ปกติ: แสดงรายการสินค้า หรือ หมวดหมู่ -->
      <div v-if="store.selectedCartItemIndex === null" class="h-full flex flex-col">
        <div class="flex-1 overflow-y-auto scrollbar-thin pb-20 pr-2">
          <!-- Loading State -->
          <div v-if="store.isLoading" class="flex items-center justify-center h-full">
            <div class="animate-pulse text-surface-500">กำลังโหลดสินค้า...</div>
          </div>

          <!-- ยังไม่ได้เลือกหมวดหมู่ → แสดงการ์ดหมวดหมู่ + สินค้า Favorite -->
          <div v-else-if="!store.activeCategoryId" class="flex flex-col gap-6">
            <!-- หมวดหมู่ -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <button
                v-for="cat in store.displayedCategories"
                :key="cat.id"
                @click="store.setActiveCategory(cat.id!)"
                class="relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 h-[140px] transition-all hover:scale-[1.03] active:scale-95 text-center"
                :style="{
                  borderColor: (cat.color || '#6366f1') + '60',
                  backgroundColor: (cat.color || '#6366f1') + '18',
                }"
              >
                <div v-if="hasSubcategories(cat.id)" class="absolute top-2 right-2 text-primary-400 opacity-70">
                  <ChevronRight class="w-4 h-4 stroke-[3]" />
                </div>
                <div class="w-4 h-4 rounded-full shrink-0" :style="{ backgroundColor: cat.color || '#6366f1' }" />
                <div class="font-black text-surface-50 text-base leading-tight line-clamp-2">{{ cat.name }}</div>
                <div class="text-xs font-bold px-3 py-1 rounded-full" :style="{ color: cat.color || '#818cf8', backgroundColor: (cat.color || '#6366f1') + '25' }">
                  {{ store.categoryProductCounts[cat.id!] ?? 0 }} รายการ
                </div>
              </button>
            </div>

            <!-- สินค้า Favorite -->
            <div v-if="favoriteProducts.length > 0">
              <div class="flex items-center gap-2 mb-3">
                <Heart :size="16" fill="currentColor" class="text-red-500" />
                <span class="text-sm font-black text-surface-300 uppercase tracking-wider">สินค้าโปรด</span>
                <span class="text-xs text-surface-500 font-bold">({{ favoriteProducts.length }})</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <PosProductCard
                  v-for="product in favoriteProducts"
                  :key="product.id"
                  :product="product"
                  @add="handleAddProduct(product)"
                />
              </div>
            </div>
          </div>

          <!-- เลือกหมวดหมู่แล้ว → แสดงสินค้า -->
          <div v-else-if="store.filteredProducts.length === 0" class="flex flex-col items-center justify-center h-full text-surface-500 space-y-4">
            <span class="text-5xl opacity-40">🍽️</span>
            <p>ไม่พบสินค้าในหมวดหมู่นี้</p>
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <PosProductCard
              v-for="product in store.filteredProducts"
              :key="product.id"
              :product="product"
              @add="handleAddProduct(product)"
            />
          </div>
        </div>
      </div>

      <!-- 2. เมื่อมีการเลือกรายการในตะกร้า: แสดงพื้นที่เลือก Add-on แบบกึ่งกลาง (Compact Center) -->
      <div 
        v-else 
        class="h-full flex items-start justify-center p-6 bg-surface-950/40 backdrop-blur-[2px] animate-in fade-in duration-300 cursor-pointer"
        @click="store.setSelectedCartItemIndex(null)"
      >
        <!-- Tablet/Desktop: แสดงแบบ Inline -->
        <div class="hidden md:flex w-full h-fit max-w-6xl cursor-default" @click.stop>
          <PosAddonSelection is-inline />
        </div>

        <!-- Mobile: แสดงข้อความแจ้งเตือน (เพราะจะมี Modal ลอยทับ) -->
        <div class="md:hidden flex flex-col items-center gap-4 text-surface-400 mt-20">
          <div class="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center text-3xl animate-bounce">
            📋
          </div>
          <p class="font-bold">กำลังปรับแต่งรายการ...</p>
        </div>
      </div>
    </div>

    <!-- Add-on Selection Modal (สำหรับการเพิ่มสินค้าใหม่) -->
    <PosAddonModal
      :is-open="addonModalOpen"
      :product="pendingProduct"
      @cancel="addonModalOpen = false"
      @confirm="handleAddonConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { usePosStore } from '~/stores/pos'
import { useCart } from '~/composables/useCart'
import type { Product, AddonOption } from '~/types'
import PosAddonSelection from './PosAddonSelection.vue'
import { ChevronRight, Heart } from 'lucide-vue-next'
import { useFavorites } from '~/composables/useFavorites'

const store = usePosStore()
const { favoriteIds } = useFavorites()

const hasSubcategories = (catId: number | undefined) => {
  if (!catId) return false
  return store.categories.some(c => c.parentId === catId)
}

const favoriteProducts = computed(() =>
  store.products.filter(p => p.id != null && favoriteIds.value.has(p.id))
)

// ไม่ต้องเรียก loadData() ที่นี่ — index.vue จัดการโหลดข้อมูลแล้ว
// การเรียกที่นี่ทำให้เกิด mount→unmount loop (isLoading ทำให้ v-else ปิด → unmount → mount อีก)

const cart = useCart()

// --- จัดการ Add-on Modal ---
const addonModalOpen = ref(false)
const pendingProduct = ref<Product | null>(null)

/** เมื่อกดปุ่มเพิ่มสินค้า ตรวจว่ามี Add-ons หรือไม่ */
function handleAddProduct(product: Product) {
  const hasRequiredAddons = product.addonGroups?.some(g => g.isRequired)
  
  if (product.addonGroups && product.addonGroups.length > 0 && hasRequiredAddons) {
    // มี Add-ons ที่ "บังคับเลือก" → เปิด Modal ให้เลือก
    pendingProduct.value = product
    addonModalOpen.value = true
  } else {
    // ไม่มี Add-ons เลย หรือมีแต่ "ไม่บังคับ" → เพิ่มลงตะกร้าเลยแบบไม่มี Addon
    cart.addItem(product, 1)
  }
}

/** เมื่อผู้ใช้ยืนยัน Add-ons แล้ว */
function handleAddonConfirm(selectedAddons: AddonOption[], addonsTotal: number) {
  if (!pendingProduct.value) return
  cart.addItem(pendingProduct.value, 1, selectedAddons, addonsTotal)
  addonModalOpen.value = false
  pendingProduct.value = null
}
</script>
