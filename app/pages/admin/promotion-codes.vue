<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 px-6 py-4 border-b border-surface-800 bg-surface-900 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-xl font-black text-surface-50">🎟️ โค้ดโปรโมชัน</h1>
        <p class="text-sm text-surface-500 mt-0.5">สร้างชุดโค้ดลับสำหรับแจกจ่ายและแลกสินค้าฟรี</p>
      </div>
      <button
        @click="openCreateModal"
        class="h-11 px-5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-primary-900/30"
      >
        <Plus :size="18" />
        <span>สร้างชุดโค้ดใหม่</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="isLoading" class="flex items-center justify-center py-16 text-surface-500">
        <span class="animate-spin mr-2">⏳</span> กำลังโหลด...
      </div>

      <div v-else-if="batches.length === 0" class="flex flex-col items-center justify-center py-16 text-surface-500 gap-3">
        <span class="text-5xl">🎟️</span>
        <p class="text-lg font-semibold">ยังไม่มีชุดโค้ด</p>
        <p class="text-sm">กดปุ่ม "สร้างชุดโค้ดใหม่" เพื่อเริ่มต้น</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="batch in batches"
          :key="batch.uuid"
          class="bg-surface-900 border border-surface-800 rounded-2xl p-5"
        >
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h3 class="font-black text-surface-50 text-base">{{ batch.name }}</h3>
                <span
                  class="text-[10px] font-black px-2 py-0.5 rounded-full border"
                  :class="batch.usedCodes >= batch.totalCodes
                    ? 'bg-surface-800 text-surface-500 border-surface-700'
                    : 'bg-green-500/10 text-green-400 border-green-500/20'"
                >
                  {{ batch.usedCodes >= batch.totalCodes ? 'ใช้หมดแล้ว' : 'ใช้งานได้' }}
                </span>
                <span v-if="batch.expiresAt" class="text-[10px] text-surface-500">
                  หมดอายุ {{ formatDate(batch.expiresAt) }}
                </span>
              </div>
              <!-- แสดงสินค้าหลายชิ้น -->
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span class="text-sm text-surface-400">🎁</span>
                <span
                  v-for="name in batch.productNames"
                  :key="name"
                  class="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20"
                >{{ name }}</span>
              </div>

              <!-- Progress bar -->
              <div class="mt-3">
                <div class="flex justify-between text-xs text-surface-500 mb-1">
                  <span>ใช้แล้ว {{ batch.usedCodes }} / {{ batch.totalCodes }} โค้ด</span>
                  <span>{{ Math.round((batch.usedCodes / batch.totalCodes) * 100) }}%</span>
                </div>
                <div class="h-2 bg-surface-800 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="batch.usedCodes >= batch.totalCodes ? 'bg-surface-600' : 'bg-primary-500'"
                    :style="{ width: `${Math.min(100, (batch.usedCodes / batch.totalCodes) * 100)}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="openViewModal(batch)"
                class="h-9 px-3 bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-bold rounded-xl transition-all active:scale-95"
              >
                ดูโค้ด
              </button>
              <button
                @click="printBatch(batch)"
                class="h-9 px-3 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 text-sm font-bold rounded-xl border border-primary-600/20 transition-all active:scale-95"
              >
                🖨️ พิมพ์
              </button>
              <button
                @click="handleDeleteBatch(batch)"
                class="h-9 w-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 rounded-xl transition-all active:scale-95"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal สร้างชุดโค้ด -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isCreateModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm" @mousedown.self="createBackdropMousedown = true" @click.self="onCreateBackdropClick">
          <div class="w-full max-w-lg bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div class="p-6 border-b border-surface-800 shrink-0">
              <h2 class="text-lg font-black text-surface-50">สร้างชุดโค้ดใหม่</h2>
            </div>

            <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div>
                <label class="text-xs font-bold text-surface-400 mb-1.5 block">ชื่อชุดโค้ด *</label>
                <input v-model="form.name" type="text" placeholder="เช่น โปรเปิดร้านใหม่ ม.ค. 69" class="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors" />
              </div>

              <!-- เลือกสินค้าแบบ checkbox -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-bold text-surface-400">สินค้าที่แลกได้ * <span class="text-surface-500 font-normal">(เลือกได้หลายรายการ ลูกค้าเลือก 1 อย่าง)</span></label>
                  <span class="text-xs text-primary-400 font-bold">เลือกแล้ว {{ form.productUuids.length }}</span>
                </div>

                <!-- Search filter -->
                <input
                  v-model="productSearch"
                  type="text"
                  placeholder="ค้นหาสินค้า..."
                  class="w-full bg-surface-950 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors mb-2"
                />

                <div class="border border-surface-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-surface-950">
                  <label
                    v-for="p in filteredProducts"
                    :key="p.uuid"
                    class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-surface-800"
                    :class="form.productUuids.includes(p.uuid) ? 'bg-primary-600/10' : ''"
                  >
                    <input
                      type="checkbox"
                      :value="p.uuid"
                      v-model="form.productUuids"
                      class="w-4 h-4 accent-primary-500 shrink-0"
                    />
                    <span class="flex-1 text-sm font-medium text-surface-200">{{ p.name }}</span>
                    <span class="text-xs text-surface-500 shrink-0">฿{{ p.salePrice }}</span>
                  </label>
                  <div v-if="filteredProducts.length === 0" class="px-4 py-6 text-center text-sm text-surface-600">
                    ไม่พบสินค้าที่ค้นหา
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold text-surface-400 mb-1.5 block">จำนวนโค้ด (1–500) *</label>
                <input v-model.number="form.count" type="number" min="1" max="500" placeholder="50" class="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors" />
              </div>
              <div>
                <label class="text-xs font-bold text-surface-400 mb-1.5 block">วันหมดอายุ (ไม่บังคับ)</label>
                <input v-model="form.expiresAt" type="date" class="w-full bg-surface-950 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-50 focus:border-primary-500 outline-none transition-colors" />
              </div>
            </div>

            <div class="p-6 border-t border-surface-800 flex gap-3 shrink-0">
              <button @click="isCreateModalOpen = false" class="flex-1 h-11 bg-surface-800 text-surface-300 font-bold rounded-xl hover:bg-surface-700 transition-all active:scale-95">
                ยกเลิก
              </button>
              <button
                @click="handleCreate"
                :disabled="isCreating || !form.name || form.productUuids.length === 0 || form.count < 1"
                class="flex-1 h-11 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-800 disabled:text-surface-500 text-white font-bold rounded-xl transition-all active:scale-95"
              >
                {{ isCreating ? 'กำลังสร้าง...' : `สร้าง ${form.count} โค้ด` }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal ดูรายการโค้ด -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isViewModalOpen && viewingBatch" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm" @mousedown.self="isViewModalOpen = false">
          <div class="w-full max-w-lg bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div class="p-5 border-b border-surface-800 flex items-center justify-between shrink-0">
              <div>
                <h2 class="text-base font-black text-surface-50">{{ viewingBatch.name }}</h2>
                <p class="text-xs text-surface-500 mt-0.5">แลกได้: {{ viewingBatch.productNames.join(', ') }}</p>
              </div>
              <button @click="isViewModalOpen = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
                <X :size="16" />
              </button>
            </div>

            <div class="flex px-5 pt-4 gap-2 shrink-0">
              <button
                v-for="tab in ['ทั้งหมด', 'ยังไม่ใช้', 'ใช้แล้ว']"
                :key="tab"
                @click="viewFilter = tab"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                :class="viewFilter === tab ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200'"
              >{{ tab }}</button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 grid grid-cols-3 gap-2 content-start">
              <div
                v-for="code in filteredViewCodes"
                :key="code.uuid"
                class="flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center"
                :class="code.isUsed ? 'bg-surface-800/50 border-surface-700 opacity-50' : 'bg-surface-800 border-surface-700'"
              >
                <span class="font-black text-sm tracking-wider" :class="code.isUsed ? 'text-surface-500 line-through' : 'text-surface-50'">{{ code.code }}</span>
                <span v-if="code.isUsed" class="text-[9px] text-surface-600 font-bold">ใช้แล้ว</span>
                <span v-else class="text-[9px] text-green-500 font-bold">ว่าง</span>
              </div>
            </div>
            <div class="p-4 border-t border-surface-800 shrink-0">
              <p class="text-xs text-surface-500 text-center">
                แสดง {{ filteredViewCodes.length }} จาก {{ viewingCodes.length }} โค้ด
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { Plus, Trash2, X } from 'lucide-vue-next'
import { db } from '~/db'
import { usePromotionCodes } from '~/composables/usePromotionCodes'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import type { PromotionBatch, PromotionCode, Product } from '~/types'

definePageMeta({ layout: 'admin' })

const toast = useToast()
const { confirm } = useConfirm()
const { generateBatch, loadBatches, loadCodes, deleteBatch } = usePromotionCodes()

// --- State ---
const isLoading = ref(true)
const batches = ref<PromotionBatch[]>([])
const activeProducts = ref<Product[]>([])
const productSearch = ref('')

const isCreateModalOpen = ref(false)
const isCreating = ref(false)
const createBackdropMousedown = ref(false)

function onCreateBackdropClick() {
  if (createBackdropMousedown.value) isCreateModalOpen.value = false
  createBackdropMousedown.value = false
}

const form = reactive<{ name: string; productUuids: string[]; count: number; expiresAt: string }>({
  name: '',
  productUuids: [],
  count: 50,
  expiresAt: '',
})

const isViewModalOpen = ref(false)
const viewingBatch = ref<PromotionBatch | null>(null)
const viewingCodes = ref<PromotionCode[]>([])
const viewFilter = ref('ทั้งหมด')

// --- Computed ---
const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase()
  if (!q) return activeProducts.value
  return activeProducts.value.filter(p => p.name.toLowerCase().includes(q))
})

const filteredViewCodes = computed(() => {
  if (viewFilter.value === 'ยังไม่ใช้') return viewingCodes.value.filter(c => !c.isUsed)
  if (viewFilter.value === 'ใช้แล้ว') return viewingCodes.value.filter(c => c.isUsed)
  return viewingCodes.value
})

// --- Load ---
async function load() {
  isLoading.value = true
  try {
    batches.value = await loadBatches()
    activeProducts.value = await db.products.filter(p => !p.isDeleted && p.isActive).sortBy('name')
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// --- Create ---
function openCreateModal() {
  form.name = ''
  form.productUuids = []
  form.count = 50
  form.expiresAt = ''
  productSearch.value = ''
  isCreateModalOpen.value = true
}

async function handleCreate() {
  if (!form.name || form.productUuids.length === 0 || form.count < 1) return
  isCreating.value = true
  try {
    const selectedProducts = activeProducts.value.filter(p => form.productUuids.includes(p.uuid))
    const productNames = selectedProducts.map(p => p.name)

    await generateBatch(
      form.name,
      form.productUuids,
      productNames,
      form.count,
      form.expiresAt ? new Date(form.expiresAt) : undefined
    )
    await load()
    isCreateModalOpen.value = false
    toast.success(`สร้างโค้ด ${form.count} ใบสำเร็จ 🎟️`)
  } catch (e: any) {
    toast.error('สร้างโค้ดล้มเหลว: ' + e.message)
  } finally {
    isCreating.value = false
  }
}

// --- View ---
async function openViewModal(batch: PromotionBatch) {
  viewingBatch.value = batch
  viewFilter.value = 'ทั้งหมด'
  viewingCodes.value = await loadCodes(batch.uuid)
  isViewModalOpen.value = true
}

// --- Print ---
async function printBatch(batch: PromotionBatch) {
  const codes = (await loadCodes(batch.uuid)).filter(c => !c.isUsed && !c.isDeleted)
  if (!codes.length) {
    toast.warning('ไม่มีโค้ดที่ยังไม่ได้ใช้')
    return
  }

  const cards = codes.map(c => `
    <div class="code-card">
      <div class="card-header">🍋 Yum2K</div>
      <div class="card-label">โปรโมชันฟรี!</div>
      <div class="card-product">${batch.productNames.join(' / ')}</div>
      <div class="card-code">${c.code}</div>
      <div class="card-note">ใช้ได้ 1 ครั้ง · กรอกโค้ดที่ POS</div>
      ${batch.expiresAt ? `<div class="card-expire">หมดอายุ ${formatDate(batch.expiresAt)}</div>` : ''}
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>โค้ดโปรโมชัน — ${batch.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', sans-serif; background: white; padding: 10mm; }
    @page { size: A4; margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    .code-card {
      border: 1.5px dashed #888;
      border-radius: 6px;
      padding: 5mm 4mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2mm;
      text-align: center;
      page-break-inside: avoid;
    }
    .card-header { font-size: 10pt; font-weight: 900; color: #1a1a1a; letter-spacing: 1px; }
    .card-label { font-size: 8pt; font-weight: 700; color: #666; text-transform: uppercase; }
    .card-product {
      font-size: 9pt; font-weight: 800; color: #2a2a2a;
      border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;
      padding: 1.5mm 0; width: 100%;
    }
    .card-code {
      font-size: 22pt; font-weight: 900; letter-spacing: 4px;
      color: #1a1a1a; font-family: 'Courier New', monospace;
    }
    .card-note { font-size: 7pt; color: #999; }
    .card-expire { font-size: 7pt; color: #cc4400; font-weight: 700; }
  </style>
</head>
<body>
  <div class="grid">${cards}</div>
  <script>window.onload = function() { window.print(); window.close(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) {
    toast.error('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาต popup ในเบราว์เซอร์')
    return
  }
  win.document.write(html)
  win.document.close()
}

// --- Delete ---
async function handleDeleteBatch(batch: PromotionBatch) {
  const ok = await confirm({
    title: 'ลบชุดโค้ดนี้?',
    message: `"${batch.name}" — โค้ดที่ยังไม่ได้ใช้ทั้งหมด ${batch.totalCodes - batch.usedCodes} ใบจะถูกลบ`,
    confirmText: 'ลบ',
    type: 'danger',
  })
  if (!ok) return
  await deleteBatch(batch.uuid)
  await load()
  toast.success('ลบชุดโค้ดแล้ว')
}

// --- Helpers ---
function formatDate(date: Date | undefined) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
