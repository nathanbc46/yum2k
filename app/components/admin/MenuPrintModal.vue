<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="$emit('close')"
      >
        <div class="bg-surface-900 border border-surface-700 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

          <!-- ===== Modal Top Bar ===== -->
          <div class="px-6 py-4 border-b border-surface-800 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">🍽️</div>
              <div>
                <h2 class="text-lg font-bold text-surface-50">ปริ้นเมนูสินค้า</h2>
                <p class="text-xs text-surface-500">
                  เลือก {{ selectedCategoryIds.length }}/{{ allGroups.length }} หมวดหมู่ ·
                  {{ totalPrintProducts }} รายการ · ขนาด A4
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <!-- Select: ความหนาแน่น (ระยะห่าง) -->
              <div class="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2">
                <label class="text-xs text-surface-400 whitespace-nowrap">ความห่าง/ระยะ</label>
                <select
                  v-model="selectedDensity"
                  class="bg-surface-900 border border-surface-700 text-surface-100 text-xs rounded-lg px-2 py-1 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option v-for="d in densities" :key="d.id" :value="d.id">{{ d.label }}</option>
                </select>
              </div>

              <!-- Button scale: เพิ่ม/ลด ขนาดตัวหนังสือ -->
              <div class="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2">
                <label class="text-xs text-surface-400 whitespace-nowrap">ขนาดตัวหนังสือ</label>
                <div class="flex items-center gap-1.5">
                  <button
                    @click="decreaseFontSize"
                    class="w-6 h-6 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 flex items-center justify-center font-bold text-sm transition-all"
                    title="ลดขนาดตัวหนังสือ"
                  >
                    -
                  </button>
                  <span class="text-xs font-mono font-bold text-surface-100 w-10 text-center">{{ fontSizeScale }}%</span>
                  <button
                    @click="increaseFontSize"
                    class="w-6 h-6 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 flex items-center justify-center font-bold text-sm transition-all"
                    title="เพิ่มขนาดตัวหนังสือ"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Toggle: แสดงราคา -->
              <div class="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2">
                <label class="text-xs text-surface-400 whitespace-nowrap">แสดงราคา</label>
                <button
                  @click="showPrice = !showPrice"
                  class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                  :class="showPrice ? 'bg-amber-500' : 'bg-surface-600'"
                >
                  <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm"
                    :class="showPrice ? 'translate-x-4' : 'translate-x-1'"
                  />
                </button>
              </div>

              <!-- Theme Color -->
              <div class="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2">
                <label class="text-xs text-surface-400 whitespace-nowrap">สีธีม</label>
                <div class="flex gap-1">
                  <button
                    v-for="theme in themes"
                    :key="theme.id"
                    @click="selectedTheme = theme.id"
                    class="w-5 h-5 rounded-full border-2 transition-all"
                    :class="selectedTheme === theme.id ? 'border-white scale-110' : 'border-transparent opacity-70'"
                    :style="{ background: theme.accent }"
                    :title="theme.label"
                  />
                </div>
              </div>

              <!-- Print -->
              <button
                @click="handlePrint"
                :disabled="selectedCategoryIds.length === 0"
                class="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold rounded-xl transition-all shadow-lg"
              >
                🖨️ ปริ้น
              </button>
              <button
                @click="$emit('close')"
                class="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- ===== Body: Sidebar + Preview ===== -->
          <div class="flex flex-1 min-h-0 overflow-hidden">

            <!-- Sidebar: เลือกหมวดหมู่ -->
            <div class="w-56 shrink-0 border-r border-surface-800 overflow-y-auto bg-surface-950 flex flex-col">
              <div class="px-4 py-3 border-b border-surface-800 flex items-center justify-between">
                <span class="text-xs font-bold text-surface-400 uppercase tracking-wider">หมวดหมู่</span>
                <button
                  @click="toggleSelectAll"
                  class="text-[10px] text-primary-400 hover:text-primary-300 font-bold transition-colors"
                >
                  {{ isAllCatsSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด' }}
                </button>
              </div>

              <div class="flex-1 py-2">
                <label
                  v-for="group in allGroups"
                  :key="group.categoryId"
                  class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-800/60 transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="selectedCategoryIds.includes(group.categoryId)"
                    @change="toggleCategory(group.categoryId)"
                    class="w-4 h-4 rounded accent-amber-500 shrink-0 cursor-pointer"
                  />
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-surface-200 truncate">{{ group.categoryName }}</div>
                    <div class="text-[10px] text-surface-500">{{ group.products.length }} รายการ</div>
                  </div>
                  <!-- color dot -->
                  <div
                    class="w-2 h-2 rounded-full shrink-0 ml-auto"
                    :style="{ background: group.color }"
                  />
                </label>
              </div>

              <!-- Stats -->
              <div class="px-4 py-3 border-t border-surface-800 text-[10px] text-surface-600">
                ปริ้น {{ totalPrintProducts }} รายการ
              </div>
            </div>

            <!-- A4 Preview Area -->
            <div class="flex-1 overflow-auto bg-zinc-300 p-6">
              <!-- Empty state -->
              <div v-if="selectedCategoryIds.length === 0" class="flex flex-col items-center justify-center h-full gap-3 text-surface-500">
                <span class="text-5xl opacity-20">☑️</span>
                <p class="text-sm">เลือกหมวดหมู่ที่ต้องการปริ้นจากด้านซ้าย</p>
              </div>

              <!-- A4 Paper -->
              <div
                v-else
                ref="printArea"
                id="menu-print-area"
                class="mx-auto shadow-2xl"
                style="
                  width: 794px;
                  min-height: 1123px;
                  background: #fffdf5;
                  font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
                  box-sizing: border-box;
                "
                :style="{
                  padding: currentDensity.a4Padding,
                  '--menu-font-scale': fontSizeScale / 100
                }"
              >
                <!-- HEADER: ชื่อเมนูเท่านั้น ไม่มี badge/subtitle -->
                <div style="text-align: center;" :style="{ marginBottom: currentDensity.headerMargin }">
                  <div
                    style="font-weight: 900; line-height: 1;"
                    :style="{ color: currentTheme.accent, fontSize: `calc(${currentDensity.titleSize}px * var(--menu-font-scale))` }"
                  >
                    เมนูยำ
                  </div>
                  <!-- decorative underline -->
                  <div
                    style="margin: 8px auto 0; height: 3px; width: 80px; border-radius: 2px;"
                    :style="{ background: `linear-gradient(90deg, transparent, ${currentTheme.accent}, transparent)` }"
                  />
                </div>

                <!-- TWO COLUMN GRID -->
                <div
                  style="display: grid; grid-template-columns: 1fr 1fr; align-items: start;"
                  :style="{ gap: currentDensity.gridGap }"
                >
                  <div
                    v-for="group in filteredGroups"
                    :key="group.categoryId"
                    style="break-inside: avoid;"
                    :style="{ marginBottom: currentDensity.catMargin }"
                  >
                    <!-- Category Pill -->
                    <div
                      style="
                        display: flex; align-items: center; justify-content: center;
                        border-radius: 100px;
                      "
                      :style="{
                        background: currentTheme.accent,
                        padding: currentDensity.catPadding,
                        marginBottom: currentDensity.catBottomMargin
                      }"
                    >
                      <span
                        style="font-weight: 900; color: #fff; letter-spacing: 0.5px; font-style: italic;"
                        :style="{ fontSize: `calc(${currentDensity.catSize}px * var(--menu-font-scale))` }"
                      >
                        {{ group.categoryName }}
                      </span>
                    </div>

                    <!-- Product List -->
                    <div style="padding: 0 4px;">
                      <div
                        v-for="product in group.products"
                        :key="product.id"
                        style="
                          display: flex;
                          align-items: baseline;
                          justify-content: space-between;
                          border-bottom: 1px dotted #ddd;
                        "
                        :style="{ padding: currentDensity.prodPadding }"
                      >
                        <!-- ชื่อสินค้า + วงเล็บรายละเอียด (ถ้ามี) -->
                        <span
                          style="color: #222; font-weight: 500; padding-right: 8px; flex: 1; line-height: 1.3;"
                          :style="{ fontSize: `calc(${currentDensity.prodNameSize}px * var(--menu-font-scale))` }"
                        >
                          {{ product.name }}
                          <span
                            v-if="product.description"
                            style="color: #666; font-weight: normal; margin-left: 4px;"
                            :style="{ fontSize: `calc(${currentDensity.prodNameSize * 0.85}px * var(--menu-font-scale))` }"
                          >
                            ({{ product.description }})
                          </span>
                        </span>
                        <span
                          v-if="showPrice"
                          style="font-weight: 800; white-space: nowrap; flex-shrink: 0;"
                          :style="{ color: currentTheme.priceColor, fontSize: `calc(${currentDensity.prodPriceSize}px * var(--menu-font-scale))` }"
                        >
                          {{ product.salePrice.toLocaleString() }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- FOOTER -->
                <div style="text-align: center;" :style="{ marginTop: currentDensity.footerMargin }">
                  <div style="height: 1px; background: linear-gradient(90deg, transparent, #ccc, transparent);" :style="{ marginBottom: currentDensity.footerLineMargin }"></div>
                  <div style="color: #bbb; letter-spacing: 1px;" :style="{ fontSize: `calc(${currentDensity.footerTextSize}px * var(--menu-font-scale))` }">— ขอบคุณที่อุดหนุน —</div>
                  <div style="color: #ccc; margin-top: 2px;" :style="{ fontSize: `calc(${currentDensity.footerSubTextSize}px * var(--menu-font-scale))` }">
                    ราคาอาจมีการเปลี่ยนแปลงโดยไม่ต้องแจ้งล่วงหน้า &nbsp;·&nbsp; พิมพ์เมื่อ {{ printDate }}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Product, Category } from '~/types'

const props = defineProps<{
  isOpen: boolean
  products: Product[]
  categories: Category[]
}>()

defineEmits(['close'])

// --- ขนาดตัวหนังสือแบบ Manual Scale (%) ---
const fontSizeScale = ref(100)
function decreaseFontSize() {
  if (fontSizeScale.value > 50) fontSizeScale.value -= 5
}
function increaseFontSize() {
  if (fontSizeScale.value < 200) fontSizeScale.value += 5
}

// --- Density / Space Spacing Configs ---
// ปรับค่าขนาดฟอนต์เริ่มต้น (Base font size) ให้มีขนาดใหญ่ขึ้นตามคำขอของผู้ใช้
const densities = [
  {
    id: 'normal',
    label: 'ระยะปกติ (กว้าง)',
    a4Padding: '32px 40px 40px',
    headerMargin: '24px',
    titleSize: 52,
    gridGap: '20px 28px',
    catMargin: '12px',
    catPadding: '8px 16px',
    catBottomMargin: '10px',
    catSize: 18,
    prodPadding: '5px 0',
    prodNameSize: 15,
    prodPriceSize: 16,
    footerMargin: '28px',
    footerLineMargin: '12px',
    footerTextSize: 12,
    footerSubTextSize: 10
  },
  {
    id: 'compact',
    label: 'กระชับพอดี',
    a4Padding: '20px 32px 32px',
    headerMargin: '16px',
    titleSize: 44,
    gridGap: '12px 20px',
    catMargin: '8px',
    catPadding: '6px 14px',
    catBottomMargin: '8px',
    catSize: 15.5,
    prodPadding: '3px 0',
    prodNameSize: 13.5,
    prodPriceSize: 14,
    footerMargin: '18px',
    footerLineMargin: '8px',
    footerTextSize: 11,
    footerSubTextSize: 9
  },
  {
    id: 'super',
    label: 'ประหยัดพื้นที่พิเศษ (สินค้าเยอะ)',
    a4Padding: '12px 24px 24px',
    headerMargin: '10px',
    titleSize: 36,
    gridGap: '8px 16px',
    catMargin: '4px',
    catPadding: '4px 10px',
    catBottomMargin: '4px',
    catSize: 13,
    prodPadding: '1.8px 0',
    prodNameSize: 11.5,
    prodPriceSize: 11.5,
    footerMargin: '10px',
    footerLineMargin: '6px',
    footerTextSize: 9.5,
    footerSubTextSize: 8
  }
]

interface DensityConfig {
  id: string
  label: string
  a4Padding: string
  headerMargin: string
  titleSize: number
  gridGap: string
  catMargin: string
  catPadding: string
  catBottomMargin: string
  catSize: number
  prodPadding: string
  prodNameSize: number
  prodPriceSize: number
  footerMargin: string
  footerLineMargin: string
  footerTextSize: number
  footerSubTextSize: number
}

interface ThemeConfig {
  id: string
  label: string
  accent: string
  priceColor: string
}

const selectedDensity = ref('compact')
const currentDensity = computed<DensityConfig>(() => {
  const found = densities.find(d => d.id === selectedDensity.value)
  return found || (densities[1] as DensityConfig)
})

// --- Themes ---
const themes: ThemeConfig[] = [
  { id: 'amber',  label: 'ส้มทอง',    accent: '#E87B00', priceColor: '#c75c00' },
  { id: 'red',    label: 'แดงเผ็ด',   accent: '#c0392b', priceColor: '#a93226' },
  { id: 'green',  label: 'เขียวสด',   accent: '#27ae60', priceColor: '#1e8449' },
  { id: 'indigo', label: 'น้ำเงิน',   accent: '#2c3e99', priceColor: '#2133a0' },
]
const selectedTheme = ref('amber')
const currentTheme = computed<ThemeConfig>(() => {
  const found = themes.find(t => t.id === selectedTheme.value)
  return found || (themes[0] as ThemeConfig)
})

// --- Options ---
const showPrice = ref(true)

// --- วันที่ ---
const printDate = computed(() =>
  new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
)

// --- จัดกลุ่มสินค้าทั้งหมด: Active + ราคา > 0 ---
const allGroups = computed(() => {
  const validProducts = props.products.filter(
    p => p.isActive && !p.isDeleted && p.salePrice > 0
  )
  const categoryMap = new Map(props.categories.map(c => [c.id, c]))

  const groups: Record<number, {
    categoryId: number
    categoryName: string
    color: string
    sortOrder: number
    products: Product[]
  }> = {}

  for (const product of validProducts) {
    const catId = product.categoryId
    const cat = categoryMap.get(catId)
    if (!groups[catId]) {
      groups[catId] = {
        categoryId: catId,
        categoryName: cat?.name ?? 'ไม่มีหมวดหมู่',
        color: cat?.color ?? '#E87B00',
        sortOrder: cat?.sortOrder ?? 99,
        products: [],
      }
    }
    groups[catId].products.push(product)
  }

  // เรียงสินค้าในแต่ละหมวดหมู่จากราคาน้อยไปมาก
  for (const group of Object.values(groups)) {
    group.products.sort((a, b) => a.salePrice - b.salePrice)
  }

  return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder)
})

// --- Category Selection ---
const selectedCategoryIds = ref<number[]>([])

// sync ให้ selectedCategoryIds ครบเมื่อ allGroups อัปเดต
watch(
  allGroups,
  (groups) => {
    const current = new Set(selectedCategoryIds.value)
    for (const g of groups) {
      if (!current.has(g.categoryId)) {
        selectedCategoryIds.value.push(g.categoryId)
      }
    }
  },
  { immediate: true }
)

function toggleCategory(catId: number) {
  const idx = selectedCategoryIds.value.indexOf(catId)
  if (idx >= 0) selectedCategoryIds.value.splice(idx, 1)
  else selectedCategoryIds.value.push(catId)
}

const isAllCatsSelected = computed(
  () => allGroups.value.length > 0 && allGroups.value.every(g => selectedCategoryIds.value.includes(g.categoryId))
)

function toggleSelectAll() {
  if (isAllCatsSelected.value) {
    selectedCategoryIds.value = []
  } else {
    selectedCategoryIds.value = allGroups.value.map(g => g.categoryId)
  }
}

// --- กลุ่มที่จะแสดงใน Preview/Print ---
const filteredGroups = computed(() =>
  allGroups.value.filter(g => selectedCategoryIds.value.includes(g.categoryId))
)

const totalPrintProducts = computed(() =>
  filteredGroups.value.reduce((sum, g) => sum + g.products.length, 0)
)

// --- Print ---
const printArea = ref<HTMLElement | null>(null)

function handlePrint() {
  if (!document.getElementById('print-thai-font')) {
    const link = document.createElement('link')
    link.id = 'print-thai-font'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&display=swap'
    document.head.appendChild(link)
  }

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:0;'
  document.body.appendChild(iframe)

  const content = printArea.value?.innerHTML ?? ''
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

  if (iframeDoc) {
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>เมนูยำ</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          html, body { width:210mm; background:#fffdf5; font-family:'Sarabun','Noto Sans Thai',sans-serif; }
          body {
            --menu-font-scale: ${fontSizeScale.value / 100};
            padding: ${currentDensity.value.a4Padding};
          }
          @page { size: A4 portrait; margin: 0; }
          @media print {
            html, body { width:210mm; }
            * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1500)
    }, 900)
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
