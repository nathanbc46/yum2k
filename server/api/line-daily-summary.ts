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

export default defineEventHandler(async (event) => {
  const force = getQuery(event).force === 'true'
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
  // force=true (ปุ่มทดสอบ) → ข้าม lock ทั้งหมด ไม่แตะ daily_summaries
  // เพื่อไม่ให้การทดสอบไปบล็อก Vercel Cron ที่ยิงตอน 22:00
  // ============================================================
  if (!force) {
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
  }

  // ============================================================
  // Query ออร์เดอร์วันนี้
  // ============================================================
  const startOfDay = new Date(`${todayICTStr}T00:00:00+07:00`).toISOString()
  const endOfDay = now.toISOString()

  const { data: orders, error: queryError } = await supabase
    .from('orders')
    .select('id, total_amount, profit_amount, created_at, payment_method')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .eq('is_deleted', false)
    .neq('status', 'cancelled')

  if (queryError) {
    await supabase.from('daily_summaries').delete().eq('sent_date', todayICTStr)
    console.error('❌ query error:', queryError.message)
    return { status: 'error', message: queryError.message }
  }

  const orderCount = orders?.length ?? 0
  const revenue = orders?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0
  const gp = orders?.reduce((s, o) => s + Number(o.profit_amount), 0) ?? 0

  // คำนวณยอดแยกตามประเภทชำระ (เก็บ pmMap ไว้ใช้ทีหลังหลัง fmt ถูก define)
  const pmLabels: Record<string, string> = { cash: 'เงินสด', promptpay: 'พร้อมเพย์', card: 'บัตรเครดิต', unpaid: 'ค้างจ่าย', other: 'อื่นๆ' }
  const pmIcons: Record<string, string> = { cash: '💵', promptpay: '📲', card: '💳', unpaid: '⏳', other: '💰' }
  const pmMap: Record<string, { total: number; count: number }> = {}
  for (const o of orders ?? []) {
    const m = (o.payment_method as string) || 'other'
    if (!pmMap[m]) pmMap[m] = { total: 0, count: 0 }
    pmMap[m]!.total += Number(o.total_amount)
    pmMap[m]!.count++
  }

  // คำนวณระยะเวลาการขาย
  let firstOrderTime: Date | null = null
  let lastOrderTime: Date | null = null
  let durationMin = 0
  if (orderCount > 0) {
    const times = orders!.map(o => new Date(o.created_at).getTime())
    firstOrderTime = new Date(Math.min(...times))
    lastOrderTime  = new Date(Math.max(...times))
    durationMin = Math.round((lastOrderTime.getTime() - firstOrderTime.getTime()) / 60000)
  }

  // order_items: นับชิ้น + Top 5 ตามจำนวน + Top 5 ตามมูลค่า
  let itemCount = 0
  let top5: { name: string; qty: number }[] = []
  let top5Revenue: { name: string; revenue: number }[] = []
  if (orderCount > 0) {
    const orderIds = orders!.map(o => o.id)
    const { data: itemRows } = await supabase
      .from('order_items')
      .select('product_name, quantity, total_price')
      .in('order_id', orderIds)

    if (itemRows) {
      const productMap = new Map<string, { qty: number; revenue: number }>()
      for (const row of itemRows) {
        itemCount += row.quantity ?? 0
        const prev = productMap.get(row.product_name) ?? { qty: 0, revenue: 0 }
        productMap.set(row.product_name, {
          qty: prev.qty + (row.quantity ?? 0),
          revenue: prev.revenue + (row.total_price ?? 0),
        })
      }
      top5 = Array.from(productMap.entries())
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5)
        .map(([name, v]) => ({ name, qty: v.qty }))
      top5Revenue = Array.from(productMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([name, v]) => ({ name, revenue: v.revenue }))
    }
  }

  // รายจ่ายเฉลี่ยต่อวัน = รายจ่ายรวมทั้งเดือน / จำนวนวันในเดือน
  const [year, month] = todayICTStr.split('-').map(Number)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = new Date(year!, month!, 0).getDate()
  const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

  const { data: expenseRows } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEndStr)
    .eq('is_deleted', 0)

  const totalMonthExpenses = expenseRows?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const dailyAvgExpense = Math.round(totalMonthExpenses / daysInMonth)
  const netProfit = revenue - dailyAvgExpense

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

  const gpPct = revenue > 0 ? ((gp / revenue) * 100).toFixed(1) : '0.0'
  const top5Lines = top5.map((p, i) => `  ${i + 1}. ${p.name}  ${p.qty} ชิ้น`)
  const top5RevenueLines = top5Revenue.map((p, i) => `  ${i + 1}. ${p.name}  ฿${fmt(p.revenue)}`)
  const paymentLines = Object.entries(pmMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([m, v]) => `  ${pmIcons[m] ?? '💰'} ${pmLabels[m] ?? 'อื่นๆ'}  ฿${fmt(v.total)} (${v.count} บิล)`)

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
  const fmtDuration = (min: number) => {
    if (min < 60) return `${min} นาที`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`
  }
  const durationLine = firstOrderTime && lastOrderTime
    ? orderCount === 1
      ? `⏱️ เวลาขาย      ${fmtTime(firstOrderTime)}`
      : `⏱️ เวลาขาย      ${fmtTime(firstOrderTime)} – ${fmtTime(lastOrderTime)} (${fmtDuration(durationMin)})`
    : null

  const message = orderCount === 0
    ? `📊 สรุปยอดขาย ${thaiDate}\n─────────────────\nวันนี้ยังไม่มีรายการขาย`
    : [
        `📊 สรุปยอดขาย ${thaiDate}`,
        `─────────────────`,
        `💰 รายได้รวม    ฿${fmt(revenue)}`,
        `🧾 จำนวนบิล    ${orderCount} บิล`,
        `📦 สินค้าขาย   ${itemCount} ชิ้น`,
        `💳 เฉลี่ยต่อบิล  ฿${fmt(avgPerBill)}`,
        ...(durationLine ? [durationLine] : []),
        `─────────────────`,
        `🏷️ กำไรสินค้า (GP) ฿${fmt(gp)} (${gpPct}%)`,
        `💸 รายจ่าย/วัน   ฿${fmt(dailyAvgExpense)}`,
        `📈 กำไรสุทธิ   ${netProfit >= 0 ? '' : '-'}฿${fmt(Math.abs(netProfit))}`,
        ...(top5.length > 0 ? [
          `─────────────────`,
          `⭐ Top ${top5.length} สินค้าขายดี (จำนวน)`,
          ...top5Lines,
        ] : []),
        ...(top5Revenue.length > 0 ? [
          `─────────────────`,
          `💎 Top ${top5Revenue.length} สินค้าขายดี (มูลค่า)`,
          ...top5RevenueLines,
        ] : []),
        ...(paymentLines.length > 0 ? [
          `─────────────────`,
          `💳 ยอดแยกตามประเภทชำระ`,
          ...paymentLines,
        ] : []),
      ].join('\n')

  await sendLineMessage(message)
  return { status: 'ok', orderCount, revenue, date: todayICTStr }
})
