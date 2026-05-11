// =============================================================================
// composables/usePrinter.ts
// Composable สำหรับจัดการการสั่งพิมพ์ใบเสร็จ (Thermal Printer)
// รองรับ: WebUSB (direct), RawBT (Android/Windows app), Browser Print (fallback)
// =============================================================================

import type { Order, OrderItem } from '~/types'
import { useSettings, type ReceiptSettings } from '~/composables/useSettings'

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
  // Visual Width Helpers
  // Thai character = 2 columns, ASCII = 1 column (ตาม font ของ thermal printer)
  // ---------------------------------------------------------------------------
  const isThai = (code: number) => code >= 0x0E00 && code <= 0x0E7F

  function vw(str: string): number {
    let w = 0
    for (let i = 0; i < str.length; i++) w += isThai(str.charCodeAt(i)) ? 2 : 1
    return w
  }

  function vwPadEnd(str: string, width: number): string {
    return str + ' '.repeat(Math.max(0, width - vw(str)))
  }

  function vwPadStart(str: string, width: number): string {
    return ' '.repeat(Math.max(0, width - vw(str))) + str
  }

  function vwTruncate(str: string, maxWidth: number): string {
    let w = 0, result = ''
    for (let i = 0; i < str.length; i++) {
      const cw = isThai(str.charCodeAt(i)) ? 2 : 1
      if (w + cw > maxWidth) break
      result += str[i]
      w += cw
    }
    return result
  }

  // ---------------------------------------------------------------------------
  // ESC/POS Buffer Builder
  // สร้าง Uint8Array ที่มี ESC/POS commands ครบสำหรับส่งตรงไปยัง printer
  // ---------------------------------------------------------------------------
  function buildEscPosBuffer(order: Order, isKitchenCopy = false): Uint8Array {
    const s = receiptSettings.value
    const lineWidth = s.paperSize === '58mm' ? 32 : 42
    const marginLeft = s.receiptMarginLeft ?? 0
    const marginRight = s.receiptMarginRight ?? 0
    const effectiveWidth = lineWidth - marginLeft - marginRight
    const leftPad = ' '.repeat(marginLeft)
    const line = '-'.repeat(effectiveWidth)

    const parts: Uint8Array[] = []
    const push = (text: string) => parts.push(encodeThai(text))
    const pushBytes = (...bytes: number[]) => parts.push(new Uint8Array(bytes))

    const center = (text: string): string => {
      if (!text) return ''
      const pad = Math.max(0, Math.floor((effectiveWidth - vw(text)) / 2))
      return leftPad + ' '.repeat(pad) + text + '\n'
    }

    // ESC @ - Initialize printer
    pushBytes(0x1B, 0x40)
    const codePage = s.printerCodePage ?? 70
    if (codePage > 0) pushBytes(0x1B, 0x74, codePage)

    // --- Header ---
    if (isKitchenCopy) {
      push('\n')
      push(center('--- ใบสั่งทำอาหาร ---'))
      push(center('(Kitchen Copy)'))
    } else {
      push(center(s.shopName))
      if (s.shopTagline) push(center(s.shopTagline))
      if (s.shopAddress) push(center(s.shopAddress))
      if (s.shopPhone) push(center(`โทร: ${s.shopPhone}`))
    }
    push(center(new Date(order.createdAt).toLocaleString('th-TH')))
    push(leftPad + line + '\n')

    // --- Order Info ---
    if (s.showOrderNumber) push(leftPad + `เลขที่บิล: ${order.orderNumber}\n`)
    if (s.showStaffName) push(leftPad + `พนักงาน: ${order.staffName}\n`)
    if (!isKitchenCopy) {
      push(leftPad + `การชำระ: ${getPaymentLabel(order.paymentMethod)}\n`)
    }
    push(leftPad + line + '\n')

    // --- Items ---
    const combinedWidth = (s.receiptQtyWidth ?? 4) + (s.receiptPriceWidth ?? 7)
    const nameWidth = effectiveWidth - combinedWidth

    push(leftPad + vwPadEnd('รายการ', nameWidth) + vwPadStart('จำนวนราคา', combinedWidth) + '\n')

    order.items.forEach((item: OrderItem) => {
      const name = vwPadEnd(vwTruncate(item.productName, nameWidth), nameWidth)
      const combined = vwPadStart(`x${item.quantity} ${item.totalPrice.toLocaleString('en-US')}`, combinedWidth)
      push(leftPad + `${name}${combined}\n`)
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => push(leftPad + `  + ${addon.name}\n`))
      }
    })

    push(leftPad + line + '\n')

    // --- Summary ---
    push(leftPad + vwPadEnd('ยอดรวม:', 10) + vwPadStart(order.subtotal.toLocaleString('en-US'), effectiveWidth - 10) + '\n')
    if (order.discountAmount > 0) {
      push(leftPad + vwPadEnd('ส่วนลด:', 10) + vwPadStart(order.discountAmount.toLocaleString('en-US'), effectiveWidth - 10) + '\n')
    }
    if (s.showTaxInfo && order.taxAmount > 0) {
      const taxLabel = `ภาษี (${order.taxRate}%):`
      push(leftPad + vwPadEnd(taxLabel, 14) + vwPadStart(order.taxAmount.toLocaleString('en-US'), effectiveWidth - 14) + '\n')
    }
    push(leftPad + vwPadEnd('ยอดสุทธิ:', 12) + vwPadStart(order.totalAmount.toLocaleString('en-US') + ' บาท', effectiveWidth - 12) + '\n')
    push(leftPad + line + '\n')

    // --- Footer ---
    if (!isKitchenCopy) {
      if (s.footerMessage) push(center(s.footerMessage))
      push(center('Yum2K POS - Offline First'))
    } else {
      push(center('--- จบใบสั่งงาน ---'))
    }
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

  // รวม Uint8Array หลายชุดเข้าด้วยกัน
  function concatBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, p) => sum + p.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of buffers) {
      result.set(buf, offset)
      offset += buf.length
    }
    return result
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
      // สร้าง buffer ใบเสร็จลูกค้า
      const customerBuffer = s.printerImageMode
        ? await buildImageEscPos(buildReceiptLines(order), s.paperSize)
        : buildEscPosBuffer(order)
      
      let finalBuffer = customerBuffer

      // ถ้าเปิด Kitchen Copy ให้สร้าง buffer ใบสั่งครัวมาต่อท้าย
      if (s.printKitchenCopy) {
        const kitchenBuffer = s.printerImageMode
          ? await buildImageEscPos(buildReceiptLines(order, true), s.paperSize)
          : buildEscPosBuffer(order, true)
        finalBuffer = concatBuffers([customerBuffer, kitchenBuffer])
      }

      const payload = { ip: s.printerIp, port: s.printerPort || 9100, data: uint8ToBase64(finalBuffer) }

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

      const s = receiptSettings.value
      
      // สร้าง buffer ใบเสร็จลูกค้า
      const customerBuffer = s.printerImageMode
        ? await buildImageEscPos(buildReceiptLines(order), s.paperSize)
        : buildEscPosBuffer(order)
      
      let finalBuffer = customerBuffer

      // ถ้าเปิด Kitchen Copy ให้สร้าง buffer ใบสั่งครัวมาต่อท้าย
      if (s.printKitchenCopy) {
        const kitchenBuffer = s.printerImageMode
          ? await buildImageEscPos(buildReceiptLines(order, true), s.paperSize)
          : buildEscPosBuffer(order, true)
        finalBuffer = concatBuffers([customerBuffer, kitchenBuffer])
      }

      if (!device.opened) await device.open()
      if (device.configuration === null) await device.selectConfiguration(1)

      // หา interface และ endpoint ที่ถูกต้องหลัง open แล้ว
      let interfaceNumber = 0
      let endpointNumber = 1
      try {
        for (const iface of device.configuration.interfaces) {
          const ep = iface.alternates?.[0]?.endpoints?.find((e: any) => e.direction === 'out')
          if (ep) {
            interfaceNumber = iface.interfaceNumber
            endpointNumber = ep.endpointNumber
            break
          }
        }
      } catch { /* ใช้ค่าเริ่มต้น */ }

      await device.claimInterface(interfaceNumber)

      try {
        await device.transferOut(endpointNumber, finalBuffer)
        return true
      } finally {
        await device.releaseInterface(interfaceNumber)
        await device.close()
      }
    } catch (error: any) {
      if (error?.name === 'SecurityError') {
        console.warn('⚠️ USB SecurityError: Android OS ครอง printer interface ไว้แล้ว ไม่สามารถใช้ WebUSB ได้')
      } else {
        console.warn('⚠️ USB print error:', error?.name, error?.message)
      }
      return false
    }
  }

  /**
   * ส่ง test print ผ่านวิธีที่กำหนดใน settings
   * คืนค่า { success, errorType } เพื่อให้ UI แสดง error message ที่เหมาะสม
   */
  async function testPrint(customSettings?: ReceiptSettings): Promise<{ success: boolean; errorType?: 'security_error' | 'no_device' | 'no_ip' | 'connection_error' | 'generic'; errorMessage?: string }> {
    if (customSettings) {
      // Use provided settings directly
      var s = customSettings
    } else {
      await loadReceiptSettings()
      var s = receiptSettings.value
    }
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
    const useImage = s.printerImageMode ?? false
    const codePage = s.printerCodePage ?? 70
    const codePageCmd = codePage > 0
      ? new Uint8Array([0x1B, 0x74, codePage])
      : new Uint8Array([])

    // สร้าง buffer ตาม mode (image หรือ text)
    const buildTestBuffer = async (): Promise<Uint8Array> => {
      if (useImage) return buildImageEscPos(buildTestReceiptLines(s.shopName, s.paperSize), s.paperSize)
      const parts: Uint8Array[] = [
        new Uint8Array([0x1B, 0x40]),
        codePageCmd,
        encodeThai(testLines),
        new Uint8Array([0x1D, 0x56, 0x42, 0x00])
      ]
      const total = parts.reduce((acc, p) => acc + p.length, 0)
      const buf = new Uint8Array(total)
      let off = 0
      for (const p of parts) { buf.set(p, off); off += p.length }
      return buf
    }

    if (method === 'wifi') {
      if (!s.printerIp) return { success: false, errorType: 'no_ip' }
      try {
        const buf = await buildTestBuffer()
        const endpoint = s.printerBridgeUrl ? s.printerBridgeUrl.replace(/\/$/, '') + '/print' : '/api/thermal-print'
        await $fetch(endpoint, { method: 'POST', body: { ip: s.printerIp, port: s.printerPort || 9100, data: uint8ToBase64(buf) } })
        return { success: true }
      } catch {
        return { success: false, errorType: 'connection_error' }
      }

    } else if (method === 'usb') {
      const device = await getUSBPrinter()
      if (!device) return { success: false, errorType: 'no_device' }

      const buf = await buildTestBuffer()

      try {
        if (!device.opened) await device.open()
        if (device.configuration === null) await device.selectConfiguration(1)

        // หา interface และ endpoint ที่ถูกต้องหลัง open แล้ว
        let interfaceNumber = 0
        let endpointNumber = 1
        try {
          for (const iface of device.configuration.interfaces) {
            const ep = iface.alternates?.[0]?.endpoints?.find((e: any) => e.direction === 'out')
            if (ep) {
              interfaceNumber = iface.interfaceNumber
              endpointNumber = ep.endpointNumber
              break
            }
          }
        } catch { /* ค่าเริ่มต้น */ }

        await device.claimInterface(interfaceNumber)
        try {
          await device.transferOut(endpointNumber, buf)
          return { success: true }
        } finally {
          await device.releaseInterface(interfaceNumber)
          await device.close()
        }
      } catch (error: any) {
        console.warn('⚠️ USB testPrint error:', error?.name, error?.message)
        if (error?.name === 'SecurityError') return { success: false, errorType: 'security_error' }
        return { success: false, errorType: 'generic', errorMessage: `${error?.name}: ${error?.message}` }
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
      const win = window.open('', '_blank', 'width=400,height=600')
      if (!win) return { success: true }
      win.document.write(`<!DOCTYPE html><html><head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Sarabun','Noto Sans Thai',monospace; font-size: 13px; padding: 16px; white-space: pre; }
        </style>
      </head><body onload="window.print();window.close()">${testLines.replace(/</g, '&lt;')}</body></html>`)
      win.document.close()
      return { success: true }
    }
  }

  // ---------------------------------------------------------------------------
  // RawBT - Silent Printing ผ่านแอป RawBT (localhost:40213)
  // ---------------------------------------------------------------------------
  async function printRawBT(order: Order): Promise<boolean> {
    try {
      await loadReceiptSettings()
      const s = receiptSettings.value
      
      // สร้างใบเสร็จลูกค้า
      let finalText = formatReceiptEscPos(order)

      // ถ้าเปิด Kitchen Copy ให้สร้างใบสั่งครัวมาต่อท้าย
      if (s.printKitchenCopy) {
        const kitchenText = formatReceiptEscPos(order, true)
        finalText += kitchenText
      }

      const response = await fetch(RAWBT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: finalText
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
  function formatReceiptEscPos(order: Order, isKitchenCopy = false): string {
    const s = receiptSettings.value
    const lineWidth = s.paperSize === '58mm' ? 32 : 42
    const marginLeft = s.receiptMarginLeft ?? 0
    const marginRight = s.receiptMarginRight ?? 0
    const effectiveWidth = lineWidth - marginLeft - marginRight
    const leftPad = ' '.repeat(marginLeft)
    const line = leftPad + '-'.repeat(effectiveWidth) + '\n'

    const center = (text: string) => {
      if (!text) return ''
      const padding = Math.max(0, Math.floor((effectiveWidth - vw(text)) / 2))
      return leftPad + ' '.repeat(padding) + text + '\n'
    }

    let res = ''
    if (isKitchenCopy) {
      res += '\n'
      res += center('--- ใบสั่งทำอาหาร ---')
      res += center('(Kitchen Copy)')
    } else {
      res += center(s.shopName)
      if (s.shopTagline) res += center(s.shopTagline)
      if (s.shopAddress) res += center(s.shopAddress)
      if (s.shopPhone) res += center(`โทร: ${s.shopPhone}`)
    }
    res += center(new Date(order.createdAt).toLocaleString('th-TH'))
    res += line

    if (s.showOrderNumber) res += leftPad + `เลขที่บิล: ${order.orderNumber}\n`
    if (s.showStaffName) res += leftPad + `พนักงาน: ${order.staffName}\n`
    if (!isKitchenCopy) {
      res += leftPad + `การชำระ: ${getPaymentLabel(order.paymentMethod)}\n`
    }
    res += line

    const combinedWidth = (s.receiptQtyWidth ?? 4) + (s.receiptPriceWidth ?? 7)
    const nameWidth = effectiveWidth - combinedWidth

    res += leftPad + vwPadEnd('รายการ', nameWidth) + vwPadStart('จำนวนราคา', combinedWidth) + '\n'

    order.items.forEach((item: OrderItem) => {
      const name = vwPadEnd(vwTruncate(item.productName, nameWidth), nameWidth)
      const combined = vwPadStart(`x${item.quantity} ${item.totalPrice.toLocaleString('en-US')}`, combinedWidth)
      res += leftPad + `${name}${combined}\n`
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => { res += leftPad + `  + ${addon.name}\n` })
      }
    })

    res += line
    res += leftPad + vwPadEnd('ยอดรวม:', 10) + vwPadStart(order.subtotal.toLocaleString('en-US'), effectiveWidth - 10) + '\n'
    if (order.discountAmount > 0) {
      res += leftPad + vwPadEnd('ส่วนลด:', 10) + vwPadStart(order.discountAmount.toLocaleString('en-US'), effectiveWidth - 10) + '\n'
    }
    if (s.showTaxInfo && order.taxAmount > 0) {
      const taxLabel = `ภาษี (${order.taxRate}%):`
      res += leftPad + vwPadEnd(taxLabel, 14) + vwPadStart(order.taxAmount.toLocaleString('en-US'), effectiveWidth - 14) + '\n'
    }
    res += leftPad + vwPadEnd('ยอดสุทธิ:', 12) + vwPadStart(order.totalAmount.toLocaleString('en-US') + ' บาท', effectiveWidth - 12) + '\n'
    res += line
    if (!isKitchenCopy) {
      if (s.footerMessage) res += center(s.footerMessage)
      res += center('Yum2K POS - Offline First')
    } else {
      res += center('--- จบใบสั่งงาน ---')
    }
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
  // Image Mode — render structured receipt → Canvas → 1-bit bitmap → ESC/POS
  // ใช้ pixel position แทน text padding เพื่อให้ column ตรงกันทุกภาษา
  // ---------------------------------------------------------------------------

  // โครงสร้างแต่ละบรรทัดของใบเสร็จ
  type ReceiptLine =
    | { type: 'text'; text: string; align?: 'left' | 'center' | 'right' }
    | { type: 'separator' }
    | { type: 'spacer' }
    | { type: 'columns'; name: string; qty: string; price: string }

  /** สร้าง receipt เป็น structured lines (ไม่ใช้ text padding) */
  function buildReceiptLines(order: Order, isKitchenCopy = false): ReceiptLine[] {
    const s = receiptSettings.value
    const lines: ReceiptLine[] = []

    if (isKitchenCopy) {
      lines.push({ type: 'spacer' })
      lines.push({ type: 'text', text: '--- ใบสั่งทำอาหาร ---', align: 'center' })
      lines.push({ type: 'text', text: '(Kitchen Copy)', align: 'center' })
    } else {
      lines.push({ type: 'text', text: s.shopName, align: 'center' })
      if (s.shopTagline) lines.push({ type: 'text', text: s.shopTagline, align: 'center' })
      if (s.shopAddress) lines.push({ type: 'text', text: s.shopAddress, align: 'center' })
      if (s.shopPhone) lines.push({ type: 'text', text: `โทร: ${s.shopPhone}`, align: 'center' })
    }
    lines.push({ type: 'text', text: new Date(order.createdAt).toLocaleString('th-TH'), align: 'center' })
    lines.push({ type: 'separator' })

    if (s.showOrderNumber) lines.push({ type: 'text', text: `เลขที่บิล: ${order.orderNumber}` })
    if (s.showStaffName) lines.push({ type: 'text', text: `พนักงาน: ${order.staffName}` })
    if (!isKitchenCopy) {
      lines.push({ type: 'text', text: `การชำระ: ${getPaymentLabel(order.paymentMethod)}` })
    }
    lines.push({ type: 'separator' })

    lines.push({ type: 'columns', name: 'รายการ', qty: 'จำนวน', price: 'ราคา' })

    order.items.forEach((item: OrderItem) => {
      lines.push({ type: 'columns', name: item.productName, qty: `x${item.quantity}`, price: item.totalPrice.toLocaleString() })
      if (item.addons?.length) item.addons.forEach(a => lines.push({ type: 'text', text: `  + ${a.name}` }))
    })

    lines.push({ type: 'separator' })
    lines.push({ type: 'columns', name: 'ยอดรวม', qty: '', price: order.subtotal.toLocaleString() })
    if (order.discountAmount > 0)
      lines.push({ type: 'columns', name: 'ส่วนลด', qty: '', price: `-${order.discountAmount.toLocaleString()}` })
    if (s.showTaxInfo && order.taxAmount > 0)
      lines.push({ type: 'columns', name: `ภาษี (${order.taxRate}%)`, qty: '', price: order.taxAmount.toLocaleString() })
    lines.push({ type: 'columns', name: 'ยอดสุทธิ', qty: '', price: `${order.totalAmount.toLocaleString()} บาท` })
    lines.push({ type: 'separator' })

    if (!isKitchenCopy) {
      if (s.footerMessage) lines.push({ type: 'text', text: s.footerMessage, align: 'center' })
      lines.push({ type: 'text', text: 'Yum2K POS', align: 'center' })
    } else {
      lines.push({ type: 'text', text: '--- จบใบสั่งงาน ---', align: 'center' })
    }
    lines.push({ type: 'spacer' })

    return lines
  }

  /** สร้าง receipt สำหรับ testPrint แบบ structured (ไม่ต้องการ Order) */
  function buildTestReceiptLines(shopName: string, paperSize: string): ReceiptLine[] {
    return [
      { type: 'separator' },
      { type: 'text', text: 'ทดสอบการพิมพ์ / Test Print', align: 'center' },
      { type: 'separator' },
      { type: 'text', text: `ร้าน: ${shopName}` },
      { type: 'text', text: `กระดาษ: ${paperSize}` },
      { type: 'text', text: new Date().toLocaleString('th-TH') },
      { type: 'columns', name: 'กะเพราหมู', qty: 'x2', price: '80' },
      { type: 'columns', name: 'ต้มยำกุ้ง', qty: 'x1', price: '120' },
      { type: 'separator' },
      { type: 'columns', name: 'ยอดสุทธิ', qty: '', price: '200 บาท' },
      { type: 'separator' },
      { type: 'spacer' },
    ]
  }

  /**
   * render ReceiptLine[] → Canvas → Uint8Array (ESC/POS GS v 0)
   * วาด column แต่ละ cell ที่ pixel X คงที่ ไม่ขึ้นกับความกว้างตัวอักษร
   */
  async function buildImageEscPos(lines: ReceiptLine[], paperSize: '58mm' | '80mm'): Promise<Uint8Array> {
    const s = receiptSettings.value
    const printWidth = paperSize === '58mm' ? 384 : 576
    const fontSize = paperSize === '58mm' ? 22 : 26
    const lineHeight = Math.ceil(fontSize * 1.6)
    const charPx = Math.ceil(fontSize / 2)
    const padX = (s.receiptMarginLeft ?? 0) * charPx + 4
    const padXRight = (s.receiptMarginRight ?? 0) * charPx + 4
    const printableWidth = printWidth - padX - padXRight
    const qtyX = padX + Math.round(printableWidth * 0.68)
    const priceX = printWidth - padXRight
    const canvasHeight = lines.length * lineHeight + 20

    const canvas = document.createElement('canvas')
    canvas.width = printWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, printWidth, canvasHeight)
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'top'
    ctx.font = `${fontSize}px 'Sarabun','Noto Sans Thai','TH Sarabun New',monospace`

    lines.forEach((line, i) => {
      const y = 10 + i * lineHeight

      if (line.type === 'separator') {
        ctx.fillRect(padX, y + lineHeight / 2 - 1, printWidth - padX - padXRight, 1)

      } else if (line.type === 'text') {
        const align = line.align ?? 'left'
        if (align === 'center') {
          ctx.fillText(line.text, (printWidth - ctx.measureText(line.text).width) / 2, y)
        } else if (align === 'right') {
          ctx.fillText(line.text, priceX - ctx.measureText(line.text).width, y)
        } else {
          ctx.fillText(line.text, padX, y)
        }

      } else if (line.type === 'columns') {
        const maxNameWidth = qtyX - padX - 16
        let name = line.name
        while (name.length > 1 && ctx.measureText(name).width > maxNameWidth) {
          name = name.slice(0, -1)
        }
        ctx.fillText(name, padX, y)
        if (line.qty) {
          ctx.fillText(line.qty, qtyX - ctx.measureText(line.qty).width, y)
        }
        ctx.fillText(line.price, priceX - ctx.measureText(line.price).width, y)
      }
    })

    const imageData = ctx.getImageData(0, 0, printWidth, canvasHeight)
    const bytesPerRow = Math.ceil(printWidth / 8)
    const bitmap = new Uint8Array(bytesPerRow * canvasHeight)

    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < printWidth; x++) {
        const idx = (y * printWidth + x) * 4
        const brightness = (imageData.data[idx]! + imageData.data[idx + 1]! + imageData.data[idx + 2]!) / 3
        if (brightness < 128) {
          const bitmapIdx = y * bytesPerRow + Math.floor(x / 8)
          bitmap[bitmapIdx]! |= (0x80 >> (x % 8))
        }
      }
    }

    const header = new Uint8Array([
      0x1B, 0x40,
      0x1D, 0x76, 0x30, 0x00,
      bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF,
      canvasHeight & 0xFF, (canvasHeight >> 8) & 0xFF,
    ])
    const footer = new Uint8Array([0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00])

    const result = new Uint8Array(header.length + bitmap.length + footer.length)
    result.set(header, 0)
    result.set(bitmap, header.length)
    result.set(footer, header.length + bitmap.length)
    return result
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
