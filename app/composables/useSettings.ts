// =============================================================================
// composables/useSettings.ts
// Composable สำหรับจัดการ "การตั้งค่าร้านค้า" เช่น ชื่อร้าน, หัวใบเสร็จ
// เก็บลง IndexedDB (appSettings) ผ่าน getSetting/setSetting จาก db
// =============================================================================

import { getSetting, setSetting } from '~/db'

// ---------------------------------------------------------------------------
// Interface: รูปแบบข้อมูลการตั้งค่าใบเสร็จ
// ---------------------------------------------------------------------------
export interface ReceiptSettings {
  deviceCode: string        // รหัสประจำเครื่อง (เช่น D1, D2) เพื่อป้องกันเลขบิลซ้ำ
  shopName: string          // ชื่อร้าน
  shopTagline?: string      // คำอธิบายสั้น เช่น "ยำรสเด็ด อร่อยทุกคำ!"
  shopPhone?: string        // เบอร์โทรศัพท์
  shopAddress?: string      // ที่อยู่
  footerMessage?: string    // ข้อความท้ายใบเสร็จ
  paperSize: '58mm' | '80mm' // ขนาดกระดาษ Thermal Printer
  showOrderNumber: boolean   // แสดงเลขที่บิล
  showStaffName: boolean     // แสดงชื่อพนักงาน
  showTaxInfo: boolean       // แสดงข้อมูลภาษี (VAT)
  geminiApiKey?: string     // Google Gemini API Key สำหรับ AI Analysis
  geminiModel?: string      // รุ่นโมเดล Gemini (Default: models/gemini-3.1-flash-lite-preview)
  groqApiKey?: string       // Groq API Key (Llama 3) สำหรับเป็นตัวสำรอง (Fallback)
  groqModel?: string        // รุ่นโมเดล Groq (Default: llama-3.3-70b-versatile)
  openRouterApiKey?: string // OpenRouter API Key (ศูนย์รวม AI ฟรี) สำหรับความยั่งยืน
  openRouterModels?: string // รุ่นโมเดล OpenRouter (คั่นด้วยคอมมา)
}

// ---------------------------------------------------------------------------
// ค่าเริ่มต้น
// ---------------------------------------------------------------------------
export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  deviceCode: 'D1',          // ค่าเริ่มต้นคือ D1
  shopName: 'Yum2K',
  shopTagline: 'ร้านยำรสเด็ด',
  shopPhone: '',
  shopAddress: '',
  footerMessage: 'ขอบคุณที่อุดหนุนครับ/ค่ะ',
  paperSize: '80mm',
  showOrderNumber: true,
  showStaffName: true,
  showTaxInfo: false,
  geminiApiKey: '',
  geminiModel: 'models/gemini-3.1-flash-lite-preview',
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  openRouterApiKey: '',
  openRouterModels: 'inclusionai/ling-2.6-1t:free,z-ai/glm-4.5-air:free,openai/gpt-oss-120b:free',
}

const RECEIPT_SETTINGS_KEY = 'receipt_settings'

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------
export function useSettings() {
  const receiptSettings = ref<ReceiptSettings>({ ...DEFAULT_RECEIPT_SETTINGS })
  const isSaving = ref(false)
  const isLoading = ref(false)

  /** โหลดค่าตั้งค่าจาก IndexedDB */
  async function loadReceiptSettings() {
    isLoading.value = true
    try {
      const saved = await getSetting<ReceiptSettings>(RECEIPT_SETTINGS_KEY, DEFAULT_RECEIPT_SETTINGS)
      // รวม field ใหม่ที่อาจไม่มีในข้อมูลเก่า (graceful merge)
      receiptSettings.value = { ...DEFAULT_RECEIPT_SETTINGS, ...saved }
    } finally {
      isLoading.value = false
    }
  }

  /** บันทึกการตั้งค่าลง IndexedDB */
  async function saveReceiptSettings(data: ReceiptSettings): Promise<void> {
    isSaving.value = true
    try {
      await setSetting(RECEIPT_SETTINGS_KEY, data)
      receiptSettings.value = { ...data }
    } finally {
      isSaving.value = false
    }
  }

  return {
    receiptSettings,
    isSaving,
    isLoading,
    loadReceiptSettings,
    saveReceiptSettings,
  }
}
