<template>
  <div class="flex flex-col h-full bg-surface-950 text-surface-50 min-h-0 overflow-hidden">
    <!-- Page Header -->
    <header class="px-6 py-5 border-b border-surface-800 shrink-0 flex items-center justify-between bg-surface-900/50">
      <div>
        <h1 class="text-xl font-bold">🗂️ จัดการหมวดหมู่สินค้า</h1>
        <p class="text-xs text-surface-500 mt-0.5">{{ categories.length }} หมวดหมู่ทั้งหมด</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-900/20"
      >
        <span>+</span>
        เพิ่มหมวดหมู่
      </button>
    </header>

    <!-- Content -->
    <main class="flex-1 overflow-auto p-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="categories.length === 0" class="flex flex-col items-center justify-center py-20 text-surface-500 gap-4">
        <span class="text-5xl opacity-30">🗂️</span>
        <p>ยังไม่มีหมวดหมู่ กดปุ่ม "เพิ่มหมวดหมู่" เพื่อเริ่มต้น</p>
      </div>

      <!-- Table -->
      <div v-else class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-2xl">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="bg-surface-950 text-surface-500 text-[10px] uppercase tracking-widest border-b border-surface-800">
            <tr>
              <th class="px-6 py-4">ลำดับ</th>
              <th class="px-6 py-4">ชื่อหมวดหมู่</th>
              <th class="px-6 py-4">คำอธิบาย</th>
              <th class="px-6 py-4 text-center">สถานะ</th>
              <th class="px-6 py-4 text-right">คำสั่ง</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800">
            <tr
              v-for="cat in categories"
              :key="cat.id"
              class="hover:bg-surface-800/40 transition-colors"
              :class="{ 'opacity-50': !cat.isActive }"
            >
              <!-- ลำดับ -->
              <td class="px-6 py-4 font-mono text-surface-400 text-xs w-16">{{ cat.sortOrder }}</td>

              <!-- ชื่อ + สี -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: cat.color ?? '#6366f1' }"
                  />
                  <span class="font-semibold text-surface-50">{{ cat.name }}</span>
                </div>
              </td>

              <!-- คำอธิบาย -->
              <td class="px-6 py-4 text-surface-400 text-xs">{{ cat.description ?? '—' }}</td>

              <!-- สถานะ -->
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  :class="cat.isActive
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-surface-700/50 text-surface-500 border border-surface-700'"
                >
                  {{ cat.isActive ? 'เปิดใช้งาน' : 'ซ่อนอยู่' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    @click="openEditModal(cat)"
                    class="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg text-xs font-bold transition-all border border-surface-700"
                  >
                    แก้ไข
                  </button>
                  <button
                    @click="handleToggle(cat)"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                    :class="cat.isActive
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-success/10 text-success border-success/20 hover:bg-success/20'"
                  >
                    {{ cat.isActive ? 'ซ่อน' : 'แสดง' }}
                  </button>
                  <button
                    @click="handleDelete(cat)"
                    class="px-3 py-1.5 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg text-xs font-bold transition-all border border-danger/20"
                  >
                    ลบ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Modal -->
    <AdminCategoryFormModal
      :is-open="isModalOpen"
      :edit-item="selectedCategory"
      @close="closeModal"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { useCategories } from '~/composables/useCategories'
import type { Category } from '~/types'

definePageMeta({ layout: 'admin' })

const { fetchAll, toggleCategoryActive, deleteCategory } = useCategories()

const categories = ref<Category[]>([])
const isLoading = ref(true)
const isModalOpen = ref(false)
const selectedCategory = ref<Category | null>(null)

async function loadData() {
  isLoading.value = true
  try {
    categories.value = await fetchAll()
  } finally {
    isLoading.value = false
  }
}

function openCreateModal() {
  selectedCategory.value = null
  isModalOpen.value = true
}

function openEditModal(cat: Category) {
  selectedCategory.value = cat
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedCategory.value = null
}

async function handleSaved() {
  await loadData()
}

async function handleToggle(cat: Category) {
  await toggleCategoryActive(cat.id!)
  await loadData()
}

async function handleDelete(cat: Category) {
  try {
    const confirmed = window.confirm(
      `ลบหมวดหมู่ "${cat.name}" ?\n(สินค้าในหมวดหมู่นี้จะยังคงอยู่ แต่หมวดหมู่จะถูกซ่อน)`
    )
    if (!confirmed) return

    if (!cat.id) {
      alert('❌ ไม่พบ ID ของหมวดหมู่ ไม่สามารถลบได้')
      return
    }

    await deleteCategory(cat.id)
    await loadData()
    // alert('✅ ลบหมวดหมู่สำเร็จ')
  } catch (err) {
    console.error('Delete category error:', err)
    alert('❌ เกิดข้อผิดพลาดในการลบ: ' + (err as Error).message)
  }
}

onMounted(loadData)
</script>
