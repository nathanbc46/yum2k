// plugins/dexie.client.ts
// Plugin สำหรับ Initialize Dexie Database (Client-side เท่านั้น)
// =============================================================================

import { db } from '~/db'

export default defineNuxtPlugin({
  name: 'dexie-db',
  enforce: 'pre', // รันก่อน Plugin อื่น
  setup() {
    // ตรวจสอบว่า Browser รองรับ IndexedDB หรือไม่
    if (!window.indexedDB) {
      console.error('❌ Browser ไม่รองรับ IndexedDB - ระบบ Offline จะไม่ทำงาน')
      return { provide: { db } }
    }

    // เปิด DB แบบ Non-blocking (ไม่รอ await เพราะ provide ต้อง return synchronously)
    db.open()
      .then(() => console.log('✅ เชื่อมต่อ IndexedDB สำเร็จ (Yum2K POS DB)'))
      .catch((error: unknown) => console.error('❌ ไม่สามารถเปิด IndexedDB ได้:', error))

    // ส่ง db instance ให้ใช้งานได้ผ่าน useNuxtApp().$db
    return {
      provide: { db },
    }
  },
})

