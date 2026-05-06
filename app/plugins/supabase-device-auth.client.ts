// plugins/supabase-device-auth.client.ts
// Auto-login ด้วย shared device account เพื่อให้ผ่าน Supabase RLS (TO authenticated)
//
// ⚠️ ห้ามใช้ enforce:'pre' + async setup() เด็ดขาด — จะบล็อก app startup ทั้งหมด
//    Auth รัน background (void) เพื่อให้แอปโหลดจาก IndexedDB ก่อน แล้ว sync ทีหลัง
// =============================================================================

export default defineNuxtPlugin({
  name: 'supabase-device-auth',
  setup() {
    const supabase = useSupabaseClient()
    const config = useRuntimeConfig()

    const email = config.public.supabaseDeviceEmail as string | undefined
    const password = config.public.supabaseDevicePassword as string | undefined

    if (!email || !password) {
      console.warn('⚠️ Supabase device credentials ไม่ได้ตั้งค่า — Sync จะไม่ทำงาน')
      return
    }

    // รัน auth ใน background — ไม่ await, ไม่บล็อก app startup
    void (async () => {
      try {
        // getSession() อ่านจาก localStorage (fast) เพราะ autoRefreshToken=false ใน nuxt.config
        // แต่อาจคืน session ที่หมดอายุ → ตรวจ expires_at เอง
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 5_000)

        const tokenValid = session?.expires_at && (session.expires_at * 1000) > Date.now() + 60_000
        if (tokenValid) return

        // token หมดอายุหรือไม่มี → sign in ใหม่ (15 วินาที)
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          15_000
        )
        if (error) console.error('❌ Supabase device auth ล้มเหลว:', error.message)
        else console.log('✅ Supabase device auth สำเร็จ')
      } catch (err: any) {
        console.warn('⚠️ Supabase device auth ไม่สำเร็จ (จะลองใหม่ตอน sync):', err?.message ?? err)
      }
    })()
  },
})
