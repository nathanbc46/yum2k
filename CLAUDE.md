# Yum2K POS — Claude Code Guide

ระบบ POS สำหรับร้านยำ (ยำทูเค) รัน offline-first บน Android Tablet (landscape mode)
สื่อสาร, comment code, และ UI ทั้งหมดเป็น **ภาษาไทย**

## Tech Stack

- **Framework:** Nuxt 4, Vue 3 Composition API, SSR = false (SPA/PWA)
- **Styling:** Tailwind CSS v4 (Vite plugin)
- **State:** Pinia
- **Local DB:** Dexie.js (IndexedDB) — offline-first
- **Cloud:** Supabase (sync เมื่อมีอินเตอร์เน็ต)
- **PWA:** @vite-pwa/nuxt
- **Icons:** Lucide Vue Next หรือ OhVueIcons

## Dev Commands

```bash
npm run dev      # dev server http://localhost:3000
npm run build    # production build
npm run preview  # preview production build
npx vitest       # unit tests
```

## Project Structure

```
app/
├── db/
│   ├── index.ts          # Dexie schema + hooks (DB_VERSION = 7)
│   └── seedData.ts       # Seed data เริ่มต้น
├── types/index.ts        # TypeScript interfaces ทั้งหมด
├── composables/          # useCart, useSync, useInventory, useProducts, ...
├── stores/
│   ├── pos.ts            # Pinia POS store (cart, session)
│   └── auth.ts           # Pinia auth store
├── components/
│   ├── pos/              # POS UI components
│   └── admin/            # Admin UI components
├── pages/                # index, login, admin, orders, change-pin
├── plugins/
│   ├── dexie.client.ts                    # เปิด IndexedDB
│   └── supabase-device-auth.client.ts    # Auth อัตโนมัติ
└── middleware/auth.global.ts
```

## Architecture Rules

**Offline-First:** บันทึกลง IndexedDB ก่อนเสมอ → sync ขึ้น Supabase ทีหลังเมื่อออนไลน์
**Cart Safety:** บันทึก cart ลง IndexedDB ทุกครั้งที่มีการเปลี่ยนแปลง ห้ามเก็บเฉพาะใน memory
**ห้ามใช้ localStorage** สำหรับข้อมูลขนาดใหญ่ → ใช้ Dexie เท่านั้น
**DB Schema:** ทุกครั้งที่เปลี่ยน schema ใน `app/db/index.ts` ต้องเพิ่ม `DB_VERSION` ด้วย

## Naming Convention

| ที่เก็บ | รูปแบบ | ตัวอย่าง |
|--------|--------|---------|
| Frontend / IndexedDB | camelCase | `mappingType`, `updatedAt`, `lastLoginAt` |
| Supabase / PostgreSQL | snake_case | `mapping_type`, `updated_at`, `last_login_at` |

Map อย่างชัดเจนใน sync composables ทุกครั้งที่รับ/ส่งข้อมูลกับ Supabase

## Coding Standards

- ใช้ `<script setup lang="ts">` เสมอ
- Logic ที่ใช้ซ้ำหลายที่ → Composable ใน `app/composables/`
- Component POS → `app/components/pos/`, Admin → `app/components/admin/`
- POS layout (landscape): Left Cart **30%** / Center Product Grid **55%** / Right Category Sidebar **15%**
- Touch target ขั้นต่ำ **44px** height ทุก button
- ใช้ visual feedback (active states, transitions) กับทุก touch interaction
- Lazy load รูปภาพ, ใช้ WebP format

## Product Logic

- `costPrice` default = 60% ของ `salePrice` ถ้าไม่ระบุ
- Bundle/Promotion mapping: ขาย 1 ชิ้น → ตัดสต็อกหลายรายการพร้อมกัน (ดู `InventoryMapping` ใน types)
- สินค้าปกติ: `mappingType = null` → ตัดสต็อกตัวเองเท่านั้น

## RBAC

- **admin:** จัดการสินค้า, หมวดหมู่, รายงาน, ตั้งค่าระบบ
- **staff:** หน้าขาย POS เท่านั้น
