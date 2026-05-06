/**
 * server/utils/sendLineMessage.ts
 * ส่ง LINE Broadcast Message ไปหาผู้ติดตาม LINE OA ทั้งหมด
 */
export async function sendLineMessage(text: string): Promise<void> {
  const token = process.env.NUXT_LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return

  await $fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: { messages: [{ type: 'text', text }] },
  }).catch((err: any) => {
    console.error('❌ LINE broadcast ล้มเหลว:', err?.data?.message ?? err?.message)
  })
}
