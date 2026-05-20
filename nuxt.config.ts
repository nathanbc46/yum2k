// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: false, // ปิด SSR อาการเพี้ยนระหว่าง Server/Client จะอัตรธานหายไป เพราะ POS เป็นแอป Offline-first

  compatibilityDate: '2025-07-15',

  // Nuxt 4 future features
  future: { compatibilityVersion: 4 },

  devtools: { enabled: true },

  // HTML Head
  app: {
    head: {
      meta: [
        // viewport-fit=cover จำเป็นสำหรับให้ env(safe-area-inset-*) ทำงานบน iOS
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual' },
      ]
    }
  },

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
      orientation: 'any',
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
      globPatterns: process.env.NODE_ENV === 'production'
        ? ['**/*.{js,css,html,png,svg,ico,webp,woff2}']
        : [], // dev: ไม่ pre-cache (Vite เสิร์ฟจาก memory, ไม่มีไฟล์จริงใน dev-sw-dist)
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'supabase-storage-images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
      navigateFallback: '/',
    }
  },

  // Runtime Config
  runtimeConfig: {
    // Private (server-only)
    lineChannelSecret: process.env.NUXT_LINE_CHANNEL_SECRET,
    lineChannelAccessToken: process.env.NUXT_LINE_CHANNEL_ACCESS_TOKEN,
    public: {
      supabase: {
        url: process.env.NUXT_PUBLIC_SUPABASE_URL,
        key: process.env.NUXT_PUBLIC_SUPABASE_KEY,
      },
      supabaseDeviceEmail: process.env.NUXT_PUBLIC_SUPABASE_DEVICE_EMAIL,
      supabaseDevicePassword: process.env.NUXT_PUBLIC_SUPABASE_DEVICE_PASSWORD,
      defaultGeminiKey: process.env.NUXT_PUBLIC_DEFAULT_GEMINI_KEY || '',
      defaultGroqKey: process.env.NUXT_PUBLIC_DEFAULT_GROQ_KEY || '',
      defaultOpenRouterKey: process.env.NUXT_PUBLIC_DEFAULT_OPENROUTER_KEY || '',
    }
  },

  // Experimental Features
  experimental: {
    emitRouteChunkError: 'automatic',
  },

  // Nitro Configuration: Force prerendering for PWA shell
  nitro: {
    prerender: {
      routes: ['/'],
    },
  },

  // Supabase Config
  supabase: {
    redirect: false, // ปิดการบังคับ Login (เราจะใช้ Offline-first POS)
    clientOptions: {
      auth: {
        // ปิด auto-refresh เพื่อป้องกัน getSession() ทำ network call ตอนเปิดแอป
        // (token refresh จะจัดการเองใน supabase-device-auth plugin ซึ่งมี timeout)
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: true,
      },
    },
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
