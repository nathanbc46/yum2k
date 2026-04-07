// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: false, // ปิด SSR อาการเพี้ยนระหว่าง Server/Client จะอัตรธานหายไป เพราะ POS เป็นแอป Offline-first

  compatibilityDate: '2025-07-15',

  // Nuxt 4 future features
  future: { compatibilityVersion: 4 },

  devtools: { enabled: true },

  // Modules
  modules: ['@pinia/nuxt', '@nuxtjs/supabase'],

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
