/**
 * server/api/line-notify.post.ts
 * รับ event จาก frontend แล้วส่ง LINE push message
 * ใช้สำหรับ: ออร์เดอร์ใหม่, สต็อกใกล้หมด
 */
import { sendLineMessage } from '../utils/sendLineMessage'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { type } = body

  let message = ''

  if (type === 'new_order') {
    const { order } = body
    const allItems = (order.items ?? []) as Array<{ productName: string; quantity: number }>
    const itemLines = allItems
      .map((i) => `${i.productName} x${i.quantity}`)

    // แสดงสูงสุด 4 รายการ แล้วต่อ "และอีก N รายการ"
    const preview = itemLines.slice(0, 4).join(', ')
    const extra = itemLines.length > 4 ? ` และอีก ${itemLines.length - 4} รายการ` : ''
    const statusTag = order.status === 'pending' ? ' 🔔ค้างจ่าย' : ''
    const amount = Number(order.totalAmount).toLocaleString('th-TH')

    message = `📦 ออร์เดอร์ #${order.orderNumber}${statusTag}\n${preview}${extra}\nรวม ฿${amount}`

  } else if (type === 'low_stock') {
    const { items } = body as { items: Array<{ name: string; currentStock: number }> }
    if (!items?.length) return { status: 'ok' }
    const lines = items.map((i) =>
      i.currentStock <= 0 ? `• ${i.name}: หมดแล้ว` : `• ${i.name}: เหลือ ${i.currentStock} ชิ้น`
    )
    message = `⚠️ สต็อกใกล้หมด\n${lines.join('\n')}`
  }

  if (!message) return { status: 'ok' }

  await sendLineMessage(message)
  return { status: 'ok' }
})
