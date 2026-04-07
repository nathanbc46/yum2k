<template>
  <div class="h-full w-full flex overflow-hidden bg-surface-950 text-surface-50">
    <!-- ซ้ายมือ: ตะกร้า (30%) -->
    <aside class="w-[30%] min-w-[320px] max-w-[400px] border-r border-surface-800 bg-surface-900 flex flex-col">
      <slot name="cart" />
    </aside>

    <!-- ตรงกลาง: กริดสินค้า (55%) -->
    <main class="flex-1 flex flex-col bg-surface-950 px-4 py-4 overflow-hidden relative">
      <slot name="grid" />
    </main>

    <!-- ขวามือ: หมวดหมู่ (15%) -->
    <aside class="w-[15%] min-w-[120px] max-w-[180px] border-l border-surface-800 bg-surface-900 flex flex-col py-2 overflow-y-auto scrollbar-thin">
      <slot name="categories" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// จัดการหน้าจอ Responsive แบบ 3 Section
// ใส่ Slot กระจายของลงไปตามสัดส่วน
</script>
