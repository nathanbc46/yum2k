<template>
  <div class="flex flex-col h-full">
    <!-- Header: แสดงหมวดหมู่ที่กำลังค้นหา หรือเลือกอยู่ -->
    <header class="flex items-center justify-between mb-4 shrink-0">
      <h2 class="text-2xl font-bold text-surface-50">
        {{ store.activeCategory?.name ?? 'สินค้าทั้งหมด' }}
      </h2>
      <div class="text-surface-400 text-sm">
        {{ store.filteredProducts.length }} รายการ
      </div>
    </header>

    <!-- Grid สินค้า -->
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

    <!-- Add-on Selection Modal -->
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
