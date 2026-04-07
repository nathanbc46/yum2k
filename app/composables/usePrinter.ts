// =============================================================================
// composables/usePrinter.ts
// Composable สำหรับจัดการการสั่งพิมพ์ใบเสร็จ (Thermal Printer)
// =============================================================================

export function usePrinter() {
  /**
   * สั่งพิมพ์หน้าปัจจุบัน โดยเน้นเฉพาะส่วนที่เป็นใบเสร็จ
   * ใช้ Window.print() ซึ่งเป็นวิธีที่เสถียรที่สุดสำหรับทุก Browser/OS
   */
  async function printReceipt() {
    // หน่วงเวลาเล็กน้อยเพื่อให้ Vue Render ใบเสร็จเสร็จสมบูรณ์
    await nextTick()
    
    // ตรวจสอบว่ามี element .receipt-base หรือไม่ (ถ้ามีหลายที่อาจต้องเจาะจง)
    window.print()
  }

  return {
    printReceipt
  }
}
