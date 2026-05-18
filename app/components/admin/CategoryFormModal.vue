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

        <!-- Modal Box -->
        <div class="relative bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]" @mousedown.stop>
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-5 border-b border-surface-800 shrink-0">
            <h2 class="font-bold text-lg text-surface-50">
              {{ isEditing ? '✏️ แก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่ใหม่' }}
            </h2>
            <button
              @click="$emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >×</button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-5 overflow-y-auto flex-1">
            <!-- ชื่อหมวดหมู่ -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">
                ชื่อหมวดหมู่ <span class="text-danger">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="เช่น ยำ, เครื่องดื่ม, ข้าว..."
                required
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all placeholder:text-surface-600"
              />
            </div>

            <!-- หมวดหมู่หลัก (Parent) -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">
                หมวดหมู่หลัก (ถ้ามี)
              </label>
              <div class="relative">
                <select
                  v-model="form.parentId"
                  class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option :value="undefined">--- ไม่มี (เป็นหมวดหมู่หลัก) ---</option>
                  <option
                    v-for="cat in parentOptions"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-500">
                  <IconChevronDown class="w-4 h-4" />
                </div>
              </div>
              <p class="text-[10px] text-surface-500 mt-1 italic pl-1">เลือกเพื่อกำหนดให้เป็นหมวดหมู่ย่อย</p>
            </div>

            <!-- คำอธิบาย -->
            <div>
              <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">
                คำอธิบาย (ไม่บังคับ)
              </label>
              <input
                v-model="form.description"
                type="text"
                placeholder="คำอธิบายสั้นๆ..."
                class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all placeholder:text-surface-600"
              />
            </div>

            <!-- สีและลำดับ -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">สีประจำหมวดหมู่</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.color"
                    type="color"
                    class="h-10 w-14 bg-surface-950 border border-surface-700 rounded-lg cursor-pointer"
                  />
                  <span class="text-xs text-surface-500 font-mono">{{ form.color }}</span>
                </div>
              </div>
              <div>
                <label class="block text-xs text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">ลำดับแสดงผล</label>
                <input
                  v-model.number="form.sortOrder"
                  type="number"
                  min="1"
                  class="w-full bg-surface-950 border border-surface-700 text-surface-50 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            <!-- สถานะ -->
            <div class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800">
              <div>
                <div class="text-sm font-semibold text-surface-50">เปิดใช้งาน</div>
                <div class="text-xs text-surface-500">แสดงหมวดหมู่นี้ในหน้าขาย</div>
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

            <!-- ตัวเลือกเสริมประจำหมวดหมู่ -->
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-xs text-surface-400 font-semibold uppercase tracking-wider">
                  ตัวเลือกเสริมประจำหมวดหมู่
                </label>
                <div class="flex items-center gap-2">
                  <!-- คัดลอกกลุ่มเดิม -->
                  <select
                    v-if="addonTemplates.length > 0"
                    v-model="selectedTemplateId"
                    class="text-xs px-2 py-1.5 bg-surface-800 border border-surface-700 text-surface-200 rounded-lg outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="">-- คัดลอกกลุ่มเดิม --</option>
                    <option v-for="t in addonTemplates" :key="t.id" :value="t.id">
                      {{ t.name }} ({{ t.options.length }} ตัวเลือก)
                    </option>
                  </select>
                  <button
                    v-if="addonTemplates.length > 0 && selectedTemplateId"
                    type="button"
                    @click="copyFromTemplate"
                    class="text-xs px-2 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 rounded-lg font-bold transition-all active:scale-95 shrink-0"
                  >
                    + คัดลอก
                  </button>
                  <button
                    type="button"
                    @click="addGroup"
                    class="text-xs px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded-lg font-bold transition-all active:scale-95 shrink-0"
                  >
                    + เพิ่มกลุ่ม
                  </button>
                </div>
              </div>

              <div
                v-if="localAddonGroups.length === 0"
                class="text-xs text-surface-600 italic text-center py-5 border border-dashed border-surface-700 rounded-xl"
              >
                ยังไม่มีตัวเลือกเสริม — กด "เพิ่มกลุ่ม" เพื่อเริ่ม
              </div>

              <div
                v-for="group in localAddonGroups"
                :key="group.id"
                class="bg-surface-950 border border-surface-700 rounded-xl p-4 space-y-3"
              >
                <!-- ชื่อกลุ่ม + ลบกลุ่ม -->
                <div class="flex items-center gap-2">
                  <input
                    v-model="group.name"
                    type="text"
                    placeholder="ชื่อกลุ่ม เช่น ความเผ็ด, รสชาติ..."
                    class="flex-1 bg-surface-900 border border-surface-700 text-surface-50 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 placeholder:text-surface-600 transition-colors"
                  />
                  <button
                    type="button"
                    @click="removeGroup(group.id)"
                    class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 shrink-0"
                  >
                    <X :size="14" />
                  </button>
                </div>

                <!-- การตั้งค่ากลุ่ม -->
                <div class="flex items-center gap-4 text-xs">
                  <label class="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      @click="group.isRequired = !group.isRequired"
                      class="relative w-8 h-[18px] rounded-full transition-all shrink-0"
                      :class="group.isRequired ? 'bg-red-500' : 'bg-surface-600'"
                    >
                      <div
                        class="absolute top-[3px] left-[3px] w-3 h-3 bg-white rounded-full shadow transition-transform"
                        :class="group.isRequired ? 'translate-x-[14px]' : 'translate-x-0'"
                      />
                    </button>
                    <span class="text-surface-400 font-medium">บังคับเลือก</span>
                  </label>

                  <label class="flex items-center gap-1.5">
                    <span class="text-surface-400 font-medium">เลือกได้สูงสุด</span>
                    <input
                      v-model.number="group.maxSelect"
                      type="number"
                      min="1"
                      max="20"
                      placeholder="-"
                      class="w-12 bg-surface-900 border border-surface-700 text-surface-50 rounded-lg px-2 py-1 text-xs text-center outline-none focus:border-primary-500 transition-colors"
                    />
                    <span class="text-surface-400">ตัว</span>
                  </label>
                </div>

                <!-- รายการตัวเลือก -->
                <div class="space-y-1.5">
                  <div
                    v-for="opt in group.options"
                    :key="opt.id"
                    class="flex items-center gap-2"
                  >
                    <input
                      v-model="opt.name"
                      type="text"
                      placeholder="ชื่อตัวเลือก..."
                      class="flex-1 bg-surface-900 border border-surface-700 text-surface-50 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500 placeholder:text-surface-600 transition-colors"
                    />
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="text-xs text-surface-500">฿</span>
                      <input
                        v-model.number="opt.price"
                        type="number"
                        min="0"
                        placeholder="0"
                        class="w-14 bg-surface-900 border border-surface-700 text-surface-50 rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      @click="removeOption(group.id, opt.id)"
                      class="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-800 hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-all active:scale-95 shrink-0"
                    >
                      <X :size="12" />
                    </button>
                  </div>

                  <button
                    type="button"
                    @click="addOption(group.id)"
                    class="w-full py-2 text-xs text-primary-400 hover:text-primary-300 border border-dashed border-surface-700 hover:border-primary-500/50 rounded-lg transition-all font-bold"
                  >
                    + เพิ่มตัวเลือก
                  </button>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <p v-if="errorMsg" class="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
              ⚠️ {{ errorMsg }}
            </p>

            <!-- Offline Warning -->
            <div v-if="!isOnline" class="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span class="text-2xl mt-0.5">📶</span>
              <div>
                <h4 class="font-bold text-red-500">ฟีเจอร์นี้ต้องการอินเทอร์เน็ต</h4>
                <p class="text-sm text-red-400/80 mt-1">
                  กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อ{{ isEditing ? 'แก้ไข' : 'เพิ่ม' }}หมวดหมู่ (ระบบเปลี่ยนเป็นแบบ Online-Only เพื่อป้องกันข้อมูลซ้ำซ้อน)
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="$emit('close')"
                class="flex-1 py-3 bg-surface-800 hover:bg-surface-700 rounded-xl text-sm font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                :disabled="isSaving || !isOnline"
                class="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-900/20"
              >
                {{ isSaving ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { useCategories, type CategoryFormData } from '~/composables/useCategories'
import type { Category, AddonGroup } from '~/types'
import { ChevronDown as IconChevronDown, X } from 'lucide-vue-next'
import { db } from '~/db'

const props = defineProps<{
  isOpen: boolean
  editItem?: Category | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { isOnline } = useSync()
const { fetchAll, createCategory, updateCategory } = useCategories()

const allCategories = ref<Category[]>([])
const parentOptions = computed(() => {
  // กรองตัวมันเองออก ถ้ากำลังแก้ไขอยู่ (ป้องกันการเลือกตัวเองเป็นพ่อ)
  if (props.editItem?.id) {
    return allCategories.value.filter(c => c.id !== props.editItem?.id)
  }
  return allCategories.value
})

// --- ป้องกัน Modal ปิดเมื่อลากเมาส์ (Drag to Select) ---
let backdropMousedownFlag = false
function backdropMousedownHandler() { backdropMousedownFlag = true }
function backdropMouseupHandler() {
  if (backdropMousedownFlag) emit('close')
  backdropMousedownFlag = false
}

const isEditing = computed(() => !!props.editItem)
const isSaving = ref(false)
const errorMsg = ref('')

// ฟอร์มเริ่มต้น
const defaultForm = (): CategoryFormData => ({
  name: '',
  parentId: undefined,
  parentUuid: undefined,
  description: '',
  color: '#6366f1',
  sortOrder: 1,
  isActive: true,
  addonGroups: [],
})

const form = ref<CategoryFormData>(defaultForm())
const localAddonGroups = ref<AddonGroup[]>([])

// --- Template: คัดลอกกลุ่มจากสินค้า/หมวดหมู่อื่น ---
const addonTemplates = ref<AddonGroup[]>([])
const selectedTemplateId = ref('')

async function loadAddonTemplates() {
  const map = new Map<string, AddonGroup>()

  const [products, categories] = await Promise.all([
    db.products.filter(p => !p.isDeleted).toArray(),
    db.categories.filter(c => !c.isDeleted).toArray(),
  ])

  const addGroups = (groups: AddonGroup[] | undefined) => {
    groups?.forEach(g => {
      const sig = `${g.name}|${g.isRequired}|${g.options.map(o => `${o.name}:${o.price}`).join(',')}`
      if (!map.has(sig)) map.set(sig, g)
    })
  }

  products.forEach(p => addGroups(p.addonGroups))
  categories.forEach(c => addGroups((c as any).addonGroups))

  addonTemplates.value = Array.from(map.values())
  selectedTemplateId.value = ''
}

function copyFromTemplate() {
  if (!selectedTemplateId.value) return
  const tpl = addonTemplates.value.find(t => t.id === selectedTemplateId.value)
  if (!tpl) return

  localAddonGroups.value.push({
    id: uuidv4(),
    name: tpl.name,
    isRequired: tpl.isRequired,
    maxSelect: tpl.maxSelect,
    options: tpl.options.map(o => ({ id: uuidv4(), name: o.name, price: o.price })),
  })
  selectedTemplateId.value = ''
}

// --- จัดการ Add-on Groups ---
function addGroup() {
  localAddonGroups.value.push({ id: uuidv4(), name: '', isRequired: false, options: [] })
}

function removeGroup(groupId: string) {
  const idx = localAddonGroups.value.findIndex(g => g.id === groupId)
  if (idx !== -1) localAddonGroups.value.splice(idx, 1)
}

function addOption(groupId: string) {
  const group = localAddonGroups.value.find(g => g.id === groupId)
  if (group) group.options.push({ id: uuidv4(), name: '', price: 0 })
}

function removeOption(groupId: string, optId: string) {
  const group = localAddonGroups.value.find(g => g.id === groupId)
  if (!group) return
  const idx = group.options.findIndex(o => o.id === optId)
  if (idx !== -1) group.options.splice(idx, 1)
}

// เมื่อเปิด Modal ใหม่ หรือสลับ editItem → Reset/Fill form
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    errorMsg.value = ''

    // โหลดรายการหมวดหมู่ทั้งหมดเพื่อทำ Dropdown
    fetchAll().then(res => {
      allCategories.value = res
    })

    // โหลด templates สำหรับคัดลอกกลุ่ม
    loadAddonTemplates()

    if (props.editItem) {
      form.value = {
        name: props.editItem.name,
        parentId: props.editItem.parentId,
        parentUuid: props.editItem.parentUuid,
        description: props.editItem.description ?? '',
        color: props.editItem.color ?? '#6366f1',
        sortOrder: props.editItem.sortOrder,
        isActive: props.editItem.isActive,
      }
      // deep copy เพื่อไม่ให้แก้ไข reactive ต้นฉบับโดยตรง
      localAddonGroups.value = JSON.parse(JSON.stringify(props.editItem.addonGroups ?? []))
    } else {
      form.value = defaultForm()
      localAddonGroups.value = []
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!form.value.name.trim()) {
    errorMsg.value = 'กรุณาใส่ชื่อหมวดหมู่'
    return
  }
  isSaving.value = true
  errorMsg.value = ''

  // ค้นหา UUID ของ Parent ก่อนส่ง
  if (form.value.parentId) {
    const parent = allCategories.value.find(c => c.id === form.value.parentId)
    form.value.parentUuid = parent?.uuid
  } else {
    form.value.parentUuid = undefined
  }

  // กรอง groups ที่ไม่มีชื่อออก + strip Vue reactive proxy ด้วย JSON round-trip
  // (IndexedDB Structured Clone ไม่รองรับ Proxy object)
  form.value.addonGroups = JSON.parse(JSON.stringify(
    localAddonGroups.value
      .filter(g => g.name.trim() !== '')
      .map(g => ({
        ...g,
        name: g.name.trim(),
        options: g.options
          .filter(o => o.name.trim() !== '')
          .map(o => ({ ...o, name: o.name.trim() })),
      }))
  ))

  try {
    if (isEditing.value && props.editItem?.id) {
      await updateCategory(props.editItem.id, form.value)
    } else {
      await createCategory(form.value)
    }
    emit('saved')
    emit('close')
  } catch (e: any) {
    errorMsg.value = e.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isSaving.value = false
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
