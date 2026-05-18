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
        :disabled="!isOnline"
        class="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-900/20"
        :title="isOnline ? '' : 'ต้องใช้อินเทอร์เน็ต'"
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
      <div v-else-if="categories.length === 0" class="flex flex-col items-center justify-center py-20 gap-5">
        <span class="text-6xl opacity-20">🗂️</span>
        <div class="text-center">
          <p class="text-surface-300 font-semibold">ยังไม่มีข้อมูลหมวดหมู่ในเครื่อง</p>
          <p class="text-surface-500 text-sm mt-1">ดึงข้อมูลจาก Cloud หรือสร้างหมวดหมู่ใหม่ด้วยตนเอง</p>
        </div>
        <button
          @click="pullFromCloud"
          :disabled="!isOnline || isSyncingMaster"
          class="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all active:scale-95"
        >
          <span v-if="isSyncingMaster" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>{{ isSyncingMaster ? 'กำลัง Pull...' : '☁️ Pull ข้อมูลจาก Cloud' }}</span>
        </button>
        <p v-if="!isOnline" class="text-surface-600 text-xs">ต้องเชื่อมต่ออินเทอร์เน็ตก่อน</p>
      </div>

      <!-- Table -->
      <div v-else class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="bg-surface-950 text-surface-500 text-[10px] uppercase tracking-widest border-b border-surface-800">
              <tr>
                <th class="px-6 py-4 w-12 text-center"></th>
                <th class="px-6 py-4">ลำดับ</th>
                <th class="px-6 py-4">ชื่อหมวดหมู่</th>
                <th class="px-6 py-4">หมวดหมู่หลัก</th>
                <th class="px-6 py-4">คำอธิบาย</th>
                <th class="px-6 py-4">ตัวเลือกเสริม</th>
                <th class="px-6 py-4 text-center">สถานะ</th>
                <th class="px-6 py-4 text-right">คำสั่ง</th>
              </tr>
            </thead>
            <draggable
              v-model="categories"
              tag="tbody"
              item-key="id"
              handle=".drag-handle"
              class="divide-y divide-surface-800"
              @end="onDragEnd"
            >
              <template #item="{ element: cat }">
                <tr
                  class="hover:bg-surface-800/40 transition-colors"
                  :class="{ 'opacity-50': !cat.isActive }"
                >
                  <!-- Drag Handle -->
                  <td class="px-4 py-4 text-center w-12">
                    <button class="drag-handle cursor-grab active:cursor-grabbing text-surface-600 hover:text-surface-300 transition-colors p-1">
                      ⠿
                    </button>
                  </td>
                  
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
  
                  <td class="px-6 py-4">
                    <div v-if="cat.parentId" class="flex flex-col gap-0.5">
                      <span class="text-[10px] text-surface-500 uppercase tracking-wider">ภายใต้</span>
                      <span class="text-primary-400 font-semibold text-xs transition-colors">
                        {{ getParentName(cat.parentId) }}
                      </span>
                    </div>
                    <span v-else class="text-surface-700 text-[10px] font-mono italic">ระดับสูงสุด</span>
                  </td>
  
                  <!-- คำอธิบาย -->
                  <td class="px-6 py-4 text-surface-400 text-xs">{{ cat.description ?? '—' }}</td>

                  <!-- ตัวเลือกเสริมประจำหมวดหมู่ -->
                  <td class="px-6 py-4">
                    <div v-if="cat.addonGroups && cat.addonGroups.length > 0" class="flex flex-wrap gap-1">
                      <span
                        v-for="group in cat.addonGroups"
                        :key="group.id"
                        class="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-800 border border-surface-700 rounded-md text-[10px] text-surface-300 font-medium"
                      >
                        {{ group.name }}
                        <span v-if="group.isRequired" class="text-primary-400 font-bold">*</span>
                      </span>
                    </div>
                    <span v-else class="text-surface-700 text-xs">—</span>
                  </td>

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
              </template>
            </draggable>
          </table>
        </div>
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
import draggable from 'vuedraggable'
import { useCategories } from '~/composables/useCategories'
import { useMasterDataSync } from '~/composables/useMasterDataSync'
import { useToast } from '~/composables/useToast'
import { useSync } from '~/composables/useSync'
import { useConfirm } from '~/composables/useConfirm'
import type { Category } from '~/types'

definePageMeta({ layout: 'admin' })

const { fetchAll, toggleCategoryActive, deleteCategory, reorderCategories } = useCategories()
const { lastPullTimestamp, pullAll, isSyncingMaster } = useMasterDataSync()
const { isOnline } = useSync()
const toast = useToast()
const { confirm } = useConfirm()

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

async function pullFromCloud() {
  try {
    const result = await pullAll(true)
    await loadData()
    toast.success(`ดึงข้อมูลสำเร็จ: ${result.categories} หมวดหมู่, ${result.products} สินค้า`)
  } catch (err: any) {
    toast.error(err?.message ?? 'ดึงข้อมูลจาก Cloud ไม่สำเร็จ')
  }
}

function getParentName(parentId: number): string {
  const parent = categories.value.find(c => c.id === parentId)
  return parent ? parent.name : 'ไม่พบหมวดหมู่'
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
  toast.success('บันทึกข้อมูลหมวดหมู่สำเร็จ')
}

// Auto-refresh เมื่อมีการ Pull ข้อมูลจาก Cloud สำเร็จ
watch(lastPullTimestamp, () => {
  console.log('🔄 Detect Cloud Pull: Refreshing Categories...')
  loadData()
})

async function handleToggle(cat: Category) {
  await toggleCategoryActive(cat.id!)
  await loadData()
}

async function handleDelete(cat: Category) {
  try {
    const confirmed = await confirm({
      title: 'ยืนยันการลบหมวดหมู่',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat.name}"?\n(สินค้าในหมวดหมู่นี้จะยังคงอยู่ แต่หมวดหมู่จะถูกซ่อนออกจากระบบ)`,
      confirmText: 'ลบหมวดหมู่',
      type: 'danger'
    })
    if (!confirmed) return

    if (!cat.id) {
      toast.error('ไม่พบ ID ของหมวดหมู่ ไม่สามารถลบได้')
      return
    }

    await deleteCategory(cat.id)
    await loadData()
    // alert('✅ ลบหมวดหมู่สำเร็จ')
  } catch (err) {
    console.error('Delete category error:', err)
    toast.error('เกิดข้อผิดพลาดในการลบ: ' + (err as Error).message)
  }
}

async function onDragEnd() {
  try {
    isLoading.value = true
    await reorderCategories(categories.value)
    await loadData() // โหลดใหม่เพื่อให้ลำดับ sortOrder แสดงผลถูกต้อง
    toast.success('เรียงลำดับหมวดหมู่สำเร็จ')
  } catch (err: any) {
    toast.error('เกิดข้อผิดพลาดในการเรียงลำดับ')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
</script>
