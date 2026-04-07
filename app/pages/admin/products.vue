<template>
  <div class="flex flex-col h-full bg-surface-950 text-surface-50 min-h-0 overflow-hidden">

    <!-- Page Header -->
    <header class="px-6 py-5 border-b border-surface-800 shrink-0 bg-surface-900/50">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">📦 จัดการสินค้า</h1>
          <p class="text-xs text-surface-500 mt-0.5">{{ products.length }} รายการ</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="toggleTrashMode"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border shrink-0"
            :class="showTrash 
              ? 'bg-surface-800 text-surface-50 border-surface-700 hover:bg-surface-700' 
              : 'bg-surface-900 text-surface-500 border-surface-800 hover:text-surface-300 hover:border-surface-700'"
          >
            <span>{{ showTrash ? '⬅️ กลับหน้าปกติ' : '🗑️ ดูถังขยะ' }}</span>
          </button>
          
          <button
            v-if="!showTrash"
            @click="openCreateModal"
            class="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-900/20"
          >
            <span>+</span>
            เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-3 mt-4 flex-wrap">
        <!-- Search -->
        <div class="relative flex-1 min-w-48">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาสินค้า..."
            class="w-full bg-surface-800 border border-surface-700 text-surface-50 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-primary-500 outline-none transition-all placeholder:text-surface-500"
          />
        </div>

        <!-- Category Filter -->
        <select
          v-model.number="filterCategoryId"
          class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all"
        >
          <option :value="null">หมวดหมู่: ทั้งหมด</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>

        <!-- Mapping Type Filter -->
        <select
          v-model="filterMappingType"
          class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all"
        >
          <option value="">ประเภท: ทั้งหมด</option>
          <option value="normal">🟢 ปกติ</option>
          <option value="promotion">🟡 Promotion</option>
          <option value="bundle">🔵 Bundle</option>
        </select>

        <!-- Active Filter -->
        <select
          v-model="filterActive"
          class="bg-surface-800 border border-surface-700 text-surface-50 rounded-xl px-3 py-2 text-sm focus:border-primary-500 outline-none transition-all"
        >
          <option value="">สถานะ: ทั้งหมด</option>
          <option value="active">เปิดขาย</option>
          <option value="inactive">ซ่อนอยู่</option>
        </select>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 overflow-auto p-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center py-20 text-surface-500 gap-4">
        <span class="text-5xl opacity-30">📦</span>
        <p>ไม่พบสินค้าที่ตรงกับเงื่อนไข</p>
        <button @click="clearFilters" class="text-primary-400 hover:underline text-sm">ล้าง Filter</button>
      </div>

      <!-- Table -->
      <div v-else class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-2xl">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="bg-surface-950 text-surface-500 text-[10px] uppercase tracking-widest border-b border-surface-800">
            <tr>
              <th class="px-6 py-4">สินค้า</th>
              <th class="px-6 py-4">หมวดหมู่</th>
              <th class="px-6 py-4 text-center">ประเภท</th>
              <th class="px-6 py-4 text-right">ราคาขาย</th>
              <th class="px-6 py-4 text-center">สต็อก</th>
              <th class="px-6 py-4 text-center">สถานะ</th>
              <th class="px-6 py-4 text-right">คำสั่ง</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800">
            <tr
              v-for="product in filteredProducts"
              :key="product.id"
              class="hover:bg-surface-800/40 transition-colors"
              :class="{ 'opacity-50': !product.isActive }"
            >
              <!-- ชื่อ + SKU -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <!-- Thumbnail ขนาดเล็ก (ถ้ามีรูป) -->
                  <div class="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 overflow-hidden shrink-0 flex items-center justify-center">
                    <img v-if="product.imageUrl" :src="product.imageUrl" class="w-full h-full object-cover" />
                    <span v-else class="text-lg opacity-20">🍋</span>
                  </div>
                  
                  <div>
                    <div class="flex items-center gap-2">
                      <div class="font-semibold text-surface-50">{{ product.name }}</div>
                      <!-- Badges/Icons บอกสถานะ -->
                      <div class="flex items-center gap-1">
                        <span v-if="product.imageUrl" class="text-[10px]" title="มีรูปภาพ">🖼️</span>
                        <span v-if="product.addonGroups?.length" class="text-[10px]" title="มี Add-ons">➕</span>
                      </div>
                    </div>
                    <div v-if="product.sku" class="text-[10px] text-surface-500 font-mono mt-0.5">{{ product.sku }}</div>
                  </div>
                </div>
              </td>

              <!-- หมวดหมู่ -->
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  :style="{
                    backgroundColor: (getCategoryColor(product.categoryId) + '20'),
                    color: getCategoryColor(product.categoryId),
                    borderColor: getCategoryColor(product.categoryId) + '40',
                    border: '1px solid'
                  }"
                >
                  {{ getCategoryName(product.categoryId) }}
                </span>
              </td>

              <!-- ประเภท Mapping -->
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                  :class="mappingBadgeClass(product.mappingType)"
                >
                  {{ mappingBadgeLabel(product.mappingType) }}
                </span>
              </td>

              <!-- ราคา -->
              <td class="px-6 py-4 text-right">
                <div class="font-bold text-primary-400">฿{{ product.salePrice.toLocaleString() }}</div>
                <div class="text-[10px] text-surface-500">ต้นทุน ฿{{ product.costPrice.toLocaleString() }}</div>
              </td>

              <!-- สต็อก -->
              <td class="px-6 py-4 text-center">
                <template v-if="product.trackInventory">
                  <div
                    class="font-bold text-lg"
                    :class="product.stockQuantity <= product.alertThreshold ? 'text-amber-400' : 'text-surface-50'"
                  >
                    {{ product.stockQuantity }}
                  </div>
                  <!-- Progress Bar -->
                  <div class="w-full bg-surface-800 rounded-full h-1.5 mt-1 max-w-[60px] mx-auto">
                    <div
                      class="h-1.5 rounded-full transition-all"
                      :class="product.stockQuantity <= product.alertThreshold ? 'bg-amber-400' : 'bg-primary-500'"
                      :style="{ width: `${Math.min(100, (product.stockQuantity / Math.max(product.stockQuantity, product.alertThreshold * 3)) * 100)}%` }"
                    />
                  </div>
                  <!-- Low Stock Badge -->
                  <div
                    v-if="product.stockQuantity <= product.alertThreshold"
                    class="text-[9px] text-amber-400 mt-0.5 font-bold"
                  >
                    ⚠️ ใกล้หมด
                  </div>
                </template>
                <span v-else class="text-[10px] text-surface-500">ไม่ Track</span>
              </td>

              <!-- สถานะ -->
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  :class="product.isActive
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-surface-700/50 text-surface-500 border-surface-700'"
                >
                  {{ product.isActive ? 'เปิดขาย' : 'ซ่อน' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <!-- โหมดปกติ -->
                  <template v-if="!showTrash">
                    <button
                      v-if="product.trackInventory"
                      @click="openAdjustModal(product)"
                      class="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg text-xs font-bold transition-all border border-surface-700"
                      title="ปรับสต็อก"
                    >
                      📦 สต็อก
                    </button>
                    <button
                      @click="openEditModal(product)"
                      class="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg text-xs font-bold transition-all border border-surface-700"
                    >
                      แก้ไข
                    </button>
                    <button
                      @click="handleToggle(product)"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                      :class="product.isActive
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-success/10 text-success border-success/20 hover:bg-success/20'"
                    >
                      {{ product.isActive ? 'ซ่อน' : 'แสดง' }}
                    </button>
                    <button
                      @click="handleDelete(product)"
                      class="px-3 py-1.5 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg text-xs font-bold transition-all border border-danger/20"
                    >
                      ลบ
                    </button>
                  </template>

                  <!-- โหมดถังขยะ -->
                  <template v-else>
                    <button
                      @click="handleRestore(product)"
                      class="px-4 py-1.5 bg-success/10 text-success hover:bg-success hover:text-white rounded-lg text-xs font-bold transition-all border border-success/20"
                    >
                      ✨ กู้คืนสินค้า
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Modals -->
    <AdminProductFormModal
      :is-open="isProductModalOpen"
      :categories="categories"
      :edit-item="selectedProduct"
      @close="closeProductModal"
      @saved="handleSaved"
    />

    <AdminStockAdjustModal
      :is-open="isAdjustModalOpen"
      :product="selectedProduct"
      @close="isAdjustModalOpen = false"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import { useProducts } from '~/composables/useProducts'
import { useCategories } from '~/composables/useCategories'
import type { Product, Category, InventoryMappingType } from '~/types'

definePageMeta({ layout: 'admin' })

const { fetchAll: fetchProducts, toggleProductActive, deleteProduct, restoreProduct } = useProducts()
const { fetchAll: fetchCategories } = useCategories()

// --- State ---
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const isLoading = ref(true)
const showTrash = ref(false)

// filters
const searchQuery = ref('')
const filterCategoryId = ref<number | null>(null)
const filterMappingType = ref<string>('')
const filterActive = ref<string>('')

// modal state
const isProductModalOpen = ref(false)
const isAdjustModalOpen = ref(false)
const selectedProduct = ref<Product | null>(null)

// --- Computed: Filtered Products ---
const filteredProducts = computed(() => {
  return products.value.filter(p => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q)) return false
    }
    if (filterCategoryId.value && p.categoryId !== filterCategoryId.value) return false
    if (filterMappingType.value === 'normal' && p.mappingType) return false
    if (filterMappingType.value === 'promotion' && p.mappingType !== 'promotion') return false
    if (filterMappingType.value === 'bundle' && p.mappingType !== 'bundle') return false
    if (filterActive.value === 'active' && !p.isActive) return false
    if (filterActive.value === 'inactive' && p.isActive) return false
    return true
  })
})

// --- Helpers ---
function getCategoryName(categoryId: number): string {
  return categories.value.find(c => c.id === categoryId)?.name ?? '—'
}

function getCategoryColor(categoryId: number): string {
  return categories.value.find(c => c.id === categoryId)?.color ?? '#6366f1'
}

function mappingBadgeClass(mappingType?: InventoryMappingType): string {
  if (!mappingType) return 'bg-success/10 text-success border-success/20'
  if (mappingType === 'promotion') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  if (mappingType === 'bundle') return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  return 'bg-surface-700/50 text-surface-400 border-surface-700'
}

function mappingBadgeLabel(mappingType?: InventoryMappingType): string {
  if (!mappingType) return '🟢 ปกติ'
  if (mappingType === 'promotion') return '🟡 Promo'
  if (mappingType === 'bundle') return '🔵 Bundle'
  return mappingType
}

function clearFilters() {
  searchQuery.value = ''
  filterCategoryId.value = null
  filterMappingType.value = ''
  filterActive.value = ''
}

// --- Data Loading ---
async function loadData() {
  isLoading.value = true
  try {
    ;[products.value, categories.value] = await Promise.all([
      fetchProducts(undefined, showTrash.value),
      fetchCategories(),
    ])
  } finally {
    isLoading.value = false
  }
}

// --- Modal Handlers ---
function openCreateModal() {
  selectedProduct.value = null
  isProductModalOpen.value = true
}

function openEditModal(product: Product) {
  selectedProduct.value = product
  isProductModalOpen.value = true
}

function openAdjustModal(product: Product) {
  selectedProduct.value = product
  isAdjustModalOpen.value = true
}

function closeProductModal() {
  isProductModalOpen.value = false
  selectedProduct.value = null
}

async function handleSaved() {
  await loadData()
}

async function handleToggle(product: Product) {
  await toggleProductActive(product.id!)
  await loadData()
}

async function handleDelete(product: Product) {
  const confirmed = window.confirm(`ลบสินค้า "${product.name}" ?\n(สินค้าจะถูกซ่อนออกจากระบบทั้งหมด)`)
  if (!confirmed) return
  await deleteProduct(product.id!)
  await loadData()
}

async function handleRestore(product: Product) {
  await restoreProduct(product.id!)
  await loadData()
}

function toggleTrashMode() {
  showTrash.value = !showTrash.value
  loadData()
}

onMounted(loadData)
</script>
