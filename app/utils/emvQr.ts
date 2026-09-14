// EMVCo Merchant-Presented QR utilities
// รองรับ TrueMoney Merchant, PromptPay, ThaiQR (มาตรฐานเดียวกัน)
// อ้างอิง: EMV QR Code Specification for Payment Systems v1.0

export interface EmvTlv {
  tag: string
  value: string
}

/**
 * CRC16-CCITT-False
 * polynomial: 0x1021, init: 0xFFFF, no reflection, no XOR-out
 * ใช้สำหรับ EMVCo tag 63 (Cyclic Redundancy Check)
 * คืนค่า 4-char hex uppercase
 */
export function crc16CcittFalse(data: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Parse EMVCo TLV payload → array of {tag, value} เรียงตามลำดับที่เจอ */
export function parseEmvTlv(payload: string): EmvTlv[] {
  const result: EmvTlv[] = []
  let i = 0
  while (i < payload.length) {
    if (i + 4 > payload.length) break
    const tag = payload.substr(i, 2)
    const len = parseInt(payload.substr(i + 2, 2), 10)
    if (isNaN(len)) break
    const value = payload.substr(i + 4, len)
    result.push({ tag, value })
    i += 4 + len
  }
  return result
}

/** Serialize TLV กลับเป็น string */
export function serializeEmvTlv(tlv: EmvTlv[]): string {
  return tlv.map(t => t.tag + String(t.value.length).padStart(2, '0') + t.value).join('')
}

/**
 * แปลง Static payload → Dynamic + ใส่ยอดชำระ
 * - tag 01 = "12" (Dynamic)
 * - tag 54 = amount (insert ก่อน tag 53 currency ตามลำดับ numeric ของ EMVCo)
 * - คำนวณ CRC ใหม่
 */
export function buildDynamicPaymentQrPayload(basePayload: string, amount: number): string {
  const tlv = parseEmvTlv(basePayload)

  // Set tag 01 = "12"
  const t01 = tlv.find(t => t.tag === '01')
  if (t01) t01.value = '12'
  else tlv.unshift({ tag: '01', value: '12' })

  // Upsert tag 54 (Transaction Amount) — ก่อน tag 53 หรือท้ายสุดถ้าไม่มี
  const amountStr = amount.toFixed(2)
  const existingIdx54 = tlv.findIndex(t => t.tag === '54')
  if (existingIdx54 >= 0) {
    tlv[existingIdx54]!.value = amountStr
  } else {
    const idx53 = tlv.findIndex(t => t.tag === '53')
    const insertAt = idx53 >= 0 ? idx53 + 1 : tlv.length
    tlv.splice(insertAt, 0, { tag: '54', value: amountStr })
  }

  // ลบ tag 63 เดิม
  const withoutCrc = tlv.filter(t => t.tag !== '63')

  // Serialize + append "6304" แล้วคำนวณ CRC ของทั้งก้อน (รวม "6304")
  const base = serializeEmvTlv(withoutCrc) + '6304'
  const crc = crc16CcittFalse(base)
  return base + crc
}

/** Decode merchant name (tag 59) จาก payload — สำหรับ preview/testing ในหน้า settings */
export function extractMerchantName(payload: string): string | null {
  const tlv = parseEmvTlv(payload)
  return tlv.find(t => t.tag === '59')?.value ?? null
}
