/**
 * server/api/line-webhook.ts
 * LINE Messaging API Webhook — รับข้อความจาก LINE bot
 * ใช้สำหรับตรวจจับแจ้งเตือนเงินเข้าจาก KTB Connext / SCB Connect
 *
 * วิธีตั้งค่า:
 * 1. สร้าง LINE Official Account / Messaging API channel ที่ https://developers.line.biz
 * 2. ตั้ง Webhook URL เป็น https://your-domain/api/line-webhook
 * 3. เพิ่ม LINE Bot เข้า Group เดียวกับ KTB Connext / SCB Connect
 * 4. ตั้งค่า NUXT_LINE_CHANNEL_SECRET และ NUXT_SUPABASE_SERVICE_KEY ใน .env
 */
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Pattern จับจำนวนเงินจากข้อความแจ้งเตือนธนาคาร
const AMOUNT_PATTERNS = [
  /\+\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*บาท/,          // +3,000.00 บาท (SCB, KTB)
  /รับเงิน\s+([0-9,]+(?:\.[0-9]{1,2})?)/,            // รับเงิน 3000.00
  /เงินโอนเข้า\s+\+?([0-9,]+(?:\.[0-9]{1,2})?)/,    // เงินโอนเข้า +3,000
  /รับโอนเงิน\s+([0-9,]+(?:\.[0-9]{1,2})?)/,         // รับโอนเงิน 3,000.00 บาท
  /฿\s*([0-9,]+(?:\.[0-9]{1,2})?)/,                   // ฿3,000.00
  /จำนวนเงิน\s+([0-9,]+(?:\.[0-9]{1,2})?)/,          // จำนวนเงิน 3,000.00
]

const BANK_KEYWORDS: Record<string, string> = {
  'กรุงไทย': 'KTB',
  'krungthai': 'KTB',
  'ktb': 'KTB',
  'scb': 'SCB',
  'ไทยพาณิชย์': 'SCB',
  'กสิกร': 'KBANK',
  'kbank': 'KBANK',
  'กรุงเทพ': 'BBL',
  'bbl': 'BBL',
  'ทหารไทย': 'TTB',
  'ttb': 'TTB',
  'tmb': 'TTB',
  'กรุงศรี': 'BAY',
  'bay': 'BAY',
  'ออมสิน': 'GSB',
}

function parseAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const cleaned = match[1].replace(/,/g, '')
      const amount = parseFloat(cleaned)
      if (!isNaN(amount) && amount > 0) return amount
    }
  }
  return null
}

function detectBank(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [keyword, bank] of Object.entries(BANK_KEYWORDS)) {
    if (lower.includes(keyword.toLowerCase())) return bank
  }
  return null
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const digest = hmac.digest('base64')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const channelSecret = config.lineChannelSecret as string | undefined

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    return { status: 'ok' }
  }

  // ตรวจสอบ Signature ถ้ามี secret ตั้งไว้
  if (channelSecret) {
    const signature = getHeader(event, 'x-line-signature') ?? ''
    if (!verifySignature(rawBody, signature, channelSecret)) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid LINE signature' })
    }
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return { status: 'ok' }
  }

  const events: any[] = body.events ?? []
  const textMessages = events.filter(
    (e: any) => e.type === 'message' && e.message?.type === 'text'
  )

  if (textMessages.length === 0) return { status: 'ok' }

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.NUXT_SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ LINE webhook: NUXT_PUBLIC_SUPABASE_URL หรือ NUXT_SUPABASE_SERVICE_KEY ไม่ได้ตั้งค่าไว้')
    return { status: 'ok' }
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  for (const e of textMessages) {
    const text: string = e.message.text ?? ''
    const amount = parseAmount(text)
    if (!amount) continue

    const bankName = detectBank(text)
    const note = `เงินโอนเข้า${bankName ? ` (${bankName})` : ''}`

    const { error } = await supabase.from('bank_transfers').insert({
      amount,
      bank_name: bankName,
      note,
      raw_message: text.substring(0, 500),
    })

    if (error) {
      console.error('❌ บันทึก bank_transfer ล้มเหลว:', error.message)
    } else {
      console.log(`✅ เงินเข้า ${amount} บาท ${bankName ?? ''}`)
    }
  }

  return { status: 'ok' }
})
