import { describe, it, expect } from 'vitest'
import { crc16CcittFalse, parseEmvTlv, serializeEmvTlv, buildDynamicPaymentQrPayload, extractMerchantName } from '../../app/utils/emvQr'

// สร้าง static payload ทดสอบจาก TLV array (แน่ใจว่า TLV valid ทั้งหมด)
// tag00=01(payload format), tag01=11(static), tag30(TrueMoney merchant), tag53=764(THB), tag58=TH, tag59=MERCHANT A, tag63=CRC
const STATIC_BASE = serializeEmvTlv([
  { tag: '00', value: '01' },
  { tag: '01', value: '11' },
  { tag: '30', value: '0016A000000677010111' },
  { tag: '53', value: '764' },
  { tag: '58', value: 'TH' },
  { tag: '59', value: 'MERCHANT A' },
]) + '6304'
const STATIC_PAYLOAD = STATIC_BASE + crc16CcittFalse(STATIC_BASE)

describe('crc16CcittFalse', () => {
  it('produces 4-char uppercase hex', () => {
    const crc = crc16CcittFalse('123456789')
    expect(crc).toHaveLength(4)
    expect(crc).toMatch(/^[0-9A-F]{4}$/)
  })

  it('matches known CRC16-CCITT-False value for "123456789"', () => {
    // Standard test vector: CRC16-CCITT-False("123456789") = 0x29B1
    expect(crc16CcittFalse('123456789')).toBe('29B1')
  })
})

describe('parseEmvTlv / serializeEmvTlv', () => {
  it('round-trips a payload', () => {
    const tlv = parseEmvTlv(STATIC_PAYLOAD)
    expect(tlv.length).toBeGreaterThan(3)
    expect(tlv.find(t => t.tag === '00')?.value).toBe('01')
    expect(tlv.find(t => t.tag === '01')?.value).toBe('11')
    expect(serializeEmvTlv(tlv)).toBe(STATIC_PAYLOAD)
  })
})

describe('extractMerchantName', () => {
  it('returns tag 59 value', () => {
    expect(extractMerchantName(STATIC_PAYLOAD)).toBe('MERCHANT A')
  })
})

describe('buildDynamicPaymentQrPayload', () => {
  it('sets tag 01 to "12"', () => {
    const out = buildDynamicPaymentQrPayload(STATIC_PAYLOAD, 55)
    const tlv = parseEmvTlv(out)
    expect(tlv.find(t => t.tag === '01')?.value).toBe('12')
  })

  it('inserts tag 54 with amount formatted to 2 decimals', () => {
    const out = buildDynamicPaymentQrPayload(STATIC_PAYLOAD, 123.4)
    expect(out).toContain('540612' + '3.40')  // tag 54, len 06, value "123.40"
  })

  it('places tag 54 immediately after tag 53 (EMVCo numeric order)', () => {
    const out = buildDynamicPaymentQrPayload(STATIC_PAYLOAD, 100)
    const tlv = parseEmvTlv(out)
    const idx54 = tlv.findIndex(t => t.tag === '54')
    const idx53 = tlv.findIndex(t => t.tag === '53')
    expect(idx53).toBeGreaterThanOrEqual(0)
    expect(idx54).toBe(idx53 + 1)
  })

  it('produces a valid CRC that verifies', () => {
    const out = buildDynamicPaymentQrPayload(STATIC_PAYLOAD, 50)
    // ลบ CRC (4 ตัวสุดท้าย) แล้วคำนวณใหม่ต้องเท่ากับ CRC ที่แนบมา
    const base = out.slice(0, -4)
    const crc = out.slice(-4)
    expect(crc16CcittFalse(base)).toBe(crc)
  })

  it('replaces existing tag 54 instead of duplicating', () => {
    const withAmount = buildDynamicPaymentQrPayload(STATIC_PAYLOAD, 100)
    const replaced = buildDynamicPaymentQrPayload(withAmount, 200)
    const tlv = parseEmvTlv(replaced)
    const t54s = tlv.filter(t => t.tag === '54')
    expect(t54s).toHaveLength(1)
    expect(t54s[0]!.value).toBe('200.00')
  })
})
