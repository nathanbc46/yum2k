<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="$emit('close')"
      >
        <div class="bg-surface-900 border border-surface-700 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

          <!-- ===== Modal Top Bar ===== -->
          <div class="border-b border-surface-800 shrink-0">
            <!-- แถวบน: ชื่อ + ปุ่ม Action -->
            <div class="px-6 py-3 flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg shrink-0">🍽️</div>
                <div class="min-w-0">
                  <h2 class="text-base font-bold text-surface-50 truncate">ปริ้นเมนูสินค้า</h2>
                  <p class="text-xs text-surface-500 truncate">
                    เลือก {{ selectedCategoryIds.length }}/{{ allGroups.length }} หมวดหมู่ ·
                    {{ totalPrintProducts }} รายการ
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <!-- Save Image -->
                <button
                  @click="handleSaveImage"
                  :disabled="selectedCategoryIds.length === 0 || isSavingImage"
                  class="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg"
                >
                  <span v-if="isSavingImage" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>{{ isSavingImage ? 'กำลังบันทึก...' : '🖼️ บันทึกรูป' }}</span>
                </button>
                <!-- Print -->
                <button
                  @click="handlePrint"
                  :disabled="selectedCategoryIds.length === 0"
                  class="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold rounded-xl transition-all shadow-lg"
                >
                  🖨️ ปริ้น
                </button>
                <button
                  @click="$emit('close')"
                  class="w-8 h-8 rounded-xl bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- แถวล่าง: Controls -->
            <div class="px-6 py-2 flex items-center gap-2 flex-wrap border-t border-surface-800/60">
              <!-- Select: ความหนาแน่น -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">ระยะ</label>
                <select
                  v-model="selectedDensity"
                  class="bg-surface-900 border border-surface-700 text-surface-100 text-xs rounded-md px-1.5 py-0.5 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option v-for="d in densities" :key="d.id" :value="d.id">{{ d.label }}</option>
                </select>
              </div>

              <!-- ขนาดตัวหนังสือ -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">ขนาดตัวหนังสือ</label>
                <div class="flex items-center gap-1">
                  <button @click="decreaseFontSize" class="w-5 h-5 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 flex items-center justify-center font-bold text-xs transition-all">-</button>
                  <span class="text-xs font-mono font-bold text-surface-100 w-9 text-center">{{ fontSizeScale }}%</span>
                  <button @click="increaseFontSize" class="w-5 h-5 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 flex items-center justify-center font-bold text-xs transition-all">+</button>
                </div>
              </div>

              <!-- Toggle: แสดงราคา -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">แสดงราคา</label>
                <button @click="showPrice = !showPrice" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" :class="showPrice ? 'bg-amber-500' : 'bg-surface-600'">
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm" :class="showPrice ? 'translate-x-4' : 'translate-x-1'" />
                </button>
              </div>

              <!-- Toggle: ดาวขายดี -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">★ ขายดี</label>
                <button @click="showBestsellerStars = !showBestsellerStars" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" :class="showBestsellerStars ? 'bg-amber-500' : 'bg-surface-600'">
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm" :class="showBestsellerStars ? 'translate-x-4' : 'translate-x-1'" />
                </button>
              </div>

              <!-- Theme Color -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">สีธีม</label>
                <div class="flex gap-1">
                  <button v-for="theme in themes" :key="theme.id" @click="selectedTheme = theme.id" class="w-5 h-5 rounded-full border-2 transition-all" :class="selectedTheme === theme.id ? 'border-white scale-110' : 'border-transparent opacity-70'" :style="{ background: theme.accent }" :title="theme.label" />
                </div>
              </div>
            </div>
          </div>

          <!-- ===== Body: Sidebar + Preview ===== -->
          <div class="flex flex-1 min-h-0 overflow-hidden">

            <!-- Sidebar: เลือกหมวดหมู่ -->
            <div class="w-56 shrink-0 border-r border-surface-800 overflow-y-auto bg-surface-950 flex flex-col">
              <div class="px-4 py-3 border-b border-surface-800 flex items-center justify-between">
                <span class="text-xs font-bold text-surface-400 uppercase tracking-wider">หมวดหมู่</span>
                <button
                  @click="toggleSelectAll"
                  class="text-[10px] text-primary-400 hover:text-primary-300 font-bold transition-colors"
                >
                  {{ isAllCatsSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด' }}
                </button>
              </div>

              <div class="flex-1 py-2">
                <label
                  v-for="group in allGroups"
                  :key="group.categoryId"
                  class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-800/60 transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="selectedCategoryIds.includes(group.categoryId)"
                    @change="toggleCategory(group.categoryId)"
                    class="w-4 h-4 rounded accent-amber-500 shrink-0 cursor-pointer"
                  />
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-surface-200 truncate">{{ group.categoryName }}</div>
                    <div class="text-[10px] text-surface-500">{{ group.products.length }} รายการ</div>
                  </div>
                  <!-- color dot -->
                  <div
                    class="w-2 h-2 rounded-full shrink-0 ml-auto"
                    :style="{ background: group.color }"
                  />
                </label>
              </div>

              <!-- Stats -->
              <div class="px-4 py-3 border-t border-surface-800 text-[10px] text-surface-600">
                ปริ้น {{ totalPrintProducts }} รายการ
              </div>
            </div>

            <!-- A4 Preview Area -->
            <div class="flex-1 overflow-auto bg-zinc-300 p-6">
              <!-- Empty state -->
              <div v-if="selectedCategoryIds.length === 0" class="flex flex-col items-center justify-center h-full gap-3 text-surface-500">
                <span class="text-5xl opacity-20">☑️</span>
                <p class="text-sm">เลือกหมวดหมู่ที่ต้องการปริ้นจากด้านซ้าย</p>
              </div>

              <!-- A4 Paper -->
              <div
                v-else
                ref="printArea"
                id="menu-print-area"
                class="mx-auto shadow-2xl"
                style="
                  width: 794px;
                  min-height: 1123px;
                  background: #ffffff;
                  font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
                  box-sizing: border-box;
                  position: relative;
                  overflow: hidden;
                "
                :style="{
                  padding: currentDensity.a4Padding,
                  '--menu-font-scale': fontSizeScale / 100
                }"
              >
                <!-- Watermarks (Spicy Salad Elements) -->
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; z-index: 0;">
                  <!-- Lime slice: Top-left -->
                  <div style="position: absolute; top: 4%; left: -6%; width: 160px; height: 160px; opacity: 0.09; transform: rotate(-15deg);" :style="{ color: currentTheme.accent }">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                      <circle cx="50" cy="50" r="45" />
                      <circle cx="50" cy="50" r="39" stroke-dasharray="4 2" />
                      <line x1="50" y1="10" x2="50" y2="90" />
                      <line x1="10" y1="50" x2="90" y2="50" />
                      <line x1="21.7" y1="21.7" x2="78.3" y2="78.3" />
                      <line x1="21.7" y1="78.3" x2="78.3" y2="21.7" />
                    </svg>
                  </div>

                  <!-- Chili: Top-right -->
                  <div style="position: absolute; top: 8%; right: -2%; width: 140px; height: 140px; opacity: 0.09; transform: rotate(25deg);" :style="{ color: currentTheme.accent }">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M30,25 C45,20 65,32 75,55 C81,70 73,85 55,82 C38,79 25,60 22,42 C20,28 25,26 30,25 Z" />
                      <path d="M30,25 C28,18 22,12 15,14" />
                      <path d="M26,29 C28,25 33,26 35,30" />
                    </svg>
                  </div>

                  <!-- Shallot/Onion: Middle-right -->
                  <div style="position: absolute; top: 45%; right: -6%; width: 150px; height: 150px; opacity: 0.08; transform: rotate(-30deg);" :style="{ color: currentTheme.accent }">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M50,10 C65,30 85,50 85,70 C85,85 70,90 50,90 C30,90 15,85 15,70 C15,50 35,30 50,10 Z" />
                      <path d="M45,90 L42,95 M50,90 L50,97 M55,90 L58,95" />
                      <path d="M50,12 C58,32 70,52 70,70" />
                      <path d="M50,12 C42,32 30,52 30,70" />
                      <path d="M50,12 C50,38 50,62 50,88" />
                    </svg>
                  </div>

                  <!-- Tomato slice: Bottom-left -->
                  <div style="position: absolute; bottom: 6%; left: -4%; width: 150px; height: 150px; opacity: 0.09; transform: rotate(40deg);" :style="{ color: currentTheme.accent }">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="50" cy="50" r="45" />
                      <path d="M35,35 C38,25 62,25 65,35 C68,45 68,55 65,65 C62,75 38,75 35,65 C32,55 32,45 35,35 Z" stroke-dasharray="3 3" />
                      <circle cx="42" cy="40" r="3" fill="currentColor" />
                      <circle cx="58" cy="40" r="3" fill="currentColor" />
                      <circle cx="42" cy="60" r="3" fill="currentColor" />
                      <circle cx="58" cy="60" r="3" fill="currentColor" />
                    </svg>
                  </div>

                  <!-- Garlic: Bottom-right -->
                  <div style="position: absolute; bottom: 4%; right: -2%; width: 130px; height: 130px; opacity: 0.09; transform: rotate(-10deg);" :style="{ color: currentTheme.accent }">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M50,15 C65,32 78,50 78,72 C78,84 66,90 50,90 C34,90 22,84 22,72 C22,50 35,32 50,15 Z" />
                      <path d="M50,15 C58,35 63,55 63,75" />
                      <path d="M50,15 C42,35 37,55 37,75" />
                    </svg>
                  </div>
                </div>

                <!-- HEADER: ชื่อเมนูเท่านั้น ไม่มี badge/subtitle -->
                <div style="text-align: center; position: relative; z-index: 10;" :style="{ marginBottom: currentDensity.headerMargin }">
                  <div
                    style="font-weight: 900; line-height: 1;"
                    :style="{ color: currentTheme.accent, fontSize: `calc(${currentDensity.titleSize}px * var(--menu-font-scale))` }"
                  >
                    เมนูยำ
                  </div>
                  <!-- decorative underline -->
                  <div
                    style="margin: 8px auto 0; height: 3px; width: 80px; border-radius: 2px;"
                    :style="{ background: `linear-gradient(90deg, transparent, ${currentTheme.accent}, transparent)` }"
                  />
                </div>

                <!-- TWO COLUMN GRID -->
                <div
                  style="display: grid; grid-template-columns: 1fr 1fr; align-items: start; position: relative; z-index: 10;"
                  :style="{ gap: currentDensity.gridGap }"
                >
                  <div
                    v-for="group in filteredGroups"
                    :key="group.categoryId"
                    style="break-inside: avoid;"
                    :style="{ marginBottom: currentDensity.catMargin }"
                  >
                    <!-- Category Pill -->
                    <div
                      style="
                        display: flex; align-items: center; justify-content: center;
                        border-radius: 100px;
                      "
                      :style="{
                        background: currentTheme.accent,
                        padding: currentDensity.catPadding,
                        marginBottom: currentDensity.catBottomMargin
                      }"
                    >
                      <span
                        style="font-weight: 900; color: #fff; letter-spacing: 0.5px; font-style: italic; display: flex; align-items: center; gap: 6px;"
                        :style="{ fontSize: `calc(${currentDensity.catSize}px * var(--menu-font-scale))` }"
                      >
                        <!-- Dynamic White SVGs -->
                        <span style="display: inline-flex; align-items: center;" :style="{ width: `calc(${currentDensity.catSize * 1.1}px * var(--menu-font-scale))`, height: `calc(${currentDensity.catSize * 1.1}px * var(--menu-font-scale))` }">
                          <svg v-if="getCategoryIconKey(group.categoryName) === 'noodle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M3 12h18" />
                            <path d="M3 12a9 9 0 0 0 18 0" />
                            <path d="M8 22V12" />
                            <path d="M12 22V12" />
                            <path d="M16 22V12" />
                            <path d="M6 3l4 6" />
                            <path d="M10 3l4 6" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'mama'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M3 12h18" />
                            <path d="M3 12a9 9 0 0 0 18 0" />
                            <path d="M8 22V12" />
                            <path d="M12 22V12" />
                            <path d="M16 22V12" />
                            <path d="M4 6c1-1.5 2-1.5 3 0s2 1.5 3 0 2-1.5 3 0 2 1.5 3 0" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'glass-noodle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 12a4 4 0 0 1 8 0" />
                            <path d="M6 12a6 6 0 0 1 12 0" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'meatball'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <line x1="12" y1="2" x2="12" y2="22" />
                            <circle cx="12" cy="7" r="3.5" />
                            <circle cx="12" cy="14" r="3.5" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'kanomjeen'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M3 19h18a2 2 0 0 0 2-2H1a2 2 0 0 0 2 2z" />
                            <path d="M6 12c1-2 2-3 4-3s3 1 4 3 2 3 4 3" />
                            <path d="M8 10c1-2 2-2.5 4-2.5s3 .5 4 2.5" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'seafood'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <!-- Curved back of the shrimp -->
                            <path d="M12 3C7 3 3 7 3 12c0 3 1.5 5.5 4 7" />
                            <!-- Head / rostrum -->
                            <path d="M12 3c3 0 6 2 7 5s-1 5-4 5" />
                            <path d="M19 8c2.5-1.5 3.5-3 3.5-3" />
                            <path d="M19 6c2-1 3.5-2 3.5-2" />
                            <!-- Leg segments -->
                            <path d="M6 15c.5 1.5 1.5 2 2.5 2" />
                            <path d="M9 14c.5 1.5 1.5 2 2.5 2" />
                            <!-- Tail fin -->
                            <path d="M4 17l-2 3.5 3-1.5L7 20z" />
                            <!-- Eye -->
                            <circle cx="15.5" cy="6.5" r="0.8" fill="currentColor" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'addon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'drink'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M6 8h12l-1.5 12h-9z" />
                            <path d="M9 3l3 5" />
                            <line x1="5" y1="8" x2="19" y2="8" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'snack'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M5 10h14l-1 11H6z" />
                            <path d="M8 10V4M12 10V3M16 10V5" />
                          </svg>
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'chili'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M12 2c-.5 2-1.5 3.5-3.5 4.5A8.5 8.5 0 0 0 12 22c4.7 0 8.5-3.8 8.5-8.5C20.5 8 16 3 12 2z" />
                            <path d="M12 2c-.5-1-1.5-1.5-2.5-1" />
                          </svg>
                          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <path d="M12 2v20M6 2v10a6 6 0 0 0 12 0V2" />
                          </svg>
                        </span>
                        <!-- ชื่อหมวดหมู่ -->
                        <span>{{ group.categoryName }}</span>
                      </span>
                    </div>

                    <!-- Product List -->
                    <div style="padding: 0 4px;">
                      <div
                        v-for="product in group.products"
                        :key="product.id"
                        style="
                          display: flex;
                          align-items: baseline;
                          justify-content: space-between;
                          border-bottom: 1px dotted #ddd;
                        "
                        :style="{ padding: currentDensity.prodPadding }"
                      >
                        <!-- ชื่อสินค้า + วงเล็บรายละเอียด (ถ้ามี) -->
                        <span
                          style="color: #222; font-weight: 500; padding-right: 8px; flex: 1; line-height: 1.3;"
                          :style="{ fontSize: `calc(${currentDensity.prodNameSize}px * var(--menu-font-scale))` }"
                        >
                          <span
                            v-if="showBestsellerStars && bestsellerRankMap.has(product.id!)"
                            :style="{
                              color: '#F59E0B',
                              opacity: starOpacity(bestsellerRankMap.get(product.id!)!),
                              fontSize: `calc(${currentDensity.prodNameSize * 0.95}px * var(--menu-font-scale))`,
                              marginRight: '3px',
                              display: 'inline-block',
                              lineHeight: '1',
                            }"
                          >★</span>{{ product.name }}
                          <span
                            v-if="product.description"
                            style="color: #666; font-weight: normal; margin-left: 4px;"
                            :style="{ fontSize: `calc(${currentDensity.prodNameSize * 0.85}px * var(--menu-font-scale))` }"
                          >
                            ({{ product.description }})
                          </span>
                        </span>
                        <span
                          v-if="showPrice"
                          style="font-weight: 800; white-space: nowrap; flex-shrink: 0;"
                          :style="{ color: currentTheme.priceColor, fontSize: `calc(${currentDensity.prodPriceSize}px * var(--menu-font-scale))` }"
                        >
                          {{ product.salePrice.toLocaleString() }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- FOOTER -->
                <div style="text-align: center; position: relative; z-index: 10;" :style="{ marginTop: currentDensity.footerMargin }">
                  <div style="height: 1px; background: linear-gradient(90deg, transparent, #ccc, transparent);" :style="{ marginBottom: currentDensity.footerLineMargin }"></div>
                  <div style="color: #bbb; letter-spacing: 1px;" :style="{ fontSize: `calc(${currentDensity.footerTextSize}px * var(--menu-font-scale))` }">— ขอบคุณที่อุดหนุน —</div>
                  <div style="color: #ccc; margin-top: 2px;" :style="{ fontSize: `calc(${currentDensity.footerSubTextSize}px * var(--menu-font-scale))` }">
                    ราคาอาจมีการเปลี่ยนแปลงโดยไม่ต้องแจ้งล่วงหน้า &nbsp;·&nbsp; พิมพ์เมื่อ {{ printDate }}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import html2canvas from 'html2canvas'
import type { Product, Category } from '~/types'

const props = defineProps<{
  isOpen: boolean
  products: Product[]
  categories: Category[]
}>()

defineEmits(['close'])

// --- ขนาดตัวหนังสือแบบ Manual Scale (%) ---
const fontSizeScale = ref(100)
function decreaseFontSize() {
  if (fontSizeScale.value > 50) fontSizeScale.value -= 5
}
function increaseFontSize() {
  if (fontSizeScale.value < 200) fontSizeScale.value += 5
}

// --- Density / Space Spacing Configs ---
// ปรับค่าขนาดฟอนต์เริ่มต้น (Base font size) ให้มีขนาดใหญ่ขึ้นตามคำขอของผู้ใช้
const densities = [
  {
    id: 'normal',
    label: 'ระยะปกติ (กว้าง)',
    a4Padding: '32px 40px 40px',
    headerMargin: '24px',
    titleSize: 52,
    gridGap: '20px 28px',
    catMargin: '12px',
    catPadding: '8px 16px',
    catBottomMargin: '10px',
    catSize: 18,
    prodPadding: '5px 0',
    prodNameSize: 15,
    prodPriceSize: 16,
    footerMargin: '28px',
    footerLineMargin: '12px',
    footerTextSize: 12,
    footerSubTextSize: 10
  },
  {
    id: 'compact',
    label: 'กระชับพอดี',
    a4Padding: '20px 32px 32px',
    headerMargin: '16px',
    titleSize: 44,
    gridGap: '12px 20px',
    catMargin: '8px',
    catPadding: '6px 14px',
    catBottomMargin: '8px',
    catSize: 15.5,
    prodPadding: '3px 0',
    prodNameSize: 13.5,
    prodPriceSize: 14,
    footerMargin: '18px',
    footerLineMargin: '8px',
    footerTextSize: 11,
    footerSubTextSize: 9
  },
  {
    id: 'super',
    label: 'ประหยัดพื้นที่พิเศษ (สินค้าเยอะ)',
    a4Padding: '12px 24px 24px',
    headerMargin: '10px',
    titleSize: 36,
    gridGap: '8px 16px',
    catMargin: '4px',
    catPadding: '4px 10px',
    catBottomMargin: '4px',
    catSize: 13,
    prodPadding: '1.8px 0',
    prodNameSize: 11.5,
    prodPriceSize: 11.5,
    footerMargin: '10px',
    footerLineMargin: '6px',
    footerTextSize: 9.5,
    footerSubTextSize: 8
  }
]

interface DensityConfig {
  id: string
  label: string
  a4Padding: string
  headerMargin: string
  titleSize: number
  gridGap: string
  catMargin: string
  catPadding: string
  catBottomMargin: string
  catSize: number
  prodPadding: string
  prodNameSize: number
  prodPriceSize: number
  footerMargin: string
  footerLineMargin: string
  footerTextSize: number
  footerSubTextSize: number
}

interface ThemeConfig {
  id: string
  label: string
  accent: string
  priceColor: string
}

const selectedDensity = ref('compact')
const currentDensity = computed<DensityConfig>(() => {
  const found = densities.find(d => d.id === selectedDensity.value)
  return found || (densities[1] as DensityConfig)
})

// --- Themes ---
const themes: ThemeConfig[] = [
  { id: 'amber',  label: 'ส้มทอง',    accent: '#E87B00', priceColor: '#c75c00' },
  { id: 'red',    label: 'แดงเผ็ด',   accent: '#c0392b', priceColor: '#a93226' },
  { id: 'green',  label: 'เขียวสด',   accent: '#27ae60', priceColor: '#1e8449' },
  { id: 'indigo', label: 'น้ำเงิน',   accent: '#2c3e99', priceColor: '#2133a0' },
]
const selectedTheme = ref('amber')
const currentTheme = computed<ThemeConfig>(() => {
  const found = themes.find(t => t.id === selectedTheme.value)
  return found || (themes[0] as ThemeConfig)
})

// --- Options ---
const showPrice = ref(true)
const showBestsellerStars = ref(true)

// --- Top 5 ขายดี: Map<productId, rank 1-5> ---
const bestsellerRankMap = computed(() => {
  if (!showBestsellerStars.value) return new Map<number, number>()
  const all = filteredGroups.value.flatMap(g => g.products)
  const sorted = [...all]
    .filter(p => (p.totalSold ?? 0) > 0)
    .sort((a, b) => (b.totalSold ?? 0) - (a.totalSold ?? 0))
    .slice(0, 7)
  const map = new Map<number, number>()
  sorted.forEach((p, i) => map.set(p.id!, i + 1))
  return map
})

function starOpacity(_rank: number) {
  return 1
}

// --- วันที่ ---
const printDate = computed(() =>
  new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
)

// --- ค้นหาไอคอนหมวดหมู่โดยอัตโนมัติจากชื่อ (ส่งคืนเป็น Key สำหรับ SVG สีขาว) ---
function getCategoryIconKey(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('วุ้นเส้น')) return 'noodle'
  if (lower.includes('มาม่า')) return 'mama'
  if (lower.includes('เส้นแก้ว')) return 'glass-noodle'
  if (lower.includes('เส้นบุก') || lower.includes('เส้น')) return 'noodle'
  if (lower.includes('ลูกชิ้น')) return 'meatball'
  if (lower.includes('ขนมจีน')) return 'kanomjeen'
  if (lower.includes('ทะเล') || lower.includes('กุ้ง') || lower.includes('หอย') || lower.includes('ปู') || lower.includes('ปลา')) return 'seafood'
  if (lower.includes('addon') || lower.includes('add on') || lower.includes('เพิ่มเติม') || lower.includes('พิเศษ') || lower.includes('เครื่องเคียง')) return 'addon'
  if (lower.includes('เครื่องดื่ม') || lower.includes('น้ำ')) return 'drink'
  if (lower.includes('ของทอด') || lower.includes('ทานเล่น') || lower.includes('กินเล่น')) return 'snack'
  if (lower.includes('ยำ')) return 'chili'
  return 'generic'
}

// --- จัดกลุ่มสินค้าทั้งหมด: Active + ราคา > 0 ---
const allGroups = computed(() => {
  const validProducts = props.products.filter(
    p => p.isActive && !p.isDeleted && p.salePrice > 0
  )
  const categoryMap = new Map(props.categories.map(c => [c.id, c]))

  const groups: Record<number, {
    categoryId: number
    categoryName: string
    color: string
    sortOrder: number
    products: Product[]
  }> = {}

  for (const product of validProducts) {
    const catId = product.categoryId
    const cat = categoryMap.get(catId)
    if (!groups[catId]) {
      groups[catId] = {
        categoryId: catId,
        categoryName: cat?.name ?? 'ไม่มีหมวดหมู่',
        color: cat?.color ?? '#E87B00',
        sortOrder: cat?.sortOrder ?? 99,
        products: [],
      }
    }
    groups[catId].products.push(product)
  }

  // เรียงสินค้าในแต่ละหมวดหมู่จากราคาน้อยไปมาก
  for (const group of Object.values(groups)) {
    group.products.sort((a, b) => a.salePrice - b.salePrice)
  }

  return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder)
})

// --- Category Selection ---
const selectedCategoryIds = ref<number[]>([])

// sync ให้ selectedCategoryIds ครบเมื่อ allGroups อัปเดต
watch(
  allGroups,
  (groups) => {
    const current = new Set(selectedCategoryIds.value)
    for (const g of groups) {
      if (!current.has(g.categoryId)) {
        selectedCategoryIds.value.push(g.categoryId)
      }
    }
  },
  { immediate: true }
)

function toggleCategory(catId: number) {
  const idx = selectedCategoryIds.value.indexOf(catId)
  if (idx >= 0) selectedCategoryIds.value.splice(idx, 1)
  else selectedCategoryIds.value.push(catId)
}

const isAllCatsSelected = computed(
  () => allGroups.value.length > 0 && allGroups.value.every(g => selectedCategoryIds.value.includes(g.categoryId))
)

function toggleSelectAll() {
  if (isAllCatsSelected.value) {
    selectedCategoryIds.value = []
  } else {
    selectedCategoryIds.value = allGroups.value.map(g => g.categoryId)
  }
}

// --- กลุ่มที่จะแสดงใน Preview/Print ---
const filteredGroups = computed(() =>
  allGroups.value.filter(g => selectedCategoryIds.value.includes(g.categoryId))
)

const totalPrintProducts = computed(() =>
  filteredGroups.value.reduce((sum, g) => sum + g.products.length, 0)
)

// --- Print / Save Image ---
const printArea = ref<HTMLElement | null>(null)
const isSavingImage = ref(false)

async function handleSaveImage() {
  if (!printArea.value) return

  // โหลดฟอนต์ไทยก่อนถ่ายรูป
  if (!document.getElementById('print-thai-font')) {
    const link = document.createElement('link')
    link.id = 'print-thai-font'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&display=swap'
    document.head.appendChild(link)
    await document.fonts.ready
  }

  isSavingImage.value = true
  try {
    const canvas = await html2canvas(printArea.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
    const link = document.createElement('a')
    const date = new Date().toLocaleDateString('th-TH').replace(/\//g, '-')
    link.download = `เมนูยำ_${date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('บันทึกรูปไม่สำเร็จ:', e)
  } finally {
    isSavingImage.value = false
  }
}

function handlePrint() {
  if (!document.getElementById('print-thai-font')) {
    const link = document.createElement('link')
    link.id = 'print-thai-font'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&display=swap'
    document.head.appendChild(link)
  }

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:0;'
  document.body.appendChild(iframe)

  const content = printArea.value?.innerHTML ?? ''
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

  if (iframeDoc) {
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>เมนูยำ</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          html, body { width:210mm; background:#ffffff; font-family:'Sarabun','Noto Sans Thai',sans-serif; }
          body {
            --menu-font-scale: ${fontSizeScale.value / 100};
            padding: ${currentDensity.value.a4Padding};
          }
          @page { size: A4 portrait; margin: 0; }
          @media print {
            html, body { width:210mm; }
            * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1500)
    }, 900)
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
