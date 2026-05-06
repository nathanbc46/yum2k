/**
 * server/api/line-daily-summary.ts
 * ส่งสรุปยอดขายรายวันไปที่ LINE OA
 *
 * เรียกได้จาก 2 ทาง:
 *  1. Vercel Cron — ทุกวัน 15:00 UTC (22:00 ICT) เป็น fallback
 *  2. Client-side (useLineDailySummary) — ตามเวลาที่ตั้งใน Admin Settings
 *
 * ป้องกันส่งซ้ำ: INSERT into daily_summaries (sent_date) ON CONFLICT DO NOTHING
 * ถ้า INSERT ไม่สำเร็จ (duplicate) → วันนี้ส่งไปแล้ว → skip
 */
import { createClient } from '@supabase/supabase-js'
import { sendLineMessage } from '../utils/sendLineMessage'

export default defineEventHandler(async () => {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.NUXT_SUPABASE_SERVICE_KEY
  const token = process.env.NUXT_LINE_CHANNEL_ACCESS_TOKEN

  if (!token) return { status: 'skipped', reason: 'no LINE token' }
  if (!supabaseUrl || !serviceKey) return { status: 'skipped', reason: 'no supabase config' }

  const supabase = createClient(supabaseUrl, serviceKey)

  // คำนวณวันนี้ในเขตเวลา ICT (UTC+7)
  const now = new Date()
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
  const todayICTStr = new Date(now.getTime() + ICT_OFFSET_MS)
    .toISOString()
    .slice(0, 10) // YYYY-MM-DD

  // ============================================================
  // ป้องกันส่งซ้ำ: INSERT with UNIQUE constraint
  // ถ้า row สำหรับวันนี้มีอยู่แล้ว → count = 0 → skip
  // ============================================================
  const { error: lockError, count } = await supabase
    .from('daily_summaries')
    .insert({ sent_date: todayICTStr, order_count: 0, revenue: 0 }, { count: 'exact' })
    .select()

  if (lockError?.code === '23505' || (count !== null && count === 0)) {
    // duplicate key → วันนี้ส่งไปแล้ว
    return { status: 'skipped', reason: 'already_sent_today', date: todayICTStr }
  }

  if (lockError) {
    console.error('❌ lock error:', lockError.message)
    return { status: 'error', message: lockError.message }
  }

  // ============================================================
  // Query ออร์เดอร์วันนี้
  // ============================================================
  const startOfDay = new Date(`${todayICTStr}T00:00:00+07:00`).toISOString()
  const endOfDay = now.toISOString()

  const { data: orders, error: queryError } = await supabase
    .from('orders')
    .select('total_amount, total_cost, profit_amount, items, status')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .eq('is_deleted', false)
    .neq('status', 'cancelled')

  if (queryError) {
    console.error('❌ query error:', queryError.message)
    return { status: 'error', message: queryError.message }
  }

  const orderCount = orders?.length ?? 0
  const revenue = orders?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0
  const profit = orders?.reduce((s, o) => s + Number(o.profit_amount), 0) ?? 0
  const itemCount = orders?.reduce((s, o) => {
    return s + (Array.isArray(o.items) ? o.items : [])
      .reduce((ss: number, i: any) => ss + (i.quantity ?? 0), 0)
  }, 0) ?? 0
  const avgPerBill = orderCount > 0 ? Math.round(revenue / orderCount) : 0

  // อัปเดต row ที่ lock ไว้ด้วยยอดจริง
  await supabase
    .from('daily_summaries')
    .update({ order_count: orderCount, revenue })
    .eq('sent_date', todayICTStr)

  // ============================================================
  // ส่ง LINE Message
  // ============================================================
  const thaiDate = new Date(`${todayICTStr}T12:00:00+07:00`).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const fmt = (n: number) => n.toLocaleString('th-TH')

  const message = orderCount === 0
    ? `📊 สรุปยอดขาย ${thaiDate}\n─────────────────\nวันนี้ยังไม่มีรายการขาย`
    : [
        `📊 สรุปยอดขาย ${thaiDate}`,
        `─────────────────`,
        `💰 รายได้รวม    ฿${fmt(revenue)}`,
        `🧾 จำนวนบิล    ${orderCount} บิล`,
        `📦 สินค้าขาย   ${itemCount} ชิ้น`,
        `💳 เฉลี่ยต่อบิล  ฿${fmt(avgPerBill)}`,
        `─────────────────`,
        `📈 กำไรสุทธิ   ฿${fmt(profit)}`,
      ].join('\n')

  await sendLineMessage(message)
  return { status: 'ok', orderCount, revenue, date: todayICTStr }
})
