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
      
      <!-- RawBT Status Alert -->
      <div 
        v-if="!isRawBTConnected"
        class="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top duration-500"
      >
        <div class="w-10 h-10 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center shrink-0 text-xl">
          ⚠️
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-bold text-red-400">ตรวจไม่พบแอป RawBT</h3>
          <p class="text-xs text-surface-400 mt-1 leading-relaxed">
            ระบบพิมพ์แบบไร้เสียง (Silent Printing) จะไม่ทำงานหากไม่ได้เปิดแอป RawBT ทิ้งไว้ 
            กรุณาติดตั้งแอปหรือเปิดแอปในเครื่องนี้เพื่อใช้งาน หากยังไม่มีสามารถดาวน์โหลดได้ที่ 
            <a href="https://rawbt.ru/en/windows.html" target="_blank" class="text-primary-400 underline decoration-primary-400/30">Windows</a> หรือ 
            <a href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter" target="_blank" class="text-primary-400 underline decoration-primary-400/30">Android (Play Store)</a>
          </p>
          <button 
            @click="checkPrinterStatus"
            class="mt-3 text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all"
          >
            🔄 ตรวจสอบการเชื่อมต่ออีกครั้ง
          </button>
        </div>
      </div>

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
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">ชื่อร้าน <span class="text-danger">*</span></label>
                  <input v-model="form.shopName" type="text" placeholder="เช่น Yum2K, ร้านยำรสเด็ด" class="form-input" />
                </div>
                <div>
                  <label class="form-label">รหัสเครื่อง (Device Code) <span class="text-danger">*</span></label>
                  <input v-model="form.deviceCode" type="text" placeholder="เช่น D1, TAB-01" class="form-input" />
                  <p class="text-[10px] text-surface-500 mt-1">ใช้แยกเลขบิลระหว่างเครื่อง (ห้ามซ้ำกับเครื่องอื่น)</p>
                </div>
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

          <!-- การรวมระบบ AI (AI Integration) -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">การตั้งค่า AI อัจฉริยะ</h2>
            <div class="space-y-6">
              
              <!-- Gemini -->
              <div class="p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🤖</span>
                    <span class="text-sm font-bold text-primary-400">Google Gemini</span>
                  </div>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-[10px] text-primary-400 underline decoration-primary-400/30">รับ API Key</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="form-label !text-[10px]">API Key</label>
                    <input v-model="form.geminiApiKey" type="password" placeholder="AI_xxxxxxxx" class="form-input font-mono !text-[11px]" />
                  </div>
                  <div>
                    <label class="form-label !text-[10px]">Model Name</label>
                    <input v-model="form.geminiModel" type="text" placeholder="เช่น gemini-3.1-flash-lite-preview" class="form-input font-mono !text-[11px]" />
                  </div>
                </div>
              </div>

              <!-- OpenRouter -->
              <div class="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🌐</span>
                    <span class="text-sm font-bold text-amber-400">OpenRouter (แนะนำ)</span>
                  </div>
                  <a href="https://openrouter.ai/keys" target="_blank" class="text-[10px] text-amber-400 underline decoration-amber-400/30">รับ API Key</a>
                </div>
                <div class="space-y-3">
                  <div>
                    <label class="form-label !text-[10px]">API Key</label>
                    <input v-model="form.openRouterApiKey" type="password" placeholder="sk-or-v1-xxxx..." class="form-input font-mono !text-[11px]" />
                  </div>
                  <div>
                    <label class="form-label !text-[10px]">Models (คั่นด้วยคอมมา สำหรับระบบสำรองอัตโนมัติ)</label>
                    <textarea v-model="form.openRouterModels" rows="2" placeholder="เช่น qwen/qwen3-32b:free, llama-3.3-70b-versatile:free" class="form-input font-mono !text-[11px] resize-none" />
                  </div>
                </div>
              </div>

              <!-- Groq -->
              <div class="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">⚡</span>
                    <span class="text-sm font-bold text-cyan-400">Groq (Fallback)</span>
                  </div>
                  <a href="https://console.groq.com/keys" target="_blank" class="text-[10px] text-cyan-400 underline decoration-cyan-400/30">รับ API Key</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="form-label !text-[10px]">API Key</label>
                    <input v-model="form.groqApiKey" type="password" placeholder="gsk_xxxxxxxx" class="form-input font-mono !text-[11px]" />
                  </div>
                  <div>
                    <label class="form-label !text-[10px]">Model Name</label>
                    <input v-model="form.groqModel" type="text" placeholder="เช่น llama-3.3-70b-versatile" class="form-input font-mono !text-[11px]" />
                  </div>
                </div>
              </div>

              <p class="text-[10px] text-surface-500 italic text-center">หากเว้นช่อง Model ไว้ ระบบจะใช้ค่าเริ่มต้นที่เหมาะสมที่สุดให้ทันทีค่ะ</p>
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
                    class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                    :class="(form as any)[toggle.key] ? 'bg-primary-500' : 'bg-surface-700'"
                  >
                    <div
                      class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                      :class="(form as any)[toggle.key] ? 'translate-x-[22px]' : 'translate-x-0'"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ส่วนจัดการข้อมูล (Sync Management) -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">การจัดการข้อมูล Cloud</h2>
            <div class="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div class="flex items-start gap-3">
                <span class="text-lg">⚠️</span>
                <div>
                  <h3 class="text-sm font-bold text-amber-400">บังคับส่งข้อมูลขึ้น Cloud (Force Push)</h3>
                  <p class="text-[10px] text-surface-400 mt-1">
                    ใช้ในกรณีที่ฐานข้อมูลบน Cloud ถูกล้างข้อมูล หรือต้องการเขียนทับข้อมูลบน Cloud ด้วยข้อมูลจากเครื่องนี้ทั้งหมด
                    <br />(หมวดหมู่สินค้า, รายการสินค้า และรายชื่อพนักงาน)
                  </p>
                </div>
              </div>
              <div class="mt-4 flex justify-end">
                <button
                  type="button"
                  @click="handleForcePush"
                  :disabled="isForcePushing || !isOnline"
                  class="btn-touch px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50"
                >
                  {{ isForcePushing ? '⌛ กำลังส่งข้อมูล...' : '📤 เริ่มส่งข้อมูลทั้งหมด (Force Upload)' }}
                </button>
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
        </div>

        <!-- ====== Right: Live Preview ====== -->
        <div class="lg:col-span-2">
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-4 lg:sticky lg:top-6">
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
                  <p v-if="form.showOrderNumber">เลขที่บิล: <strong>YUM-260407-1330-{{ form.deviceCode || 'D1' }}-0001</strong></p>
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
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import { usePrinter } from '~/composables/usePrinter'

definePageMeta({ layout: 'admin' })

const { receiptSettings, isSaving, loadReceiptSettings, saveReceiptSettings } = useSettings()
const masterSync = useMasterDataSync()
const { fetchRemoteOrders, syncPendingOrders, isOnline } = useSync()
const { checkRawBTStatus } = usePrinter()
const { confirm } = useConfirm()
const toast = useToast()

const isRawBTConnected = ref(true)

// ใช้ reactive copy เพื่อแก้ไขก่อนบันทึก
const form = reactive<ReceiptSettings>({
  deviceCode: 'D1',
  shopName: 'Yum2K',
  shopTagline: '',
  shopPhone: '',
  shopAddress: '',
  footerMessage: 'ขอบคุณที่อุดหนุนครับ/ค่ะ',
  paperSize: '80mm',
  showOrderNumber: true,
  showStaffName: true,
  showTaxInfo: false,
  geminiApiKey: '',
  geminiModel: '',
  groqApiKey: '',
  groqModel: '',
  openRouterApiKey: '',
  openRouterModels: '',
})

onMounted(async () => {
  await loadReceiptSettings()
  Object.assign(form, receiptSettings.value)
  await checkPrinterStatus()
})

async function checkPrinterStatus() {
  isRawBTConnected.value = await checkRawBTStatus()
}

const toggleOptions = [
  { key: 'showOrderNumber', label: 'แสดงเลขที่บิล', desc: 'แสดงเลขที่บิลบนใบเสร็จ' },
  { key: 'showStaffName', label: 'แสดงชื่อพนักงาน', desc: 'แสดงชื่อพนักงานที่ขาย' },
  { key: 'showTaxInfo', label: 'แสดงข้อมูลภาษี (VAT)', desc: 'แสดงยอดภาษีแยกในใบเสร็จ' },
]

async function handleSave() {
  try {
    await saveReceiptSettings({ ...form })
    toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว')
  } catch (e: any) {
    toast.error('ล้มเหลว: ' + e.message)
  }
}

const isForcePushing = ref(false)

async function handleForcePush() {
  const confirmed = await confirm({
    title: 'ยืนยันการส่งข้อมูลทั้งหมดขึ้น Cloud',
    message: '⚠️ แจ้งเตือน: นี่คือการส่งข้อมูลทั้งหมดในเครื่องขึ้น Cloud\nข้อมูลบน Cloud จะถูกอัปเดตตามข้อมูลในเครื่องนี้\nต้องการดำเนินการต่อหรือไม่?',
    confirmText: 'ยืนยันดำเนินการ',
    type: 'warning'
  })
  if (!confirmed) return

  isForcePushing.value = true
  try {
    // ซิงค์ทุกอย่าง (รวมถึง Order) เพื่อความสมบูรณ์
    const res = await syncPendingOrders(true) 
    toast.success([
      '📤 บังคับส่งข้อมูลเสร็จสมบูรณ์',
      `• ข้อมูลออร์เดอร์: ${res.orders.success} รายการ`,
      `• ประวัติสต็อก: ${res.auditLogs.success} รายการ`,
    ].join('\n'), 6000)
  } catch (err: any) {
    console.error('Force Push Error:', err)
    toast.error('การส่งข้อมูลล้มเหลว: ' + err.message)
  } finally {
    isForcePushing.value = false
  }
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
