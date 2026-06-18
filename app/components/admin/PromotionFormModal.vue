<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75" @mousedown.self="backdropMousedown = true" @mouseup.self="backdropMousedown && $emit('close'); backdropMousedown = false" @mouseleave="backdropMousedown = false">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div v-if="isOpen" class="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-surface-800 shrink-0">
              <h2 class="text-lg font-bold text-surface-50">
                {{ editingId ? 'แก้ไขโปรโมชัน' : 'เพิ่มโปรโมชันใหม่' }}
              </h2>
              <button @click="$emit('close')" class="text-surface-400 hover:text-surface-200 p-2 rounded-xl hover:bg-surface-800 transition-colors">
                <X :size="20" />
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <!-- ข้อผิดพลาด -->
              <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {{ error }}
              </div>

              <!-- ชื่อโปรโมชัน -->
              <div>
                <label class="block text-sm font-semibold text-surface-300 mb-1.5">ชื่อโปรโมชัน <span class="text-red-400">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="เช่น ซื้อลูกชิ้น 10 ไม้ แถม 1 ไม้"
                  class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 placeholder-surface-500 focus:border-primary-500 focus:outline-none transition-colors"
                />
              </div>

              <!-- ประเภทโปรโมชัน -->
              <div>
                <label class="block text-sm font-semibold text-surface-300 mb-2">ประเภทโปรโมชัน <span class="text-red-400">*</span></label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    @click="form.type = 'buyXGetY'"
                    class="h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 font-semibold text-sm"
                    :class="form.type === 'buyXGetY'
                      ? 'border-primary-500 bg-primary-600/20 text-primary-400'
                      : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'"
                  >
                    <span class="text-2xl">🛒</span>
                    <span>ซื้อ X แถม Y</span>
                  </button>
                  <button
                    type="button"
                    @click="form.type = 'birthday'"
                    class="h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 font-semibold text-sm"
                    :class="form.type === 'birthday'
                      ? 'border-pink-500 bg-pink-600/20 text-pink-400'
                      : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'"
                  >
                    <span class="text-2xl">🎂</span>
                    <span>โปรวันเกิด</span>
                  </button>
                </div>
              </div>

              <!-- Config: ซื้อ X แถม Y -->
              <div v-if="form.type === 'buyXGetY'" class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">จำนวนที่ต้องซื้อ (ไม้) <span class="text-red-400">*</span></label>
                  <input
                    v-model.number="buyConfig.buyQty"
                    type="number"
                    min="1"
                    class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 focus:border-primary-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-surface-300 mb-1.5">จำนวนที่แถมฟรี (ไม้) <span class="text-red-400">*</span></label>
                  <input
                    v-model.number="buyConfig.freeQty"
                    type="number"
                    min="1"
                    class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 focus:border-primary-500 focus:outline-none transition-colors"
                  />
                </div>
                <div class="col-span-2 bg-surface-800/50 rounded-xl px-4 py-3 text-sm text-surface-400">
                  ซื้อสินค้าในโปรครบ <strong class="text-primary-400">{{ buyConfig.buyQty }}</strong> ชิ้น → แถมฟรี <strong class="text-green-400">{{ buyConfig.freeQty }}</strong> ชิ้น
                </div>
              </div>

              <!-- Config: โปรวันเกิด -->
              <div v-if="form.type === 'birthday'" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold text-surface-300 mb-1.5">จำนวนที่แจกต่อครั้ง <span class="text-red-400">*</span></label>
                    <input
                      v-model.number="birthdayConfig.freeQty"
                      type="number"
                      min="1"
                      class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 focus:border-pink-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-surface-300 mb-1.5">จำนวนสูงสุดทั้งหมด <span class="text-red-400">*</span></label>
                    <input
                      v-model.number="birthdayConfig.maxGiven"
                      type="number"
                      min="1"
                      class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 focus:border-pink-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold text-surface-300 mb-1.5">วันที่เริ่ม (ถ้ามี)</label>
                    <input
                      v-model="birthdayConfig.startDate"
                      type="date"
                      class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 focus:border-pink-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-surface-300 mb-1.5">วันที่สิ้นสุด (ถ้ามี)</label>
                    <input
                      v-model="birthdayConfig.endDate"
                      type="date"
                      class="w-full h-11 bg-surface-800 border border-surface-700 rounded-xl px-4 text-surface-50 focus:border-pink-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div class="bg-surface-800/50 rounded-xl px-4 py-3 text-sm text-surface-400">
                  แจกฟรี <strong class="text-pink-400">{{ birthdayConfig.freeQty }}</strong> ชิ้นต่อครั้ง • แจกได้สูงสุด <strong class="text-pink-400">{{ birthdayConfig.maxGiven }}</strong> ชิ้นรวม
                </div>
              </div>

              <!-- สถานะ -->
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  @click="form.isActive = !form.isActive"
                  class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                  :class="form.isActive ? 'bg-primary-600' : 'bg-surface-700'"
                >
                  <span
                    class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform"
                    :class="form.isActive ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
                <span class="text-sm font-medium" :class="form.isActive ? 'text-primary-400' : 'text-surface-500'">
                  {{ form.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                </span>
              </div>

              <!-- สินค้าที่เข้าร่วมโปร -->
              <div>
                <label class="block text-sm font-semibold text-surface-300 mb-2">
                  สินค้าที่เข้าร่วมโปร
                  <span class="text-surface-500 font-normal ml-1">(เลือกแล้ว {{ selectedProductIds.size }} รายการ)</span>
                </label>
                <!-- Search -->
                <div class="relative mb-2">
                  <input
                    v-model="productSearch"
                    type="text"
                    placeholder="ค้นหาสินค้า..."
                    class="w-full h-10 bg-surface-800 border border-surface-700 rounded-xl pl-4 pr-10 text-surface-50 placeholder-surface-500 focus:border-primary-500 focus:outline-none transition-colors text-sm"
                  />
                  <button
                    v-if="productSearch"
                    @click="productSearch = ''"
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 p-1.5 rounded-full hover:bg-surface-700 transition-colors"
                  >
                    <X :size="16" />
                  </button>
                </div>
                <!-- Product List -->
                <div class="max-h-52 overflow-y-auto space-y-1 bg-surface-800/30 rounded-xl p-2 border border-surface-700">
                  <div v-if="filteredProducts.length === 0" class="text-center text-surface-500 text-sm py-6">
                    ไม่พบสินค้า
                  </div>
                  <label
                    v-for="product in filteredProducts"
                    :key="product.id"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-700/50 transition-colors"
                    :class="{ 'bg-primary-600/10': selectedProductIds.has(product.id!) }"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedProductIds.has(product.id!)"
                      @change="toggleProduct(product.id!)"
                      class="w-4 h-4 accent-primary-500 rounded"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-surface-100 truncate">{{ product.name }}</div>
                      <div class="text-xs text-surface-500">{{ product.sku || 'ไม่มี SKU' }}</div>
                    </div>
                    <span class="text-xs text-surface-400 shrink-0">฿{{ product.salePrice.toLocaleString() }}</span>
                  </label>
                </div>
                <button
                  type="button"
                  @click="selectAllProducts"
                  class="mt-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {{ selectedProductIds.size === filteredProducts.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด' }}
                </button>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-800 shrink-0">
              <button
                @click="$emit('close')"
                class="h-11 px-6 bg-surface-800 hover:bg-surface-700 text-surface-200 font-semibold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                @click="handleSave"
                :disabled="isSaving"
                class="h-11 px-6 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <span v-if="isSaving" class="animate-spin">⏳</span>
                {{ isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { db } from '~/db'
import { usePromotions } from '~/composables/usePromotions'
import type { Promotion, PromotionType, BuyXGetYConfig, BirthdayConfig, Product } from '~/types'

const props = defineProps<{
  isOpen: boolean
  editingPromotion?: Promotion | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const backdropMousedown = ref(false)

const { create, update } = usePromotions()

const editingId = computed(() => props.editingPromotion?.id ?? null)
const error = ref('')
const isSaving = ref(false)
const productSearch = ref('')
const selectedProductIds = ref<Set<number>>(new Set())

const form = ref<{
  name: string
  type: PromotionType
  isActive: boolean
}>({
  name: '',
  type: 'buyXGetY',
  isActive: true,
})

const buyConfig = ref<BuyXGetYConfig>({ buyQty: 10, freeQty: 1 })
const birthdayConfig = ref<Omit<BirthdayConfig, 'totalGiven'>>({
  freeQty: 1,
  maxGiven: 50,
  startDate: '',
  endDate: '',
})

// โหลดสินค้าทั้งหมด
const allProducts = ref<Product[]>([])
onMounted(async () => {
  allProducts.value = await db.products.filter(p => !p.isDeleted && p.isActive).toArray()
})

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase()
  if (!q) return allProducts.value
  return allProducts.value.filter(p =>
    p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
  )
})

function toggleProduct(id: number) {
  const set = new Set(selectedProductIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedProductIds.value = set
}

function selectAllProducts() {
  if (selectedProductIds.value.size === filteredProducts.value.length) {
    selectedProductIds.value = new Set()
  } else {
    selectedProductIds.value = new Set(filteredProducts.value.map(p => p.id!))
  }
}

// เมื่อเปิด modal หรือเปลี่ยน editing promotion
watch(() => props.isOpen, (open) => {
  if (!open) return
  error.value = ''
  productSearch.value = ''
  if (props.editingPromotion) {
    form.value = {
      name: props.editingPromotion.name,
      type: props.editingPromotion.type,
      isActive: props.editingPromotion.isActive,
    }
    if (props.editingPromotion.type === 'buyXGetY') {
      buyConfig.value = { ...(props.editingPromotion.config as BuyXGetYConfig) }
    } else {
      const c = props.editingPromotion.config as BirthdayConfig
      birthdayConfig.value = {
        freeQty: c.freeQty,
        maxGiven: c.maxGiven,
        startDate: c.startDate || '',
        endDate: c.endDate || '',
      }
    }
    selectedProductIds.value = new Set(props.editingPromotion.eligibleProductIds)
  } else {
    form.value = { name: '', type: 'buyXGetY', isActive: true }
    buyConfig.value = { buyQty: 10, freeQty: 1 }
    birthdayConfig.value = { freeQty: 1, maxGiven: 50, startDate: '', endDate: '' }
    selectedProductIds.value = new Set()
  }
}, { immediate: true })

async function handleSave() {
  error.value = ''
  if (!form.value.name.trim()) {
    error.value = 'กรุณากรอกชื่อโปรโมชัน'
    return
  }
  if (form.value.type === 'buyXGetY') {
    if (!buyConfig.value.buyQty || buyConfig.value.buyQty < 1) {
      error.value = 'กรุณากรอกจำนวนที่ต้องซื้อ'
      return
    }
    if (!buyConfig.value.freeQty || buyConfig.value.freeQty < 1) {
      error.value = 'กรุณากรอกจำนวนที่แถมฟรี'
      return
    }
  } else {
    if (!birthdayConfig.value.freeQty || birthdayConfig.value.freeQty < 1) {
      error.value = 'กรุณากรอกจำนวนที่แจกต่อครั้ง'
      return
    }
    if (!birthdayConfig.value.maxGiven || birthdayConfig.value.maxGiven < 1) {
      error.value = 'กรุณากรอกจำนวนสูงสุดทั้งหมด'
      return
    }
  }

  isSaving.value = true
  try {
    const ids = [...selectedProductIds.value]
    const products = await db.products.where('id').anyOf(ids).toArray()
    const uuids = products.map(p => p.uuid)

    const config = form.value.type === 'buyXGetY'
      ? { buyQty: buyConfig.value.buyQty, freeQty: buyConfig.value.freeQty }
      : {
          freeQty: birthdayConfig.value.freeQty,
          maxGiven: birthdayConfig.value.maxGiven,
          totalGiven: props.editingPromotion?.type === 'birthday'
            ? ((props.editingPromotion.config as BirthdayConfig).totalGiven || 0)
            : 0,
          startDate: birthdayConfig.value.startDate || undefined,
          endDate: birthdayConfig.value.endDate || undefined,
        }

    if (editingId.value) {
      await update(editingId.value, {
        name: form.value.name.trim(),
        type: form.value.type,
        isActive: form.value.isActive,
        eligibleProductIds: ids,
        eligibleProductUuids: uuids,
        config,
      })
    } else {
      await create({
        name: form.value.name.trim(),
        type: form.value.type,
        isActive: form.value.isActive,
        eligibleProductIds: ids,
        eligibleProductUuids: uuids,
        config,
      })
    }
    emit('saved')
    emit('close')
  } catch (e: any) {
    error.value = 'บันทึกไม่สำเร็จ: ' + (e.message || e)
  } finally {
    isSaving.value = false
  }
}
</script>
