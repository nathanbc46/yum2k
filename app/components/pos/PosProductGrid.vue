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

      <div class="text-surface-400 text-sm font-medium">
        {{ store.filteredProducts.length }} รายการ
      </div>
    </header>

    <!-- Content Switcher -->
    <div class="flex-1 overflow-hidden">
      <!-- 1. ปกติ: แสดงรายการสินค้า Grid -->
      <div v-if="store.selectedCartItemIndex === null" class="h-full flex flex-col">
        <div class="flex-1 overflow-y-auto scrollbar-thin pb-20 pr-2">
          <!-- Loading State -->
          <div v-if="store.isLoading" class="flex items-center justify-center h-full">
            <div class="animate-pulse text-surface-500">กำลังโหลดสินค้า...</div>
          </div>
          
          <!-- Empty State -->
          <div v-else-if="store.filteredProducts.length === 0" class="flex flex-col items-center justify-center h-full text-surface-500 space-y-4">
            <span class="text-5xl opacity-40">🍽️</span>
            <p>ไม่พบสินค้าในหมวดหมู่นี้</p>
          </div>

          <!-- สินค้า Grid -->
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
      <div v-else class="h-full flex items-center justify-center p-6 bg-surface-950/40 backdrop-blur-[2px] animate-in fade-in duration-300">
        <div class="w-full max-w-6xl">
          <PosAddonSelection />
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

const store = usePosStore()

// โหลดข้อมูลเมื่อ Component Mount เริ่มทำงาน
onMounted(() => {
  store.loadData()
})

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
