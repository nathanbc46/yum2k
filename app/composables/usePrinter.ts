// =============================================================================
// composables/usePrinter.ts
// Composable สำหรับจัดการการสั่งพิมพ์ใบเสร็จ (Thermal Printer)
// รองรับการพิมพ์แบบไร้เสียง (Silent Printing) ผ่าน RawBT ทั้งบน Windows และ Android
// =============================================================================

import type { Order, OrderItem } from '~/types'
import { useSettings } from '~/composables/useSettings'

export function usePrinter() {
  const RAWBT_URL = 'http://localhost:40213/print'
  const { receiptSettings, loadReceiptSettings } = useSettings()

  /**
   * สั่งพิมพ์ใบเสร็จผ่าน RawBT (Silent Printing)
   * @param order ข้อมูลออร์เดอร์ที่ต้องการพิมพ์
   * @returns boolean สถานะการส่งพิมพ์
   */
  async function printRawBT(order: Order): Promise<boolean> {
    try {
      // โหลดการตั้งค่าล่าสุดก่อนพิมพ์
      await loadReceiptSettings()
      
      const receiptText = formatReceiptEscPos(order)
      
      const response = await fetch(RAWBT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: receiptText
      })

      if (!response.ok) {
        throw new Error('RawBT returned error status')
      }

      return true
    } catch (error) {
      console.warn('⚠️ ไม่สามารถพิมพ์ผ่าน RawBT ได้ (อาจไม่ได้เปิดแอป):', error)
      return false
    }
  }

  /**
   * สั่งพิมพ์หน้าปัจจุบัน โดยใช้ Window.print() (Fallback)
   */
  async function printStandard() {
    await nextTick()
    window.print()
  }

  /**
   * ฟอร์แมตข้อมูลออร์เดอร์ให้เป็นรูปแบบ ESC/POS สำหรับเครื่องพิมพ์ความร้อน
   * ดึงข้อมูลตามการตั้งค่าใน useSettings
   */
  function formatReceiptEscPos(order: Order): string {
    const s = receiptSettings.value
    
    // กำหนดความกว้างตามขนาดกระดาษ
    const lineWidth = s.paperSize === '58mm' ? 32 : 42
    const line = '-'.repeat(lineWidth) + '\n'
    
    const center = (text: string) => {
      if (!text) return ''
      const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2))
      return ' '.repeat(padding) + text + '\n'
    }
    
    let res = ''
    
    // --- Header (ดึงจาก Settings) ---
    res += center(s.shopName)
    if (s.shopTagline) res += center(s.shopTagline)
    if (s.shopAddress) res += center(s.shopAddress)
    if (s.shopPhone) res += center(`โทร: ${s.shopPhone}`)
    
    res += center(new Date(order.createdAt).toLocaleString('th-TH'))
    res += line
    
    // --- Order Info ---
    if (s.showOrderNumber) res += `เลขที่บิล: ${order.orderNumber}\n`
    if (s.showStaffName) res += `พนักงาน: ${order.staffName}\n`
    res += `การชำระ: ${getPaymentLabel(order.paymentMethod)}\n`
    res += line
    
    // --- Items ---
    const nameWidth = lineWidth === 32 ? 14 : 20
    const qtyWidth = lineWidth === 32 ? 8 : 8
    const priceWidth = lineWidth - nameWidth - qtyWidth
    
    res += 'รายการ'.padEnd(nameWidth) + 'จำนวน'.padStart(qtyWidth) + 'ราคา'.padStart(priceWidth) + '\n'
    
    order.items.forEach((item: OrderItem) => {
      // ชื่อสินค้า
      const name = item.productName.substring(0, nameWidth).padEnd(nameWidth)
      const qty = `x${item.quantity}`.padStart(qtyWidth)
      const price = item.totalPrice.toLocaleString().padStart(priceWidth)
      res += `${name}${qty}${price}\n`
      
      // แสดง Add-ons (ถ้ามี)
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => {
          res += `  + ${addon.name}\n`
        })
      }
    })
    
    res += line
    
    // --- Summary ---
    res += `ยอดรวม:${order.subtotal.toLocaleString().padStart(lineWidth - 7)}\n`
    if (order.discountAmount > 0) {
      res += `ส่วนลด:${order.discountAmount.toLocaleString().padStart(lineWidth - 7)}\n`
    }
    
    // แสดงภาษีตามการตั้งค่า
    if (s.showTaxInfo && order.taxAmount > 0) {
      res += `ภาษี (${order.taxRate}%):${order.taxAmount.toLocaleString().padStart(lineWidth - 13)}\n`
    }
    
    res += `ยอดสุทธิ:${order.totalAmount.toLocaleString().padStart(lineWidth - 12)} บาท\n`
    res += line
    
    // --- Footer ---
    if (s.footerMessage) res += center(s.footerMessage)
    res += center('Yum2K POS - Offline First')
    res += '\n\n\n' // เว้นที่ว่างสำหรับตัดกระดาษ
    
    // สั่งตัดกระดาษ (ESC/POS Command)
    res += '\x1dV\x42\x00' 

    return res
  }

  /** แปลง Payment Method เป็นภาษาไทย */
  function getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'เงินสด',
      promptpay: 'พร้อมเพย์',
      card: 'บัตรเครดิต',
      unpaid: 'ค้างจ่าย',
      other: 'อื่นๆ'
    }
    return labels[method] || method
  }

  /**
   * ตรวจสอบว่าแอป RawBT เปิดอยู่หรือไม่
   * @returns boolean true ถ้าเชื่อมต่อได้
   */
  async function checkRawBTStatus(): Promise<boolean> {
    try {
      // พยายามดึงข้อมูลสั้นๆ จาก Local Server ของ RawBT
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 1000) // Timeout 1 วินาที

      const response = await fetch('http://localhost:40213/', {
        method: 'GET',
        mode: 'no-cors', // สำคัญ: เพื่อไม่ให้ติด CORS เมื่อเช็คสถานะเบื้องต้น
        signal: controller.signal
      })
      clearTimeout(id)
      return true
    } catch (error) {
      return false
    }
  }

  return {
    printRawBT,
    printStandard,
    checkRawBTStatus
  }
}
