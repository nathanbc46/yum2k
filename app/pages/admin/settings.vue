<!-- =============================================================================
  pages/admin/settings.vue
  หน้าตั้งค่าร้านค้าและใบเสร็จ สำหรับ Admin
  - ตั้งค่าข้อมูลร้าน (ชื่อ, เบอร์โทร, ที่อยู่)
  - ตั้งค่าใบเสร็จ (ขนาดกระดาษ, ข้อความท้ายบิล)
  - Preview ใบเสร็จแบบ Real-time
============================================================================= -->
<template>
  <div class="flex-1 overflow-y-auto p-6">
    <div class="max-w-3xl mx-auto space-y-6">

      <!-- Page Header -->
      <div>
        <h1 class="text-2xl font-bold text-surface-50">⚙️ ตั้งค่าร้านค้า</h1>
        <p class="text-sm text-surface-400 mt-1">ข้อมูลร้านและการตั้งค่าการพิมพ์ใบเสร็จ</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        <!-- ====== Left: Settings Form ====== -->
        <div class="lg:col-span-3 space-y-5">

          <!-- ส่วนข้อมูลร้าน -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">ข้อมูลร้านค้า</h2>
            <div class="space-y-4">
              <div>
                <label class="form-label">ชื่อร้าน <span class="text-danger">*</span></label>
                <input v-model="form.shopName" type="text" placeholder="เช่น Yum2K, ร้านยำรสเด็ด" class="form-input" />
              </div>
              <div>
                <label class="form-label">คำอธิบายร้าน (Tagline)</label>
                <input v-model="form.shopTagline" type="text" placeholder="เช่น ยำรสเด็ด อร่อยทุกคำ!" class="form-input" />
              </div>
              <div>
                <label class="form-label">เบอร์โทรศัพท์</label>
                <input v-model="form.shopPhone" type="tel" placeholder="เช่น 091-234-5678" class="form-input" />
              </div>
              <div>
                <label class="form-label">ที่อยู่ร้าน</label>
                <textarea
                  v-model="form.shopAddress"
                  rows="2"
                  placeholder="ที่อยู่สำหรับแสดงในใบเสร็จ..."
                  class="form-input resize-none"
                />
              </div>
              <div>
                <label class="form-label">ข้อความท้ายใบเสร็จ</label>
                <input v-model="form.footerMessage" type="text" placeholder="เช่น ขอบคุณที่อุดหนุนครับ/ค่ะ" class="form-input" />
              </div>
            </div>
          </div>

          <!-- ส่วนตั้งค่าใบเสร็จ -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">การพิมพ์ใบเสร็จ</h2>
            <div class="space-y-4">
              <!-- Paper Size -->
              <div>
                <label class="form-label">ขนาดกระดาษ Thermal Printer</label>
                <div class="grid grid-cols-2 gap-3 mt-1">
                  <button
                    v-for="size in ['58mm', '80mm']"
                    :key="size"
                    type="button"
                    @click="form.paperSize = size as any"
                    :class="[
                      'py-3 rounded-xl border font-semibold text-sm transition-all',
                      form.paperSize === size
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-surface-700 bg-surface-950 text-surface-400 hover:border-surface-500'
                    ]"
                  >
                    🖨️ {{ size }}
                    <div class="text-[10px] font-normal opacity-70 mt-0.5">
                      {{ size === '58mm' ? 'พื้นที่พิมพ์ 48mm' : 'พื้นที่พิมพ์ 72mm' }}
                    </div>
                  </button>
                </div>
              </div>

              <!-- Toggle Options -->
              <div class="space-y-3">
                <div
                  v-for="toggle in toggleOptions"
                  :key="toggle.key"
                  class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800"
                >
                  <div>
                    <div class="text-sm font-semibold text-surface-50">{{ toggle.label }}</div>
                    <div class="text-xs text-surface-500">{{ toggle.desc }}</div>
                  </div>
                  <button
                    type="button"
                    @click="(form as any)[toggle.key] = !(form as any)[toggle.key]"
                    class="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
                    :class="(form as any)[toggle.key] ? 'bg-primary-600' : 'bg-surface-700'"
                  >
                    <span
                      class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                      :class="(form as any)[toggle.key] ? 'translate-x-5' : 'translate-x-0.5'"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <button
            @click="handleSave"
            :disabled="isSaving"
            class="w-full py-3.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-900/20"
          >
            {{ isSaving ? 'กำลังบันทึก...' : '✅ บันทึกการตั้งค่า' }}
          </button>

          <!-- Success Message -->
          <p v-if="saveSuccess" class="text-center text-success text-sm animate-pulse">
            ✅ บันทึกสำเร็จแล้ว!
          </p>
        </div>

        <!-- ====== Right: Live Preview ====== -->
        <div class="lg:col-span-2">
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-4 sticky top-6">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">ตัวอย่างใบเสร็จ</h2>
            <div class="flex justify-center bg-surface-950 rounded-xl p-4 overflow-auto">
              <!-- Mock Receipt Preview -->
              <div
                :class="['font-mono text-black bg-white p-3 text-[10px] shadow-lg', form.paperSize === '58mm' ? 'w-[48mm]' : 'w-[72mm]']"
              >
                <div class="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                  <p class="font-black text-sm uppercase">{{ form.shopName || 'ชื่อร้าน' }}</p>
                  <p v-if="form.shopTagline" class="text-[9px]">{{ form.shopTagline }}</p>
                  <p v-if="form.shopPhone" class="text-[9px]">📞 {{ form.shopPhone }}</p>
                  <p v-if="form.shopAddress" class="text-[8px] leading-tight">{{ form.shopAddress }}</p>
                  <p class="text-[8px] text-gray-400 mt-0.5">07/04/2026 13:30</p>
                </div>
                <div class="text-[9px] space-y-0.5 mb-2">
                  <p v-if="form.showOrderNumber">เลขที่บิล: <strong>YUM-20260407-0001</strong></p>
                  <p v-if="form.showStaffName">พนักงาน: ผู้จัดการ</p>
                  <p>ชำระ: เงินสด</p>
                </div>
                <div class="border-t border-dashed border-gray-400 pt-1.5 mb-2">
                  <div class="flex justify-between"><span class="flex-1">ยำมะม่วง</span><span class="w-5 text-right">x1</span><span class="w-12 text-right">60</span></div>
                  <div class="text-[8px] text-gray-400 pl-2">เผ็ดน้อย</div>
                  <div class="flex justify-between mt-1"><span class="flex-1">ข้าวสวย</span><span class="w-5 text-right">x2</span><span class="w-12 text-right">40</span></div>
                </div>
                <div class="border-t border-dashed border-gray-400 pt-1 text-[9px] space-y-0.5 mb-2">
                  <div class="flex justify-between"><span>ยอดรวม</span><span>100</span></div>
                  <div class="flex justify-between font-black text-xs border-t border-gray-400 pt-0.5 mt-0.5"><span>ยอดสุทธิ</span><span>100 บาท</span></div>
                </div>
                <div class="text-center border-t border-dashed border-gray-400 pt-1.5 text-[9px]">
                  <p class="font-bold">{{ form.footerMessage || 'ขอบคุณที่อุดหนุน' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettings, type ReceiptSettings } from '~/composables/useSettings'

definePageMeta({ layout: 'admin' })

const { receiptSettings, isSaving, loadReceiptSettings, saveReceiptSettings } = useSettings()

// ใช้ reactive copy เพื่อแก้ไขก่อนบันทึก
const form = reactive<ReceiptSettings>({
  shopName: 'Yum2K',
  shopTagline: '',
  shopPhone: '',
  shopAddress: '',
  footerMessage: 'ขอบคุณที่อุดหนุนครับ/ค่ะ',
  paperSize: '80mm',
  showOrderNumber: true,
  showStaffName: true,
  showTaxInfo: false,
})

const saveSuccess = ref(false)

onMounted(async () => {
  await loadReceiptSettings()
  Object.assign(form, receiptSettings.value)
})

const toggleOptions = [
  { key: 'showOrderNumber', label: 'แสดงเลขที่บิล', desc: 'แสดงเลขที่บิลบนใบเสร็จ' },
  { key: 'showStaffName', label: 'แสดงชื่อพนักงาน', desc: 'แสดงชื่อพนักงานที่ขาย' },
  { key: 'showTaxInfo', label: 'แสดงข้อมูลภาษี (VAT)', desc: 'แสดงยอดภาษีแยกในใบเสร็จ' },
]

async function handleSave() {
  saveSuccess.value = false
  await saveReceiptSettings({ ...form })
  saveSuccess.value = true
  setTimeout(() => saveSuccess.value = false, 3000)
}
</script>

<style scoped>
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
.form-input:focus {
  border-color: var(--color-primary-500, #8b5cf6);
}
</style>
