// server/api/thermal-print.post.ts
// รับ ESC/POS buffer (base64) แล้วส่งผ่าน TCP socket ไปยัง WiFi thermal printer
// ใช้กับ Xprinter XP-C300H (หรือ printer อื่นๆ) ที่เชื่อมต่อผ่าน WiFi/LAN
// Port มาตรฐานของ thermal printer คือ 9100

import { createConnection } from 'node:net'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { ip, port, data } = body as { ip: string; port: number; data: string }

  if (!ip || !data) {
    throw createError({ statusCode: 400, message: 'ต้องระบุ ip และ data' })
  }

  const tcpPort = port || 9100
  const buffer = Buffer.from(data, 'base64')

  return new Promise<{ success: boolean }>((resolve, reject) => {
    const client = createConnection({ host: ip, port: tcpPort }, () => {
      client.write(buffer, () => {
        client.end()
      })
    })

    client.on('end', () => resolve({ success: true }))

    client.on('error', (err) => {
      reject(createError({ statusCode: 502, message: `เชื่อมต่อ printer ไม่ได้: ${err.message}` }))
    })

    // timeout 5 วินาที
    setTimeout(() => {
      client.destroy()
      reject(createError({ statusCode: 504, message: 'หมดเวลาเชื่อมต่อ printer (timeout 5s)' }))
    }, 5000)
  })
})
