// =============================================================================
// composables/usePrinter.ts
// Composable สำหรับจัดการการสั่งพิมพ์ใบเสร็จ (Thermal Printer)
// รองรับ: WebUSB (direct), RawBT (Android/Windows app), Browser Print (fallback)
// =============================================================================

import type { Order, OrderItem } from '~/types'
import { useSettings } from '~/composables/useSettings'

export function usePrinter() {
  const RAWBT_URL = 'http://localhost:40213/print'
  const { receiptSettings, loadReceiptSettings } = useSettings()

  // ---------------------------------------------------------------------------
  // Thai TIS-620 Encoding
  // แปลง JavaScript string (UTF-16) → TIS-620 Uint8Array สำหรับ ESC/POS
  // Thai Unicode U+0E01-U+0E7F → TIS-620 byte 0xA1-0xFF (offset mapping)
  // ---------------------------------------------------------------------------
  function encodeThai(text: string): Uint8Array {
    const bytes: number[] = []
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      if (code >= 0x0E00 && code <= 0x0E7F) {
        bytes.push(0xA0 + (code - 0x0E00))
      } else if (code < 0x80) {
        bytes.push(code)
      } else {
        bytes.push(0x3F) // '?' สำหรับอักขระที่ไม่รองรับ
      }
    }
    return new Uint8Array(bytes)
  }

  // ---------------------------------------------------------------------------
  // ESC/POS Buffer Builder
  // สร้าง Uint8Array ที่มี ESC/POS commands ครบสำหรับส่งตรงไปยัง printer
  // ---------------------------------------------------------------------------
  function buildEscPosBuffer(order: Order): Uint8Array {
    const s = receiptSettings.value
    const lineWidth = s.paperSize === '58mm' ? 32 : 42
    const line = '-'.repeat(lineWidth)

    const parts: Uint8Array[] = []
    const push = (text: string) => parts.push(encodeThai(text))
    const pushBytes = (...bytes: number[]) => parts.push(new Uint8Array(bytes))

    const center = (text: string): string => {
      if (!text) return ''
      const pad = Math.max(0, Math.floor((lineWidth - text.length) / 2))
      return ' '.repeat(pad) + text + '\n'
    }

    // ESC @ - Initialize printer
    pushBytes(0x1B, 0x40)
    // ESC t 20 (0x14) - Select code page 20 = Windows-874 / TIS-620 (Thai)
    pushBytes(0x1B, 0x74, 0x14)

    // --- Header ---
    push(center(s.shopName))
    if (s.shopTagline) push(center(s.shopTagline))
    if (s.shopAddress) push(center(s.shopAddress))
    if (s.shopPhone) push(center(`โทร: ${s.shopPhone}`))
    push(center(new Date(order.createdAt).toLocaleString('th-TH')))
    push(line + '\n')

    // --- Order Info ---
    if (s.showOrderNumber) push(`เลขที่บิล: ${order.orderNumber}\n`)
    if (s.showStaffName) push(`พนักงาน: ${order.staffName}\n`)
    push(`การชำระ: ${getPaymentLabel(order.paymentMethod)}\n`)
    push(line + '\n')

    // --- Items ---
    const nameWidth = lineWidth === 32 ? 14 : 20
    const qtyWidth = 8
    const priceWidth = lineWidth - nameWidth - qtyWidth

    push('รายการ'.padEnd(nameWidth) + 'จำนวน'.padStart(qtyWidth) + 'ราคา'.padStart(priceWidth) + '\n')

    order.items.forEach((item: OrderItem) => {
      const name = item.productName.substring(0, nameWidth).padEnd(nameWidth)
      const qty = `x${item.quantity}`.padStart(qtyWidth)
      const price = item.totalPrice.toLocaleString().padStart(priceWidth)
      push(`${name}${qty}${price}\n`)
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => push(`  + ${addon.name}\n`))
      }
    })

    push(line + '\n')

    // --- Summary ---
    push(`ยอดรวม:${order.subtotal.toLocaleString().padStart(lineWidth - 7)}\n`)
    if (order.discountAmount > 0) {
      push(`ส่วนลด:${order.discountAmount.toLocaleString().padStart(lineWidth - 7)}\n`)
    }
    if (s.showTaxInfo && order.taxAmount > 0) {
      push(`ภาษี (${order.taxRate}%):${order.taxAmount.toLocaleString().padStart(lineWidth - 13)}\n`)
    }
    push(`ยอดสุทธิ:${order.totalAmount.toLocaleString().padStart(lineWidth - 12)} บาท\n`)
    push(line + '\n')

    // --- Footer ---
    if (s.footerMessage) push(center(s.footerMessage))
    push(center('Yum2K POS - Offline First'))
    push('\n\n\n')

    // GS V 66 0 - Partial cut
    pushBytes(0x1D, 0x56, 0x42, 0x00)

    // รวม Uint8Array ทั้งหมดเป็น buffer เดียว
    const totalLength = parts.reduce((sum, p) => sum + p.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const part of parts) {
      result.set(part, offset)
      offset += part.length
    }
    return result
  }

  // ---------------------------------------------------------------------------
  // WebUSB - Direct USB Printing
  // ---------------------------------------------------------------------------

  /** เช็คว่า browser รองรับ WebUSB API หรือไม่ */
  function isUSBSupported(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).usb
  }

  /**
   * เปิด device picker ให้ user เลือก USB printer (ต้องเรียกจาก user gesture)
   * เรียกครั้งเดียว จากนั้นใช้ getUSBPrinter() แทน
   */
  async function connectUSBPrinter(): Promise<any | null> {
    if (!isUSBSupported()) return null
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] })
      return device
    } catch {
      return null
    }
  }

  /** ดึง USB printer ที่ authorize ไว้แล้ว (ไม่มี popup dialog) */
  async function getUSBPrinter(): Promise<any | null> {
    if (!isUSBSupported()) return null
    try {
      const devices = await (navigator as any).usb.getDevices()
      return devices[0] ?? null
    } catch {
      return null
    }
  }

  // แปลง Uint8Array → base64 string (chunk เพื่อป้องกัน stack overflow)
  function uint8ToBase64(bytes: Uint8Array): string {
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    return btoa(binary)
  }

  // ---------------------------------------------------------------------------
  // WiFi / Network Printing — ส่ง ESC/POS ผ่าน TCP socket ไปยัง printer IP
  // server/api/thermal-print.post.ts จะรับและส่งต่อผ่าน Node.js net module
  // ใช้กับ Xprinter ที่มี WiFi/LAN (port มาตรฐาน 9100)
  // ---------------------------------------------------------------------------
  async function printWifi(order: Order): Promise<boolean> {
    await loadReceiptSettings()
    const s = receiptSettings.value
    if (!s.printerIp) {
      console.warn('⚠️ ยังไม่ได้กำหนด IP ของ printer กรุณาตั้งค่าใน Settings')
      return false
    }
    try {
      const buffer = buildEscPosBuffer(order)
      const payload = { ip: s.printerIp, port: s.printerPort || 9100, data: uint8ToBase64(buffer) }

      // ถ้ากำหนด Bridge URL → ส่งตรงไปยัง local bridge แทน Vercel server route
      const endpoint = s.printerBridgeUrl ? s.printerBridgeUrl.replace(/\/$/, '') + '/print' : '/api/thermal-print'
      await $fetch(endpoint, { method: 'POST', body: payload })
      return true
    } catch (error) {
      console.warn('⚠️ WiFi print error:', error)
      return false
    }
  }

  /**
   * พิมพ์ใบเสร็จผ่าน WebUSB ตรงไปยัง printer
   * หมายเหตุ: บน Android USB printer class (0x07) ถูก OS claim ไว้ จะเกิด SecurityError
   * แนะนำให้ใช้ WiFi method แทนสำหรับ Android
   */
  async function printUSB(order: Order): Promise<boolean> {
    try {
      await loadReceiptSettings()
      const device = await getUSBPrinter()
      if (!device) {
        console.warn('⚠️ ไม่พบ USB printer ที่เชื่อมต่อ กรุณา pair เครื่องพิมพ์ใน Settings ก่อน')
        return false
      }

      const buffer = buildEscPosBuffer(order)

      let endpointNumber = 1
      try {
        const iface = device.configuration?.interfaces?.[0]
        const alternate = iface?.alternates?.[0]
        const outEndpoint = alternate?.endpoints?.find((e: any) => e.direction === 'out')
        if (outEndpoint) endpointNumber = outEndpoint.endpointNumber
      } catch { /* ใช้ค่าเริ่มต้น */ }

      await device.open()
      if (device.configuration === null) await device.selectConfiguration(1)
      await device.claimInterface(0)

      try {
        await device.transferOut(endpointNumber, buffer)
        return true
      } finally {
        await device.releaseInterface(0)
        await device.close()
      }
    } catch (error: any) {
      if (error?.name === 'SecurityError') {
        console.warn('⚠️ USB SecurityError: Android OS ครอง printer interface ไว้แล้ว ไม่สามารถใช้ WebUSB ได้')
      } else {
        console.warn('⚠️ USB print error:', error)
      }
      return false
    }
  }

  /**
   * ส่ง test print ผ่านวิธีที่กำหนดใน settings
   * คืนค่า { success, errorType } เพื่อให้ UI แสดง error message ที่เหมาะสม
   */
  async function testPrint(): Promise<{ success: boolean; errorType?: 'security_error' | 'no_device' | 'no_ip' | 'connection_error' | 'generic' }> {
    await loadReceiptSettings()
    const s = receiptSettings.value
    const lineWidth = s.paperSize === '58mm' ? 32 : 42
    const line = '='.repeat(lineWidth)
    const testLines = [
      line,
      `    ทดสอบการพิมพ์ / Test Print`,
      line,
      `ร้าน: ${s.shopName}`,
      `กระดาษ: ${s.paperSize}`,
      new Date().toLocaleString('th-TH'),
      line, '', '', ''
    ].join('\n')

    const method = s.printerMethod ?? 'wifi'

    if (method === 'wifi') {
      if (!s.printerIp) return { success: false, errorType: 'no_ip' }
      try {
        const parts: Uint8Array[] = [
          new Uint8Array([0x1B, 0x40]),
          new Uint8Array([0x1B, 0x74, 0x14]),
          encodeThai(testLines),
          new Uint8Array([0x1D, 0x56, 0x42, 0x00])
        ]
        const total = parts.reduce((acc, p) => acc + p.length, 0)
        const buf = new Uint8Array(total)
        let off = 0
        for (const p of parts) { buf.set(p, off); off += p.length }

        const endpoint = s.printerBridgeUrl ? s.printerBridgeUrl.replace(/\/$/, '') + '/print' : '/api/thermal-print'
        await $fetch(endpoint, { method: 'POST', body: { ip: s.printerIp, port: s.printerPort || 9100, data: uint8ToBase64(buf) } })
        return { success: true }
      } catch {
        return { success: false, errorType: 'connection_error' }
      }

    } else if (method === 'usb') {
      const device = await getUSBPrinter()
      if (!device) return { success: false, errorType: 'no_device' }

      const parts: Uint8Array[] = [
        new Uint8Array([0x1B, 0x40]),
        new Uint8Array([0x1B, 0x74, 0x14]),
        encodeThai(testLines),
        new Uint8Array([0x1D, 0x56, 0x42, 0x00])
      ]
      const total = parts.reduce((acc, p) => acc + p.length, 0)
      const buf = new Uint8Array(total)
      let off = 0
      for (const p of parts) { buf.set(p, off); off += p.length }

      let endpointNumber = 1
      try {
        const iface = device.configuration?.interfaces?.[0]
        const ep = iface?.alternates?.[0]?.endpoints?.find((e: any) => e.direction === 'out')
        if (ep) endpointNumber = ep.endpointNumber
      } catch { /* ค่าเริ่มต้น */ }

      try {
        await device.open()
        if (device.configuration === null) await device.selectConfiguration(1)
        await device.claimInterface(0)
        try {
          await device.transferOut(endpointNumber, buf)
          return { success: true }
        } finally {
          await device.releaseInterface(0)
          await device.close()
        }
      } catch (error: any) {
        if (error?.name === 'SecurityError') return { success: false, errorType: 'security_error' }
        return { success: false, errorType: 'generic' }
      }

    } else if (method === 'rawbt') {
      try {
        const response = await fetch(RAWBT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          body: testLines
        })
        return response.ok ? { success: true } : { success: false, errorType: 'connection_error' }
      } catch {
        return { success: false, errorType: 'connection_error' }
      }

    } else {
      await nextTick()
      window.print()
      return { success: true }
    }
  }

  // ---------------------------------------------------------------------------
  // RawBT - Silent Printing ผ่านแอป RawBT (localhost:40213)
  // ---------------------------------------------------------------------------
  async function printRawBT(order: Order): Promise<boolean> {
    try {
      await loadReceiptSettings()
      const receiptText = formatReceiptEscPos(order)
      const response = await fetch(RAWBT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: receiptText
      })
      if (!response.ok) throw new Error('RawBT returned error status')
      return true
    } catch (error) {
      console.warn('⚠️ ไม่สามารถพิมพ์ผ่าน RawBT ได้:', error)
      return false
    }
  }

  // ---------------------------------------------------------------------------
  // Browser Print - Fallback (มี dialog ของ browser)
  // ---------------------------------------------------------------------------
  async function printStandard() {
    await nextTick()
    window.print()
  }

  // ---------------------------------------------------------------------------
  // Unified Print - เลือกวิธีพิมพ์จาก receiptSettings.printerMethod
  // ---------------------------------------------------------------------------
  async function print(order: Order): Promise<boolean> {
    await loadReceiptSettings()
    const method = receiptSettings.value.printerMethod ?? 'wifi'
    if (method === 'wifi') {
      return await printWifi(order)
    } else if (method === 'usb') {
      return await printUSB(order)
    } else if (method === 'rawbt') {
      return await printRawBT(order)
    } else {
      await printStandard()
      return true
    }
  }

  // ---------------------------------------------------------------------------
  // ESC/POS String Format (สำหรับ RawBT ซึ่งรับ UTF-8 text)
  // ---------------------------------------------------------------------------
  function formatReceiptEscPos(order: Order): string {
    const s = receiptSettings.value
    const lineWidth = s.paperSize === '58mm' ? 32 : 42
    const line = '-'.repeat(lineWidth) + '\n'

    const center = (text: string) => {
      if (!text) return ''
      const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2))
      return ' '.repeat(padding) + text + '\n'
    }

    let res = ''
    res += center(s.shopName)
    if (s.shopTagline) res += center(s.shopTagline)
    if (s.shopAddress) res += center(s.shopAddress)
    if (s.shopPhone) res += center(`โทร: ${s.shopPhone}`)
    res += center(new Date(order.createdAt).toLocaleString('th-TH'))
    res += line

    if (s.showOrderNumber) res += `เลขที่บิล: ${order.orderNumber}\n`
    if (s.showStaffName) res += `พนักงาน: ${order.staffName}\n`
    res += `การชำระ: ${getPaymentLabel(order.paymentMethod)}\n`
    res += line

    const nameWidth = lineWidth === 32 ? 14 : 20
    const qtyWidth = 8
    const priceWidth = lineWidth - nameWidth - qtyWidth

    res += 'รายการ'.padEnd(nameWidth) + 'จำนวน'.padStart(qtyWidth) + 'ราคา'.padStart(priceWidth) + '\n'

    order.items.forEach((item: OrderItem) => {
      const name = item.productName.substring(0, nameWidth).padEnd(nameWidth)
      const qty = `x${item.quantity}`.padStart(qtyWidth)
      const price = item.totalPrice.toLocaleString().padStart(priceWidth)
      res += `${name}${qty}${price}\n`
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => { res += `  + ${addon.name}\n` })
      }
    })

    res += line
    res += `ยอดรวม:${order.subtotal.toLocaleString().padStart(lineWidth - 7)}\n`
    if (order.discountAmount > 0) {
      res += `ส่วนลด:${order.discountAmount.toLocaleString().padStart(lineWidth - 7)}\n`
    }
    if (s.showTaxInfo && order.taxAmount > 0) {
      res += `ภาษี (${order.taxRate}%):${order.taxAmount.toLocaleString().padStart(lineWidth - 13)}\n`
    }
    res += `ยอดสุทธิ:${order.totalAmount.toLocaleString().padStart(lineWidth - 12)} บาท\n`
    res += line
    if (s.footerMessage) res += center(s.footerMessage)
    res += center('Yum2K POS - Offline First')
    res += '\n\n\n'
    res += '\x1dV\x42\x00'
    return res
  }

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

  // ---------------------------------------------------------------------------
  // Status Checks
  // ---------------------------------------------------------------------------

  /** ตรวจสอบว่าแอป RawBT เปิดอยู่หรือไม่ */
  async function checkRawBTStatus(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 1000)
      await fetch('http://localhost:40213/', { method: 'GET', mode: 'no-cors', signal: controller.signal })
      clearTimeout(id)
      return true
    } catch {
      return false
    }
  }

  return {
    print,
    printWifi,
    printUSB,
    printRawBT,
    printStandard,
    testPrint,
    connectUSBPrinter,
    getUSBPrinter,
    isUSBSupported,
    checkRawBTStatus,
  }
}
