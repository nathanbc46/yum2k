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
  shopLogo?: string         // โลโก้ร้านค้า (Base64 data URL)
  footerMessage?: string    // ข้อความท้ายใบเสร็จ
  paperSize: '58mm' | '80mm' // ขนาดกระดาษ Thermal Printer
  printerMethod: 'wifi' | 'rawbt' | 'usb' | 'browser' // วิธีการพิมพ์
  printerIp?: string      // IP ของ printer (สำหรับ WiFi method)
  printerPort?: number    // TCP port ของ printer (ปกติ 9100)
  printerBridgeUrl?: string // URL ของ Local Print Bridge (ถ้า app รันบน cloud)
  printerCodePage?: number  // ESC/POS code page สำหรับภาษาไทย (20=Epson, 21=Xprinter, 255=Win874)
  printerImageMode?: boolean // พิมพ์แบบ bitmap image (แก้ปัญหา printer ไม่มี Thai font)
  showOrderNumber: boolean   // แสดงเลขที่บิล
  showStaffName: boolean     // แสดงชื่อพนักงาน
  showTaxInfo: boolean       // แสดงข้อมูลภาษี (VAT)
  geminiApiKey?: string     // Google Gemini API Key สำหรับ AI Analysis
  geminiModel?: string      // รุ่นโมเดล Gemini (Default: models/gemini-3.1-flash-lite-preview)
  groqApiKey?: string       // Groq API Key (Llama 3) สำหรับเป็นตัวสำรอง (Fallback)
  groqModel?: string        // รุ่นโมเดล Groq (Default: llama-3.3-70b-versatile)
  openRouterApiKey?: string // OpenRouter API Key (ศูนย์รวม AI ฟรี) สำหรับความยั่งยืน
  openRouterModels?: string // รุ่นโมเดล OpenRouter (คั่นด้วยคอมมา)
  // LINE Notifications
  lineNewOrder?: boolean        // แจ้งเตือนออร์เดอร์ใหม่ (default: true)
  lineLowStock?: boolean        // แจ้งเตือนสต็อกใกล้หมด (default: true)
  lineDailySummary?: boolean    // ส่งสรุปยอดรายวัน (default: true)
  lineDailySummaryHour?: number // ชั่วโมงที่ส่งสรุป 0-23 (default: 22)
  // Kitchen Display System (KDS)
  enableKds: boolean            // เปิดใช้งานจอห้องเครื่อง (KDS) หรือไม่
  // POS Display
  showSubcategoryProducts: boolean // แสดงสินค้าของหมวดหมู่ย่อยเมื่อเลือกหมวดหมู่หลัก
  printKitchenCopy: boolean        // พิมพ์ใบสั่งทำอาหาร (Kitchen Copy) แยกต่างหาก
  receiptMarginLeft?: number       // Margin ซ้าย (หน่วย: ตัวอักษร) สำหรับ text mode / pixels สำหรับ image mode
  receiptMarginRight?: number      // Margin ขวา (หน่วย: ตัวอักษร) สำหรับ text mode / pixels สำหรับ image mode
  receiptQtyWidth?: number         // ความกว้างคอลัมน์จำนวน (visual columns), default: 6
  receiptPriceWidth?: number       // ความกว้างคอลัมน์ราคา (visual columns), default: 8
}

// ---------------------------------------------------------------------------
// ค่าเริ่มต้นแบบ static (ไม่ขึ้นกับ env)
// ---------------------------------------------------------------------------
const STATIC_DEFAULTS: ReceiptSettings = {
  deviceCode: 'D1',
  shopName: 'Yum2K',
  shopTagline: 'ร้านยำรสเด็ด',
  shopPhone: '',
  shopAddress: '',
  shopLogo: '',
  footerMessage: 'ขอบคุณที่อุดหนุนครับ/ค่ะ',
  paperSize: '80mm',
  printerMethod: 'usb' as const,
  printerIp: '',
  printerPort: 9100,
  printerBridgeUrl: '',
  printerCodePage: 70,
  printerImageMode: false,
  showOrderNumber: true,
  showStaffName: true,
  showTaxInfo: false,
  geminiApiKey: '',
  geminiModel: 'models/gemini-3.1-flash-lite-preview',
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  openRouterApiKey: '',
  openRouterModels: 'inclusionai/ling-2.6-1t:free,z-ai/glm-4.5-air:free,openai/gpt-oss-120b:free',
  lineNewOrder: false,
  lineLowStock: false,
  lineDailySummary: true,
  lineDailySummaryHour: 22,
  enableKds: false,
  showSubcategoryProducts: false,
  printKitchenCopy: false,
  receiptMarginLeft: 0,
  receiptMarginRight: 0,
  receiptQtyWidth: 6,
  receiptPriceWidth: 8,
}

// compat export สำหรับโค้ดเก่าที่ import DEFAULT_RECEIPT_SETTINGS โดยตรง
export const DEFAULT_RECEIPT_SETTINGS = STATIC_DEFAULTS

/** ดึงค่า default รวม env fallback keys (ใช้ได้เฉพาะ client-side) */
function getDefaultSettings(): ReceiptSettings {
  if (!import.meta.client) return { ...STATIC_DEFAULTS }
  const config = useRuntimeConfig()
  return {
    ...STATIC_DEFAULTS,
    geminiApiKey: (config.public.defaultGeminiKey as string) || '',
    groqApiKey: (config.public.defaultGroqKey as string) || '',
    openRouterApiKey: (config.public.defaultOpenRouterKey as string) || '',
  }
}

const RECEIPT_SETTINGS_KEY = 'receipt_settings'

// ---------------------------------------------------------------------------
// Singleton State: ใช้ร่วมกันทุก caller ที่เรียก useSettings()
// pattern เดียวกับ useCart.ts เพื่อให้ posStore และ settings.vue ใช้ ref เดียวกัน
// ---------------------------------------------------------------------------
const receiptSettings = ref<ReceiptSettings>(STATIC_DEFAULTS)
const isSaving = ref(false)
const isLoading = ref(false)

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------
export function useSettings() {
  /** โหลดค่าตั้งค่าจาก IndexedDB (form แสดงเฉพาะ key ที่ user กรอก ไม่รวม env default) */
  async function loadReceiptSettings() {
    isLoading.value = true
    try {
      const saved = await getSetting<ReceiptSettings>(RECEIPT_SETTINGS_KEY, STATIC_DEFAULTS)
      receiptSettings.value = { ...STATIC_DEFAULTS, ...saved }
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
