<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 px-6 py-4 border-b border-surface-800 bg-surface-900 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-black text-surface-50">จัดการโปรโมชัน</h1>
        <p class="text-sm text-surface-500 mt-0.5">กำหนดโปรโมชันสำหรับร้านค้า</p>
      </div>
      <button
        @click="openCreateModal"
        class="h-11 px-5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-primary-900/30"
      >
        <Plus :size="18" />
        <span>เพิ่มโปรโมชัน</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-16 text-surface-500">
        <span class="animate-spin mr-2">⏳</span> กำลังโหลด...
      </div>

      <!-- Empty -->
      <div v-else-if="promotions.length === 0" class="flex flex-col items-center justify-center py-16 text-surface-500 gap-3">
        <span class="text-5xl">🎁</span>
        <p class="text-lg font-semibold">ยังไม่มีโปรโมชัน</p>
        <p class="text-sm">กดปุ่ม "เพิ่มโปรโมชัน" เพื่อสร้างโปรโมชันแรก</p>
      </div>

      <!-- Table -->
      <div v-else class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-surface-800 text-left">
              <th class="px-5 py-3.5 text-xs font-bold text-surface-400 uppercase tracking-wider">ชื่อโปรโมชัน</th>
              <th class="px-5 py-3.5 text-xs font-bold text-surface-400 uppercase tracking-wider">ประเภท</th>
              <th class="px-5 py-3.5 text-xs font-bold text-surface-400 uppercase tracking-wider">สินค้าในโปร</th>
              <th class="px-5 py-3.5 text-xs font-bold text-surface-400 uppercase tracking-wider">รายละเอียด</th>
              <th class="px-5 py-3.5 text-xs font-bold text-surface-400 uppercase tracking-wider">สถานะ</th>
              <th class="px-5 py-3.5 text-xs font-bold text-surface-400 uppercase tracking-wider text-right">คำสั่ง</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="promo in promotions"
              :key="promo.id"
              class="border-b border-surface-800/50 last:border-0 hover:bg-surface-800/30 transition-colors"
            >
              <!-- ชื่อ -->
              <td class="px-5 py-4">
                <div class="font-semibold text-surface-100">{{ promo.name }}</div>
              </td>

              <!-- ประเภท -->
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  :class="promo.type === 'buyXGetY'
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'bg-pink-600/20 text-pink-400'"
                >
                  {{ promo.type === 'buyXGetY' ? '🛒 ซื้อ X แถม Y' : '🎂 วันเกิด' }}
                </span>
              </td>

              <!-- จำนวนสินค้า -->
              <td class="px-5 py-4">
                <span class="text-surface-300 text-sm">{{ promo.eligibleProductIds.length }} รายการ</span>
              </td>

              <!-- รายละเอียด config -->
              <td class="px-5 py-4">
                <div v-if="promo.type === 'buyXGetY'" class="text-sm text-surface-300">
                  ซื้อ {{ (promo.config as BuyXGetYConfig).buyQty }} แถม {{ (promo.config as BuyXGetYConfig).freeQty }} ชิ้น
                </div>
                <div v-else class="text-sm text-surface-300">
                  แจก {{ (promo.config as BirthdayConfig).freeQty }} ชิ้น/ครั้ง •
                  ใช้ไป {{ (promo.config as BirthdayConfig).totalGiven || 0 }}/{{ (promo.config as BirthdayConfig).maxGiven }}
                  <div v-if="(promo.config as BirthdayConfig).totalGiven >= (promo.config as BirthdayConfig).maxGiven" class="text-red-400 text-xs mt-0.5">
                    แจกหมดแล้ว
                  </div>
                </div>
              </td>

              <!-- สถานะ -->
              <td class="px-5 py-4">
                <button
                  @click="handleToggleActive(promo)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                  :class="promo.isActive
                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                    : 'bg-surface-700 text-surface-500 hover:bg-surface-600'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="promo.isActive ? 'bg-green-400' : 'bg-surface-500'" />
                  {{ promo.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                </button>
              </td>

              <!-- Actions -->
              <td class="px-5 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(promo)"
                    class="h-9 px-3 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Pencil :size="14" />
                    แก้ไข
                  </button>
                  <button
                    @click="handleDelete(promo)"
                    class="h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 :size="14" />
                    ลบ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Form Modal -->
    <AdminPromotionFormModal
      :is-open="showFormModal"
      :editing-promotion="editingPromotion"
      @close="showFormModal = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { usePromotions } from '~/composables/usePromotions'
import type { Promotion, BuyXGetYConfig, BirthdayConfig } from '~/types'

definePageMeta({ layout: 'admin' })

const { fetchAll, toggleActive, softDelete } = usePromotions()

const isLoading = ref(true)
const promotions = ref<Promotion[]>([])
const showFormModal = ref(false)
const editingPromotion = ref<Promotion | null>(null)

async function loadData() {
  isLoading.value = true
  promotions.value = await fetchAll(true)
  isLoading.value = false
}

onMounted(loadData)

function openCreateModal() {
  editingPromotion.value = null
  showFormModal.value = true
}

function openEditModal(promo: Promotion) {
  editingPromotion.value = promo
  showFormModal.value = true
}

async function handleToggleActive(promo: Promotion) {
  await toggleActive(promo.id!)
  await loadData()
}

async function handleDelete(promo: Promotion) {
  if (!confirm(`ยืนยันลบโปรโมชัน "${promo.name}" ?`)) return
  await softDelete(promo.id!)
  await loadData()
}

async function onSaved() {
  await loadData()
}
</script>
