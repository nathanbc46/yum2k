<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="backdropMousedownHandler"
        @mouseup.self="backdropMouseupHandler"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <!-- Modal Box: ใหญ่กว่า Category เพราะมี Mapping Section -->
        <div class="relative bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden" @mousedown.stop>

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-5 border-b border-surface-800 shrink-0">
            <h2 class="font-bold text-lg text-surface-50">
              {{ isEditing ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่' }}
            </h2>
            <button
              @click="handleCancel"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >×</button>
          </div>

          <!-- Scrollable Form Body -->
          <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto p-6 space-y-5">
            
            <!-- === ส่วนรูปภาพสินค้า === -->
            <section 
              class="flex flex-col items-center justify-center p-6 bg-surface-950/50 rounded-2xl border-2 border-dashed transition-all group relative overflow-hidden"
              :class="[
                isDragging ? 'border-primary-500 bg-primary-500/5' : 'border-surface-700 hover:border-primary-500/50',
                form.imageUrl ? 'py-4' : 'p-6'
              ]"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <input 
                ref="fileInput"
                type="file" 
                accept="image/*" 
                class="hidden" 
                @change="handleFileChange"
              />
              
              <!-- เมนูกดเพื่อเลือกรูป (แสดงเมื่อไม่มีรูป) -->
              <div 
                v-if="!form.imageUrl"
                @click="fileInput?.click()"
                class="flex flex-col items-center gap-3 cursor-pointer py-4"
              >
                <div class="w-20 h-20 bg-surface-800 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-surface-700 transition-colors">
                  📸
                </div>
                <div class="text-center">
                  <p class="text-sm font-bold text-surface-200">คลิกเพื่อเลือกรูปสินค้า</p>
                  <p class="text-xs text-surface-500 mt-1">แนะนำขนาดจตุรัส (ย่อขนาดอัตโนมัติ)</p>
                </div>
              </div>

              <!-- แสดงรูปตัวอย่าง (เมื่อมีรูป) -->
              <div v-else class="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden shadow-2xl group/img">
                <img :src="form.imageUrl" class="w-full h-full object-cover" />
                
                <!-- Overlay สำหรับเปลี่ยน/ลบรูป -->
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <button 
                    type="button"
                    @click="fileInput?.click()"
                    class="bg-white text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                  >
                    เปลี่ยนรูป
                  </button>
                  <button 
                    type="button"
                    @click="removeImage"
                    class="bg-danger text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                  >
                    ลบรูปออก
                  </button>
                </div>
              </div>

              <!-- Loading State ตอนกำลังอัปโหลด -->
              <div v-if="isUploading" class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                <div class="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                <p class="text-xs font-bold text-primary-400">กำลังประมวลผลและอัปโหลด...</p>
              </div>
            </section>


            <!-- === ข้อมูลพื้นฐาน === -->
            <section>
              <h3 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">ข้อมูลพื้นฐาน</h3>
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <!-- ชื่อสินค้า -->
                  <div class="col-span-2">
                    <label class="form-label">ชื่อสินค้า <span class="text-danger">*</span></label>
                    <input
                      v-model="form.name"
                      type="text"
                      placeholder="เช่น ยำมะม่วง, โปร 10 แถม 1..."
                      required
                      class="form-input"
                    />
                  </div>
                  <!-- SKU -->
                  <div>
                    <label class="form-label">รหัสสินค้า (SKU)</label>
                    <input 
                      v-model="form.sku" 
                      type="text" 
                      placeholder="ระบบรันอัตโนมัติ" 
                      readonly
                      class="form-input opacity-60 bg-surface-800 cursor-not-allowed" 
                    />
                  </div>
                  <!-- หมวดหมู่ -->
                  <div>
                    <label class="form-label">หมวดหมู่ <span class="text-danger">*</span></label>
                    <select v-model.number="form.categoryId" required class="form-input">
                      <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>
                </div>

                <!-- คำอธิบาย -->
                <div>
                  <label class="form-label">คำอธิบาย (ไม่บังคับ)</label>
                  <input v-model="form.description" type="text" placeholder="รายละเอียดเพิ่มเติม..." class="form-input" />
                </div>
              </div>
            </section>

            <hr class="border-surface-800" />

            <!-- === ราคา === -->
            <section>
              <h3 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">ราคา</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">ราคาขาย (บาท) <span class="text-danger">*</span></label>
                  <input
                    v-model.number="form.salePrice"
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    class="form-input"
                  />
                </div>
                <div>
                  <label class="form-label">
                    ราคาต้นทุน (บาท)
                    <span class="text-surface-500 font-normal normal-case">(ค่า default = 60%)</span>
                  </label>
                  <input
                    v-model.number="form.costPrice"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="คำนวณอัตโนมัติ"
                    class="form-input"
                    @input="costPriceManuallyEdited = true"
                  />
                </div>
              </div>
            </section>

            <hr class="border-surface-800" />

            <!-- === สต็อก === -->
            <section>
              <h3 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">สต็อก</h3>
              <div class="space-y-4">
                <!-- Toggle trackInventory -->
                <div class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800">
                  <div>
                    <div class="text-sm font-semibold text-surface-50">ติดตามสต็อก</div>
                    <div class="text-xs text-surface-500">ปิดสำหรับสินค้าแบบ Bundle/Promotion (ระบบจะตัดสต็อกจากสินค้าหลักแทน)</div>
                  </div>
                  <button
                    type="button"
                    @click="form.trackInventory = !form.trackInventory"
                    class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                    :class="form.trackInventory ? 'bg-primary-500' : 'bg-surface-700'"
                  >
                    <div
                      class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                      :class="form.trackInventory ? 'translate-x-[22px]' : 'translate-x-0'"
                    />
                  </button>
                </div>

                <div v-if="form.trackInventory" class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">จำนวนสต็อก (ชิ้น)</label>
                    <input v-model.number="form.stockQuantity" type="number" min="0" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">แจ้งเตือนเมื่อเหลือน้อยกว่า</label>
                    <input v-model.number="form.alertThreshold" type="number" min="0" class="form-input" />
                  </div>
                </div>
              </div>
            </section>

            <hr class="border-surface-800" />

            <!-- === Inventory Mapping (Bundle/Promotion) === -->
            <section>
              <h3 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1">ประเภทสินค้า / Mapping</h3>
              <p class="text-xs text-surface-500 mb-4">กำหนดว่าเมื่อขายสินค้านี้ ระบบต้องตัดสต็อกสินค้าใดบ้าง</p>

              <!-- เลือกประเภท -->
              <div class="grid grid-cols-3 gap-2 mb-5">
                <button
                  v-for="opt in mappingTypeOptions"
                  :key="opt.value"
                  type="button"
                  @click="form.mappingType = opt.value as any"
                  class="py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all text-center"
                  :class="form.mappingType === opt.value
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-surface-700 bg-surface-950 text-surface-400 hover:border-surface-500'"
                >
                  <div class="text-base mb-0.5">{{ opt.icon }}</div>
                  <div>{{ opt.label }}</div>
                </button>
              </div>

              <!-- Mapping Rows (เมื่อเลือก promotion หรือ bundle) -->
              <div v-if="form.mappingType && form.mappingType !== 'variant'" class="space-y-3">
                <div class="text-sm font-semibold text-surface-300 flex items-center justify-between">
                  <span>สินค้าที่ต้องตัดสต็อก</span>
                  <button
                    type="button"
                    @click="addMappingRow"
                    class="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                  >
                    <span>+</span> เพิ่มสินค้า
                  </button>
                </div>

                <!-- Header row -->
                <div class="grid grid-cols-12 gap-2 text-[10px] text-surface-500 uppercase tracking-wider px-1">
                  <span class="col-span-8">สินค้าหลักที่จะถูกตัดสต็อก</span>
                  <span class="col-span-3 text-center">จำนวนที่ตัด</span>
                  <span class="col-span-1"></span>
                </div>

                <div
                  v-for="(mapping, idx) in form.inventoryMappings"
                  :key="idx"
                  class="grid grid-cols-12 gap-2 items-center"
                >
                  <select
                    v-model.number="mapping.sourceProductId"
                    required
                    class="col-span-8 form-input text-xs"
                  >
                    <option value="" disabled>-- เลือกสินค้าหลัก --</option>
                    <option
                      v-for="p in trackableProducts"
                      :key="p.id"
                      :value="p.id"
                    >
                      {{ p.name }} (สต็อก: {{ p.stockQuantity }})
                    </option>
                  </select>
                  <input
                    v-model.number="mapping.quantity"
                    type="number"
                    min="1"
                    required
                    class="col-span-3 form-input text-xs text-center"
                    placeholder="1"
                  />
                  <button
                    type="button"
                    @click="removeMappingRow(idx)"
                    class="col-span-1 text-surface-500 hover:text-danger transition-colors text-lg font-bold flex items-center justify-center h-10"
                  >×</button>
                </div>

                <!-- Empty State -->
                <div
                  v-if="!form.inventoryMappings?.length"
                  class="text-xs text-surface-500 text-center py-3 bg-surface-950 rounded-xl border border-dashed border-surface-700"
                >
                  กดปุ่ม "+ เพิ่มสินค้า" เพื่อกำหนดการตัดสต็อก
                </div>

                <!-- ตัวอย่าง: คำอธิบาย -->
                <div v-if="mappingExample" class="text-xs text-surface-400 bg-surface-950/50 rounded-xl px-4 py-3 border border-surface-800 leading-relaxed">
                  <span class="text-primary-400 font-bold">💡 ตัวอย่าง: </span>{{ mappingExample }}
                </div>
              </div>
            </section>

            <hr class="border-surface-800" />

            <!-- === Add-ons & ตัวเลือกเสริม === -->
            <section>
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                <h3 class="text-xs font-bold text-surface-400 uppercase tracking-widest">ตัวเลือกเสริม (Add-ons)</h3>
                <div class="flex items-center gap-2">
                  <!-- เลือกจากที่เคยสร้าง -->
                  <select 
                    v-if="existingAddonTemplates.length > 0"
                    v-model="selectedAddonTemplateId" 
                    class="form-input py-1.5 px-2 text-xs w-48 bg-surface-800 border-surface-700"
                  >
                    <option value="">-- คัดลอกกลุ่มเดิม --</option>
                    <option v-for="t in existingAddonTemplates" :key="t.id" :value="t.id">
                      {{ t.name }} ({{ t.options.length }} ตัวเลือก)
                    </option>
                  </select>
                  <button
                    v-if="existingAddonTemplates.length > 0 && selectedAddonTemplateId"
                    type="button"
                    @click="copyFromTemplate"
                    class="text-xs shrink-0 text-success hover:text-green-400 transition-colors font-semibold bg-success/10 px-2 py-1.5 rounded-lg border border-success/20"
                  >
                    + คัดลอก
                  </button>

                  <button
                    type="button"
                    @click="addAddonGroup"
                    class="text-xs shrink-0 text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors font-semibold ml-1"
                  >
                    + เพิ่มกลุ่มใหม่
                  </button>
                </div>
              </div>
              <p class="text-xs text-surface-500 mb-4">กำหนดตัวเลือกที่ให้ลูกค้าเลือกก่อนสั่ง เช่น ระดับความเผ็ด, ท็อปปิ้ง (ภาษาคุย: +บวกราคาอัตโนมัติ)</p>

              <div v-if="!form.addonGroups?.length" class="text-xs text-surface-500 text-center py-4 bg-surface-950 rounded-xl border border-dashed border-surface-700">
                ยังไม่มีตัวเลือก — กด "+ เพิ่มกลุ่ม" เพื่อสร้างตัวเลือกใหม่
              </div>

              <div v-for="(group, gIdx) in form.addonGroups" :key="group.id" class="mb-4 rounded-xl border border-surface-700 overflow-hidden">
                <!-- Group Header -->
                <div class="flex items-center gap-2 bg-surface-800 px-4 py-2.5">
                  <input
                    v-model="group.name"
                    type="text"
                    :placeholder="`ชื่อกลุ่ม เช่น ความเผ็ด, ท็อปปิ้ง...`"
                    class="flex-1 bg-transparent text-sm font-semibold text-surface-100 placeholder-surface-600 outline-none"
                  />
                  <label class="flex items-center gap-1.5 text-xs text-surface-400 cursor-pointer select-none shrink-0 border-l border-surface-700 pl-3 ml-1">
                    <input type="checkbox" v-model="group.isRequired" class="accent-primary-500" />
                    บังคับเลือก
                  </label>
                  
                  <div class="flex items-center gap-2 text-[10px] text-surface-400 font-bold uppercase tracking-tighter shrink-0 border-l border-surface-700 pl-3 ml-1">
                    เลือกได้สูงสุด
                    <input 
                      v-model.number="group.maxSelect" 
                      type="number" 
                      min="0" 
                      placeholder="∞"
                      class="w-12 bg-surface-950 border border-surface-700 rounded-lg text-center py-1 text-xs text-primary-400 outline-none focus:border-primary-500 transition-colors"
                      title="ใส่ 1 เพื่อเป็นโหมดวิทยุ (เลือกได้อย่างเดียว), ใส่ 0 หรือว่างเพื่อเลือกได้ไม่จำกัด"
                    />
                  </div>

                  <button
                    type="button"
                    @click="removeAddonGroup(gIdx)"
                    class="text-surface-500 hover:text-danger transition-colors text-lg leading-none shrink-0 ml-1"
                  >&times;</button>
                </div>

                <!-- Options -->
                <div class="p-3 space-y-2">
                  <div
                    v-for="(opt, oIdx) in group.options"
                    :key="opt.id"
                    class="grid grid-cols-12 gap-2 items-center"
                  >
                    <input
                      v-model="opt.name"
                      type="text"
                      placeholder="ชื่อตัวเลือก เช่น เผ็ดน้อย, เผ็ดมาก..."
                      class="col-span-7 form-input text-xs"
                    />
                    <input
                      v-model.number="opt.price"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="+บาท (0=ฟรี)"
                      class="col-span-4 form-input text-xs text-center"
                    />
                    <button
                      type="button"
                      @click="removeAddonOption(gIdx, oIdx)"
                      class="col-span-1 text-surface-500 hover:text-danger transition-colors text-lg font-bold flex items-center justify-center h-10"
                    >&times;</button>
                  </div>

                  <button
                    type="button"
                    @click="addAddonOption(gIdx)"
                    class="w-full py-2 rounded-xl border border-dashed border-surface-700 text-xs text-surface-400 hover:text-primary-400 hover:border-primary-700 transition-all"
                  >
                    + เพิ่มตัวเลือก
                  </button>
                </div>
              </div>
            </section>

            <hr class="border-surface-800" />

            <!-- === การแสดงผล === -->
            <section>
              <h3 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">การแสดงผล</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">ลำดับแสดงผล</label>
                  <input v-model.number="form.sortOrder" type="number" min="1" class="form-input" />
                </div>
                <div class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800">
                  <div>
                    <div class="text-sm font-semibold text-surface-50">เปิดขาย</div>
                    <div class="text-xs text-surface-500">แสดงในหน้าขาย</div>
                  </div>
                  <button
                    type="button"
                    @click="form.isActive = !form.isActive"
                    class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                    :class="form.isActive ? 'bg-primary-500' : 'bg-surface-700'"
                  >
                    <div
                      class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                      :class="form.isActive ? 'translate-x-[22px]' : 'translate-x-0'"
                    />
                  </button>
                </div>
              </div>
            </section>

            <!-- Error -->
            <p ref="errorBoxRef" v-if="errorMsg" class="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
              ⚠️ {{ errorMsg }}
            </p>

            <!-- Offline Warning -->
            <div v-if="!isOnline" class="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span class="text-2xl mt-0.5">📶</span>
              <div>
                <h4 class="font-bold text-red-500">ฟีเจอร์นี้ต้องการอินเทอร์เน็ต</h4>
                <p class="text-sm text-red-400/80 mt-1">
                  กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อ{{ isEditing ? 'แก้ไข' : 'เพิ่ม' }}สินค้า (ระบบเปลี่ยนเป็นแบบ Online-Only เพื่อป้องกันข้อมูลซ้ำซ้อน)
                </p>
              </div>
            </div>
          </form>

          <!-- Footer Actions -->
          <div class="flex gap-3 px-6 py-5 border-t border-surface-800 shrink-0">
            <button
              type="button"
              @click="handleCancel"
              class="flex-1 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              @click="handleSubmit"
              :disabled="isSaving || !isOnline"
              class="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-900/20"
            >
              {{ isSaving ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { db } from '~/db'
import { v4 as uuidv4 } from 'uuid'
import { useProducts, type ProductFormData } from '~/composables/useProducts'
import { useStorage } from '~/composables/useStorage'
import type { Category, Product, InventoryMapping, AddonGroup, AddonOption } from '~/types'

const props = defineProps<{
  isOpen: boolean
  categories: Category[]
  editItem?: Product | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { isOnline } = useSync()
const { createProduct, updateProduct, getNextSku } = useProducts()
const { resizeImage, uploadProductImage, deleteProductImage } = useStorage()

// --- จัดการเรื่องรูปภาพและ Cleanup ---
const isDragging = ref(false)
const originalImageUrl = ref<string | undefined>() // รูปดั้งเดิมก่อนเริ่มแก้ไข
const uploadedInSession = ref<string[]>([])       // รูปทั้งหมดที่อัปโหลดใหม่ใน Modal รอบนี้

const isEditing = computed(() => !!props.editItem)
const isSaving = ref(false)
const isUploading = ref(false)
const errorMsg = ref('')
const errorBoxRef = ref<HTMLElement | null>(null)

const fileInput = ref<HTMLInputElement | null>(null)

// --- ป้องกัน Modal ปิดเมื่อลากเมาส์ (Drag to Select) ---
// เช็คว่า mousedown เริ่มต้นที่ backdrop จริงๆ ก่อนถึงจะปิด
let backdropMousedownFlag = false
function backdropMousedownHandler() { backdropMousedownFlag = true }
function backdropMouseupHandler() {
  if (backdropMousedownFlag) handleCancel()
  backdropMousedownFlag = false
}

// --- ติดตามว่าผู้ใช้แก้ไข costPrice เองหรือไม่ ---
const costPriceManuallyEdited = ref(false)

// สินค้าที่ Track สต็อก (สำหรับเลือกใน Mapping)
const trackableProducts = ref<Product[]>([])

const mappingTypeOptions = [
  { value: undefined,     icon: '🟢', label: 'ปกติ' },
  { value: 'promotion',   icon: '🟡', label: 'Promotion' },
  { value: 'bundle',      icon: '🔵', label: 'Bundle' },
]

const defaultForm = (): ProductFormData => ({
  categoryId: props.categories[0]?.id ?? 0,
  sku: '',
  name: '',
  description: '',
  salePrice: 0,
  costPrice: undefined,
  stockQuantity: 0,
  alertThreshold: 10,
  trackInventory: true,
  mappingType: undefined,
  inventoryMappings: [],
  addonGroups: [],
  isActive: true,
  sortOrder: 1,
  imageUrl: undefined,
})

const form = ref<ProductFormData>(defaultForm())

// Watch ราคาขาย → auto-calculate ต้นทุน 60% เมื่อผู้ใช้ยังไม่ได้แก้ไขด้วยตนเอง
watch(() => form.value.salePrice, (newPrice) => {
  if (!costPriceManuallyEdited.value) {
    form.value.costPrice = newPrice > 0 ? Math.round(newPrice * 0.6) : 0
  }
})

async function loadTrackableProducts() {
  trackableProducts.value = await db.products
    .filter(p => p.trackInventory && !p.isDeleted && p.isActive)
    .toArray()
}

// โหลดเทมเพลต Addons กลุ่มเดิมที่เคยสร้างไว้ในสินค้าอื่นๆ (Deduplicate ตามชื่อกลุ่มและรายการออปชัน)
const existingAddonTemplates = ref<AddonGroup[]>([])
const selectedAddonTemplateId = ref<string>('')

async function loadAddonTemplates() {
  const allProducts = await db.products.filter(p => !p.isDeleted).toArray()
  const map = new Map<string, AddonGroup>()

  allProducts.forEach(p => {
    if (p.addonGroups && p.addonGroups.length > 0) {
      p.addonGroups.forEach(g => {
        // สร้าง signature ป้องกันกลุ่มที่ซ้ำกัน
        const sig = `${g.name}|${g.isRequired}|${g.options.map(o => `${o.name}:${o.price}`).join(',')}`
        if (!map.has(sig)) {
          map.set(sig, g)
        }
      })
    }
  })
  existingAddonTemplates.value = Array.from(map.values())
  selectedAddonTemplateId.value = '' // รีเซ็ตการเลือก
}

// ก๊อปปี้เทมเพลตที่เลือก
function copyFromTemplate() {
  if (!selectedAddonTemplateId.value) return
  const tpl = existingAddonTemplates.value.find(t => t.id === selectedAddonTemplateId.value)
  if (!tpl) return

  if (!form.value.addonGroups) form.value.addonGroups = []
  
  // Clone และล้าง uuid ให้เป็นตัวใหม่ทั้งหมด เพื่อแยกเป็น instance ใหม่
  const newGroup: AddonGroup = {
    id: uuidv4(),
    name: tpl.name,
    isRequired: tpl.isRequired,
    options: tpl.options.map(o => ({
      id: uuidv4(),
      name: o.name,
      price: o.price
    }))
  }

  form.value.addonGroups.push(newGroup)
  selectedAddonTemplateId.value = '' // เลิกเลือกหลังจากก๊อปปี้เสร็จแล้ว
}

// เพิ่ม mapping row
function addMappingRow() {
  if (!form.value.inventoryMappings) form.value.inventoryMappings = []
  form.value.inventoryMappings.push({ sourceProductId: 0, quantity: 1 })
}

function removeMappingRow(idx: number) {
  form.value.inventoryMappings?.splice(idx, 1)
}

// --- จัดการรูปภาพ ---
async function processAndUploadFile(file: File) {
  isUploading.value = true
  errorMsg.value = ''

  try {
    // 1. Resize รูปภาพก่อนอัปโหลด (800px)
    const resizedBlob = await resizeImage(file, 800)
    
    // 2. อัปโหลดขึ้น Supabase Storage
    const fileName = `prod_${uuidv4()}.webp`
    const publicUrl = await uploadProductImage(resizedBlob, fileName)
    
    // 3. เก็บ URL ลงฟอร์ม และบันทึกประวัติการอัปโหลดเพื่อ Cleanup ภายหลัง
    form.value.imageUrl = publicUrl
    uploadedInSession.value.push(publicUrl)
  } catch (err: any) {
    console.error('Image Upload Error:', err)
    errorMsg.value = `อัปโหลดรูปภาพไม่สำเร็จ: ${err.message}`
  } finally {
    isUploading.value = false
  }
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) await processAndUploadFile(file)
  // ล้างค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
  target.value = ''
}

function handleDragOver() {
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  if (files.length > 1) {
    const toast = useToast()
    toast.warning('⚠️ สามารถอัปโหลดได้ทีละ 1 รูปเท่านั้น ระบบจะเลือกเฉพาะรูปแรก')
  }

  const file = files[0]
  if (file && file.type.startsWith('image/')) {
    await processAndUploadFile(file)
  }
}

function removeImage() {
  form.value.imageUrl = undefined
}

/**
 * ฟังก์ชัน Cleanup รูปภาพที่ไม่ได้ใช้งาน
 * @param mode 'save' | 'cancel'
 */
async function cleanupImages(mode: 'save' | 'cancel') {
  const currentUrl = form.value.imageUrl
  
  if (mode === 'save') {
    // 1. ถ้ามีการเปลี่ยนรูปใหม่ (หรือลบรูปออก) และ Save สำเร็จ -> ลบรูป "ดั้งเดิม" ทิ้ง
    if (originalImageUrl.value && originalImageUrl.value !== currentUrl) {
      await deleteProductImage(originalImageUrl.value)
    }

    // 2. ลบรูปอื่นๆ ที่อัปโหลดเล่นในเซสชันนี้ แต่ "ไม่ได้ใช้" ทิ้ง
    const toDelete = uploadedInSession.value.filter(url => url !== currentUrl)
    for (const url of toDelete) {
      await deleteProductImage(url)
    }
  } else {
    // กรณี Cancel -> ลบรูปทุกใบที่เพิ่งอัปโหลดใหม่ในรอบนี้ทิ้งให้หมด
    for (const url of uploadedInSession.value) {
      await deleteProductImage(url)
    }
  }

  // ล้างสถานะ
  uploadedInSession.value = []
}

async function handleCancel() {
  await cleanupImages('cancel')
  emit('close')
}


// ฟังก์ชันจัดการ Add-on Groups
function addAddonGroup() {
  if (!form.value.addonGroups) form.value.addonGroups = []
  form.value.addonGroups.push({
    id: uuidv4(),
    name: '',
    isRequired: false,
    options: [{ id: uuidv4(), name: '', price: 0 } as AddonOption]
  } as AddonGroup)
}

function removeAddonGroup(idx: number) {
  form.value.addonGroups?.splice(idx, 1)
}

function addAddonOption(groupIdx: number | string) {
  form.value.addonGroups?.[Number(groupIdx)]?.options.push({ id: uuidv4(), name: '', price: 0 } as AddonOption)
}

function removeAddonOption(groupIdx: number | string, optIdx: number | string) {
  form.value.addonGroups?.[Number(groupIdx)]?.options.splice(Number(optIdx), 1)
}

// คำอธิบาย Mapping แบบ Human-readable
const mappingExample = computed(() => {
  if (!form.value.inventoryMappings?.length) return ''
  const rows = form.value.inventoryMappings
    .filter(m => m.sourceProductId && m.quantity)
    .map(m => {
      const p = trackableProducts.value.find(p => p.id === m.sourceProductId)
      return p ? `${p.name} ${m.quantity} ชิ้น` : ''
    })
    .filter(Boolean)
  if (!rows.length) return ''
  return `ขาย 1 ชุด → ตัดสต็อก: ${rows.join(', ')}`
})

watch(
  () => props.isOpen,
  async (open) => {
    if (!open) return
    errorMsg.value = ''
    costPriceManuallyEdited.value = false  // reset ทุกครั้งที่เปิด modal ใหม่
    await loadTrackableProducts()
    await loadAddonTemplates()
    if (props.editItem) {
      form.value = {
        categoryId: props.editItem.categoryId,
        sku: props.editItem.sku ?? '',
        name: props.editItem.name,
        description: props.editItem.description ?? '',
        salePrice: props.editItem.salePrice,
        costPrice: props.editItem.costPrice,
        stockQuantity: props.editItem.stockQuantity,
        alertThreshold: props.editItem.alertThreshold,
        trackInventory: props.editItem.trackInventory,
        mappingType: props.editItem.mappingType,
        inventoryMappings: props.editItem.inventoryMappings
          ? JSON.parse(JSON.stringify(props.editItem.inventoryMappings))
          : [],
        addonGroups: props.editItem.addonGroups
          ? JSON.parse(JSON.stringify(props.editItem.addonGroups))
          : [],
        isActive: props.editItem.isActive,
        sortOrder: props.editItem.sortOrder,
        imageUrl: props.editItem.imageUrl,
      }
      originalImageUrl.value = props.editItem.imageUrl
      uploadedInSession.value = []
    } else {
      form.value = defaultForm()
      originalImageUrl.value = undefined
      uploadedInSession.value = []
      // รัน SKU อัตโนมัติ
      getNextSku().then((sku: string) => {
        form.value.sku = sku
      })
    }
  },
  { immediate: true },
)

async function showError(msg: string) {
  errorMsg.value = msg
  await nextTick()
  errorBoxRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.value.name.trim()) return showError('กรุณาใส่ชื่อสินค้า')
  if (!form.value.categoryId) return showError('กรุณาเลือกหมวดหมู่')
  if (form.value.salePrice <= 0) return showError('ราคาขายต้องมากกว่า 0')

  // ตรวจ Mapping
  if (form.value.mappingType) {
    const incomplete = form.value.inventoryMappings?.some(m => !m.sourceProductId || !m.quantity)
    if (incomplete) return showError('กรุณาเลือกสินค้าหลักและใส่จำนวนให้ครบทุกแถว')
  }

  isSaving.value = true
  try {
    if (isEditing.value && props.editItem?.id) {
      await updateProduct(props.editItem.id, form.value)
    } else {
      await createProduct(form.value)
    }
    
    // บันทึกสำเร็จแล้ว -> Clean up รูปภาพเก่า หรือรูปที่อัปโหลดค้างไว้
    await cleanupImages('save')
    
    emit('saved')
    emit('close')
  } catch (e: any) {
    showError(e.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
/* ใช้ CSS ตรงๆ แทน @apply เพราะ Tailwind v4 scoped อาจไม่รู้จัก custom tokens */
.form-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.375rem;
  color: var(--color-surface-400, #94a3b8);
}
.form-input {
  width: 100%;
  background-color: var(--color-surface-950, #020617);
  border: 1px solid var(--color-surface-700, #334155);
  color: var(--color-surface-50, #f8fafc);
  border-radius: 0.75rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s ease;
}
.form-input::placeholder {
  color: var(--color-surface-600, #475569);
}
.form-input:focus {
  border-color: var(--color-primary-500, #8b5cf6);
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

