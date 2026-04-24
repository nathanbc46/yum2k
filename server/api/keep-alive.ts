/**
 * server/api/keep-alive.ts
 * API สำหรับให้ Vercel Cron Job เรียกใช้ เพื่อป้องกัน Supabase เข้าสู่โหมด Pause
 */
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  
  // ยิง Query ง่ายๆ ไปที่ตารางหมวดหมู่สินค้า
  const { data, error } = await client
    .from('categories')
    .select('id')
    .limit(1)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Database keep-alive failed: ${error.message}`,
    })
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Supabase project is alive!'
  }
})
