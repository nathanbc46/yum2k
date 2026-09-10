/**
 * server/api/cron-generate-expenses.ts
 * สร้างรายจ่ายประจำอัตโนมัติฝั่ง server
 *
 * เรียกได้ 2 ทาง:
 *  1. Vercel Cron — ทุกวัน 01:00 UTC (08:00 ICT)
 *  2. Manual — เรียก URL ตรงเพื่อทดสอบ
 *
 * Idempotent: ใช้ ON CONFLICT DO NOTHING บน (recurring_expense_uuid, expense_date)
 * ปลอดภัยในการ trigger ซ้ำโดยไม่มีข้อมูลซ้ำ
 */
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
const BACKFILL_DAYS = 7

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export default defineEventHandler(async () => {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.NUXT_SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) {
    return { status: 'skipped', reason: 'no supabase config' }
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // วันนี้ในเขตเวลา ICT (UTC+7)
  const now = new Date()
  const todayICT = toDateStr(new Date(now.getTime() + ICT_OFFSET_MS))

  // โหลด templates ที่ active
  const { data: templates, error: tplError } = await supabase
    .from('recurring_expenses')
    .select('uuid, frequency, day_of_month, amount, description, category, category_uuid, vendor, unit, quantity')
    .eq('is_active', true)
    .eq('is_deleted', 0)

  if (tplError) {
    console.error('❌ cron-generate-expenses: โหลด templates ล้มเหลว:', tplError.message)
    return { status: 'error', message: tplError.message }
  }

  if (!templates || templates.length === 0) {
    return { status: 'ok', generated: 0, reason: 'no active templates' }
  }

  let totalGenerated = 0

  for (const tpl of templates) {
    // หาวันล่าสุดที่เคยสร้าง expense สำหรับ template นี้
    const { data: lastRow } = await supabase
      .from('expenses')
      .select('expense_date')
      .eq('recurring_expense_uuid', tpl.uuid)
      .eq('is_deleted', 0)
      .order('expense_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastDate: string | null = lastRow?.expense_date ?? null

    const fromDate = lastDate
      ? addDays(lastDate, 1)
      : addDays(todayICT, -(BACKFILL_DAYS - 1))

    const datesToGenerate: string[] = []
    let cur = fromDate
    while (cur <= todayICT) {
      if (tpl.frequency === 'daily') {
        datesToGenerate.push(cur)
      } else if (tpl.frequency === 'monthly' && tpl.day_of_month) {
        const dayNum = parseInt(cur.slice(8, 10), 10)
        if (dayNum === tpl.day_of_month) {
          datesToGenerate.push(cur)
        }
      }
      cur = addDays(cur, 1)
    }

    if (datesToGenerate.length === 0) continue

    const rows = datesToGenerate.map(dateStr => ({
      uuid:                   uuidv4(),
      recurring_expense_uuid: tpl.uuid,
      amount:                 tpl.amount,
      description:            tpl.description,
      category:               tpl.category ?? 'other',
      category_uuid:          tpl.category_uuid ?? null,
      vendor:                 tpl.vendor ?? null,
      unit:                   tpl.unit ?? null,
      quantity:               tpl.quantity ?? null,
      expense_date:           dateStr,
      recorded_by:            'ระบบ (Auto)',
      is_deleted:             0,
      created_at:             now.toISOString(),
      updated_at:             now.toISOString(),
    }))

    const { error: insertError, count } = await supabase
      .from('expenses')
      .upsert(rows, {
        onConflict: 'recurring_expense_uuid,expense_date',
        ignoreDuplicates: true,
        count: 'exact',
      })

    if (insertError) {
      console.error(`❌ insert expenses สำหรับ template ${tpl.uuid}:`, insertError.message)
      continue
    }

    totalGenerated += count ?? datesToGenerate.length
  }

  if (totalGenerated > 0) {
    console.log(`✅ cron-generate-expenses: สร้างรายจ่ายประจำ ${totalGenerated} รายการ (${todayICT})`)
  }

  return { status: 'ok', generated: totalGenerated, date: todayICT }
})
