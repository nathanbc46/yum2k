// =============================================================================
// utils/crypto.ts
// ฟังก์ชัน Utility สำหรับเข้ารหัสข้อมูลสำคัญ เช่น PIN
// ใช้ Web Crypto API (Built-in ในทุก Browser สมัยใหม่ ไม่ต้องลง Library)
// =============================================================================

/**
 * Hash ข้อความด้วย SHA-256 และคืนค่าเป็น Hex String (64 อักขระ)
 * ใช้สำหรับเข้ารหัส PIN ก่อนเก็บลงฐานข้อมูล
 * 
 * @example
 *   await hashSHA256('1234') → 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
 */
export async function hashSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * ตรวจสอบว่าค่าที่รับเข้ามาเป็น SHA-256 Hash แล้วหรือยัง
 * (SHA-256 Hex = 64 ตัวอักขระ 0-9, a-f)
 */
export function isAlreadyHashed(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value)
}
