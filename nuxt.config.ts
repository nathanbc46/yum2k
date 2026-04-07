// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: false, // ปิด SSR อาการเพี้ยนระหว่าง Server/Client จะอัตรธานหายไป เพราะ POS เป็นแอป Offline-first

  compatibilityDate: '2025-07-15',

  // Nuxt 4 future features
  future: { compatibilityVersion: 4 },

  devtools: { enabled: true },

  // Modules
  modules: ['@pinia/nuxt', '@nuxtjs/supabase', '@vite-pwa/nuxt'],

  // PWA Config
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Yum2K POS - ยำทูเค',
      short_name: 'Yum2K',
      description: 'ระบบจัดการร้านยำและร้านอาหารครบวงจร',
      theme_color: '#0f172a',
      background_color: '#020617',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: 'icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    }
  },

  // Supabase Config
  supabase: {
    redirect: false, // ปิดการบังคับ Login (เราจะใช้ Offline-first POS)
  },

  // Vite Config: ใช้ Tailwind CSS v4 ผ่าน Vite plugin
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['dexie', '@vue/devtools-core', '@vue/devtools-kit'],
    },
  },

  // TypeScript Config
  typescript: {
    strict: true,
  },

  // CSS Entry Point
  css: ['~/assets/css/main.css'],
})
