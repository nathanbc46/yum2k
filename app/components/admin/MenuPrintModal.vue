<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        :class="isFullscreen ? 'fixed inset-0 z-50 flex bg-black/70' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4'"
        @click.self="$emit('close')"
      >
        <div
          :class="isFullscreen
            ? 'bg-surface-900 w-screen h-screen flex flex-col overflow-hidden'
            : 'bg-surface-900 border border-surface-700 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden'"
        >

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
                  @click="isFullscreen = !isFullscreen"
                  class="w-8 h-8 rounded-xl bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors"
                  :title="isFullscreen ? 'ย่อลง' : 'เต็มหน้าจอ'"
                >
                  <span class="text-sm font-bold">{{ isFullscreen ? '⊟' : '⊞' }}</span>
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
              <!-- ชื่อเมนู -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">ชื่อเมนู</label>
                <input
                  v-model="menuTitle"
                  type="text"
                  placeholder="ชื่อเมนู"
                  class="bg-surface-900 border border-surface-700 text-surface-100 text-xs rounded-md px-1.5 py-0.5 outline-none focus:border-amber-500 w-32"
                />
              </div>

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

              <!-- Watermark Opacity -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">Watermark</label>
                <div class="flex items-center gap-1">
                  <button @click="wmOpacity = Math.max(0, wmOpacity - 5)" class="w-5 h-5 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 flex items-center justify-center font-bold text-xs transition-all">-</button>
                  <span class="text-xs font-mono font-bold text-surface-100 w-8 text-center">{{ wmOpacity }}%</span>
                  <button @click="wmOpacity = Math.min(100, wmOpacity + 5)" class="w-5 h-5 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 flex items-center justify-center font-bold text-xs transition-all">+</button>
                </div>
              </div>

              <!-- Style Presets -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">Styles</label>
                <select
                  v-model="selectedPresetName"
                  @change="applyPreset(selectedPresetName)"
                  class="bg-surface-900 border border-surface-700 text-surface-100 text-xs rounded-md px-1.5 py-0.5 outline-none focus:border-amber-500 cursor-pointer max-w-[100px]"
                >
                  <option value="">— เลือก —</option>
                  <option v-for="p in savedPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
                </select>
                <button
                  @click="showPresetInput = !showPresetInput; if (showPresetInput) newPresetName = selectedPresetName || ''"
                  class="px-2 py-0.5 rounded text-xs font-bold transition-all bg-surface-700 text-surface-300 hover:text-white"
                  title="บันทึก Style ปัจจุบัน"
                >💾</button>
                <template v-if="showPresetInput">
                  <input
                    v-model="newPresetName"
                    type="text"
                    placeholder="ชื่อ Style"
                    @keyup.enter="savePreset"
                    class="bg-surface-900 border border-surface-700 text-surface-100 text-xs rounded-md px-1.5 py-0.5 outline-none focus:border-amber-500 w-24"
                  />
                  <button
                    @click="savePreset"
                    :disabled="!newPresetName.trim()"
                    class="px-2 py-0.5 rounded text-xs font-bold transition-all bg-amber-500 text-black disabled:opacity-40"
                  >ตกลง</button>
                </template>
                <button
                  v-if="selectedPresetName && !showPresetInput"
                  @click="deletePreset"
                  class="px-2 py-0.5 rounded text-xs font-bold transition-all bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20"
                  title="ลบ Style นี้"
                >✕</button>
              </div>

              <!-- แปลภาษาอัตโนมัติ -->
              <button
                @click="translateMenuNames"
                :disabled="isTranslating || selectedCategoryIds.length === 0"
                class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-300 hover:text-surface-100 hover:border-surface-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span v-if="isTranslating" class="w-3 h-3 border-2 border-surface-400/30 border-t-surface-300 rounded-full animate-spin shrink-0"></span>
                <span>{{ isTranslating ? 'กำลังแปล...' : '🌐 แปลภาษาอัตโนมัติ' }}</span>
              </button>

              <!-- Toggle: ชื่อภาษาอื่น -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5" :class="altNames.size === 0 ? 'opacity-40' : ''">
                <label class="text-xs text-surface-400 whitespace-nowrap">EN/MY</label>
                <button @click="showAltNames = !showAltNames" :disabled="altNames.size === 0" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed" :class="showAltNames ? 'bg-amber-500' : 'bg-surface-600'">
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm" :class="showAltNames ? 'translate-x-4' : 'translate-x-1'" />
                </button>
              </div>

              <!-- หมวดหมู่: สีพื้น สีขอบ สีอักษร ขนาด -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">หมวดหมู่</label>
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-1">
                    <span class="text-[10px] text-surface-500">พื้น</span>
                    <button
                      @click="catBgTransparent = !catBgTransparent"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all border"
                      :class="catBgTransparent ? 'bg-surface-600 border-surface-500 text-surface-200' : 'bg-surface-700 border-surface-600 text-surface-400 hover:text-surface-200'"
                      title="โปร่งใส"
                    >∅</button>
                    <input v-if="!catBgTransparent" type="color" v-model="catBgColor" class="w-6 h-5 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-[10px] text-surface-500">ขอบ</span>
                    <button
                      @click="showCatBorder = !showCatBorder"
                      class="w-4 h-4 rounded border transition-colors"
                      :class="showCatBorder ? 'bg-amber-500 border-amber-400' : 'bg-surface-700 border-surface-600'"
                    />
                    <input v-if="showCatBorder" type="color" v-model="catBorderColor" class="w-6 h-5 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-[10px] text-surface-500">ข้อ</span>
                    <input type="color" v-model="catTextColor" class="w-6 h-5 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div class="flex items-center gap-1">
                    <button @click="catFontSizePx = Math.max(8, catFontSizePx - 1)" class="w-4 h-4 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 text-xs flex items-center justify-center transition-all">−</button>
                    <span class="text-[10px] font-mono text-surface-100 w-6 text-center">{{ catFontSizePx }}</span>
                    <button @click="catFontSizePx = Math.min(40, catFontSizePx + 1)" class="w-4 h-4 rounded bg-surface-700 hover:bg-surface-600 active:scale-90 text-surface-200 text-xs flex items-center justify-center transition-all">+</button>
                  </div>
                </div>
              </div>

              <!-- ขนาดกระดาษ -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">กระดาษ</label>
                <div class="flex gap-1">
                  <button
                    v-for="s in ['a4', 'a2']"
                    :key="s"
                    @click="selectedPaperSize = s as 'a4' | 'a2'"
                    class="px-2 py-0.5 rounded text-xs font-bold transition-all"
                    :class="selectedPaperSize === s ? 'bg-amber-500 text-black' : 'bg-surface-700 text-surface-300 hover:text-white'"
                  >{{ s.toUpperCase() }}</button>
                </div>
              </div>

              <!-- แนวปริ้น -->
              <div class="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5">
                <label class="text-xs text-surface-400 whitespace-nowrap">แนว</label>
                <div class="flex gap-1">
                  <button
                    @click="selectedOrientation = 'portrait'"
                    title="Portrait (แนวตั้ง)"
                    class="w-6 h-6 rounded text-xs transition-all flex items-center justify-center font-bold"
                    :class="selectedOrientation === 'portrait' ? 'bg-amber-500 text-black' : 'bg-surface-700 text-surface-300 hover:text-white'"
                  >↕</button>
                  <button
                    @click="selectedOrientation = 'landscape'"
                    title="Landscape (แนวนอน)"
                    class="w-6 h-6 rounded text-xs transition-all flex items-center justify-center font-bold"
                    :class="selectedOrientation === 'landscape' ? 'bg-amber-500 text-black' : 'bg-surface-700 text-surface-300 hover:text-white'"
                  >↔</button>
                </div>
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

              <draggable
                v-model="orderedGroupIds"
                :item-key="(id: number) => id"
                handle=".cat-drag-handle"
                class="flex-1 py-2 flex flex-col"
                :animation="150"
                tag="div"
              >
                <template #item="{ element: catId }">
                  <label
                    class="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-surface-800/60 transition-colors"
                  >
                    <span class="cat-drag-handle cursor-grab active:cursor-grabbing text-surface-600 hover:text-surface-400 transition-colors shrink-0">⠿</span>
                    <input
                      type="checkbox"
                      :checked="selectedCategoryIds.includes(catId)"
                      @change="toggleCategory(catId)"
                      class="w-4 h-4 rounded accent-amber-500 shrink-0 cursor-pointer"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-semibold text-surface-200 truncate">{{ allGroups.find(g => g.categoryId === catId)?.categoryName }}</div>
                      <div class="text-[10px] text-surface-500">{{ allGroups.find(g => g.categoryId === catId)?.products.length ?? 0 }} รายการ</div>
                    </div>
                    <div
                      class="w-2 h-2 rounded-full shrink-0"
                      :style="{ background: allGroups.find(g => g.categoryId === catId)?.color ?? '#888' }"
                    />
                  </label>
                </template>
              </draggable>

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
                  font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
                  box-sizing: border-box;
                  position: relative;
                  overflow: hidden;
                "
                :style="{
                  width: paperConfig.widthPx + 'px',
                  minHeight: paperConfig.heightPx + 'px',
                  background: currentTheme.bgColor,
                  padding: currentDensity.a4Padding,
                  '--menu-font-scale': fontSizeScale / 100,
                  '--wm-scale': paperConfig.widthPx / 794,
                  '--wm-opacity': wmOpacity / 100
                }"
              >
                <!-- Watermarks (Spicy Salad Elements) -->
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; z-index: 0;">
                  <!-- Lime slice: Top-left -->
                  <div style="position: absolute; top: 2%; left: 1%; width: calc(160px * var(--wm-scale)); height: calc(160px * var(--wm-scale)); opacity: var(--wm-opacity); transform: rotate(-15deg);" :style="{ color: currentTheme.accent }">
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
                  <div style="position: absolute; top: 4%; right: 1%; width: calc(140px * var(--wm-scale)); height: calc(140px * var(--wm-scale)); opacity: var(--wm-opacity); transform: rotate(25deg);" :style="{ color: currentTheme.accent }">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M30,25 C45,20 65,32 75,55 C81,70 73,85 55,82 C38,79 25,60 22,42 C20,28 25,26 30,25 Z" />
                      <path d="M30,25 C28,18 22,12 15,14" />
                      <path d="M26,29 C28,25 33,26 35,30" />
                    </svg>
                  </div>

                  <!-- Shallot/Onion: Middle-right -->
                  <div style="position: absolute; top: 42%; right: 1%; width: calc(150px * var(--wm-scale)); height: calc(150px * var(--wm-scale)); opacity: var(--wm-opacity); transform: rotate(-30deg);" :style="{ color: currentTheme.accent }">
                    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M50,10 C65,30 85,50 85,70 C85,85 70,90 50,90 C30,90 15,85 15,70 C15,50 35,30 50,10 Z" />
                      <path d="M45,90 L42,95 M50,90 L50,97 M55,90 L58,95" />
                      <path d="M50,12 C58,32 70,52 70,70" />
                      <path d="M50,12 C42,32 30,52 30,70" />
                      <path d="M50,12 C50,38 50,62 50,88" />
                    </svg>
                  </div>

                  <!-- Tomato slice: Bottom-left -->
                  <div style="position: absolute; bottom: 3%; left: 1%; width: calc(150px * var(--wm-scale)); height: calc(150px * var(--wm-scale)); opacity: var(--wm-opacity); transform: rotate(40deg);" :style="{ color: currentTheme.accent }">
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
                  <div style="position: absolute; bottom: 2%; right: 1%; width: calc(130px * var(--wm-scale)); height: calc(130px * var(--wm-scale)); opacity: var(--wm-opacity); transform: rotate(-10deg);" :style="{ color: currentTheme.accent }">
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
                    {{ menuTitle }}
                  </div>
                  <!-- decorative underline -->
                  <div
                    style="margin: 8px auto 0; height: 3px; width: 80px; border-radius: 2px;"
                    :style="{ background: `linear-gradient(90deg, transparent, ${currentTheme.accent}, transparent)` }"
                  />
                </div>

                <!-- GRID -->
                <div
                  style="display: grid; align-items: start; position: relative; z-index: 10;"
                  :style="{ gap: paperGridGap, gridTemplateColumns: `repeat(${paperConfig.cols}, 1fr)` }"
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
                        background: catBgTransparent ? 'transparent' : catBgColor,
                        border: showCatBorder ? `2.5px solid ${catBorderColor}` : 'none',
                        padding: currentDensity.catPadding,
                        marginBottom: currentDensity.catBottomMargin
                      }"
                    >
                      <span
                        style="font-weight: 900; letter-spacing: 0.5px; font-style: italic; display: flex; align-items: center; gap: 6px;"
                        :style="{ color: catTextColor, fontSize: `calc(${catFontSizePx}px * var(--menu-font-scale))` }"
                      >
                        <!-- Dynamic SVGs -->
                        <span style="display: inline-flex; align-items: center;" :style="{ width: `calc(${catFontSizePx * 1.1}px * var(--menu-font-scale))`, height: `calc(${catFontSizePx * 1.1}px * var(--menu-font-scale))` }">
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
                          <svg v-else-if="getCategoryIconKey(group.categoryName) === 'salmon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <!-- ลำตัวปลา -->
                            <path d="M22 12c-2-3.5-5.5-6-10-6S3.5 8.5 2 12c1.5 3.5 5 6 10 6s8-2.5 10-6z" />
                            <!-- หาง -->
                            <path d="M2 12L-1 8M2 12L-1 16" />
                            <!-- ครีบหลัง -->
                            <path d="M11 6c1-2.5 3.5-3 5-2" />
                            <!-- ตา -->
                            <circle cx="17" cy="10.5" r="1" fill="currentColor" stroke="none" />
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
                        "
                        :style="{ padding: currentDensity.prodPadding, borderBottom: `1px dotted ${currentTheme.separatorColor}` }"
                      >
                        <!-- ชื่อสินค้า + วงเล็บรายละเอียด (ถ้ามี) -->
                        <span
                          style="font-weight: 500; padding-right: 8px; flex: 1; line-height: 1.3;"
                          :style="{ color: currentTheme.textColor, fontSize: `calc(${currentDensity.prodNameSize}px * var(--menu-font-scale))` }"
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
                            style="font-weight: normal; margin-left: 4px;"
                            :style="{ color: currentTheme.subTextColor, fontSize: `calc(${currentDensity.prodNameSize * 0.85}px * var(--menu-font-scale))` }"
                          >
                            ({{ product.description }})
                          </span>
                          <span
                            v-if="showAltNames && altNames.get(product.name)"
                            style="display: block; font-style: italic; font-weight: 400; line-height: 1.3; margin-top: 1px;"
                            :style="{ color: currentTheme.altTextColor, fontSize: `calc(${currentDensity.prodNameSize * 0.72}px * var(--menu-font-scale))` }"
                          >
                            {{ altNames.get(product.name)?.en }}<span v-if="altNames.get(product.name)?.en && altNames.get(product.name)?.my" style="margin: 0 3px; opacity: 0.5;">·</span>{{ altNames.get(product.name)?.my }}
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

              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import html2canvas from 'html2canvas'
import type { Product, Category } from '~/types'
import { useSettings } from '~/composables/useSettings'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  isOpen: boolean
  products: Product[]
  categories: Category[]
}>()

defineEmits(['close'])

const toast = useToast()

// --- Style Presets ---
interface StylePreset {
  name: string
  savedAt: string
  settings: {
    menuTitle: string
    fontSizeScale: number
    selectedDensity: string
    selectedTheme: string
    wmOpacity: number
    catBgColor: string
    catBgTransparent: boolean
    catBorderColor: string
    showCatBorder: boolean
    catTextColor: string
    catFontSizePx: number
    selectedPaperSize: 'a4' | 'a2'
    selectedOrientation: 'portrait' | 'landscape'
    showPrice: boolean
    showBestsellerStars: boolean
    categoryOrder: number[]
  }
}
const PRESET_KEY = 'menu-print-style-presets'
const savedPresets       = ref<StylePreset[]>([])
const selectedPresetName = ref('')
const newPresetName      = ref('')
const showPresetInput    = ref(false)

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESET_KEY)
    savedPresets.value = raw ? JSON.parse(raw) : []
  } catch {
    savedPresets.value = []
  }
}

function savePreset() {
  if (!newPresetName.value.trim()) return
  const preset: StylePreset = {
    name: newPresetName.value.trim(),
    savedAt: new Date().toISOString(),
    settings: {
      menuTitle: menuTitle.value,
      fontSizeScale: fontSizeScale.value,
      selectedDensity: selectedDensity.value,
      selectedTheme: selectedTheme.value,
      wmOpacity: wmOpacity.value,
      catBgColor: catBgColor.value,
      catBgTransparent: catBgTransparent.value,
      catBorderColor: catBorderColor.value,
      showCatBorder: showCatBorder.value,
      catTextColor: catTextColor.value,
      catFontSizePx: catFontSizePx.value,
      selectedPaperSize: selectedPaperSize.value,
      selectedOrientation: selectedOrientation.value,
      showPrice: showPrice.value,
      showBestsellerStars: showBestsellerStars.value,
      categoryOrder: [...orderedGroupIds.value],
    }
  }
  const idx = savedPresets.value.findIndex(p => p.name === preset.name)
  if (idx >= 0) savedPresets.value[idx] = preset
  else savedPresets.value.push(preset)
  localStorage.setItem(PRESET_KEY, JSON.stringify(savedPresets.value))
  selectedPresetName.value = preset.name
  newPresetName.value = ''
  showPresetInput.value = false
  toast.success(`บันทึก Style "${preset.name}" สำเร็จ`)
}

async function applyPreset(name: string) {
  const preset = savedPresets.value.find(p => p.name === name)
  if (!preset) return
  const s = preset.settings
  skipThemeWatch.value = true
  menuTitle.value           = s.menuTitle
  fontSizeScale.value       = s.fontSizeScale
  selectedDensity.value     = s.selectedDensity
  selectedTheme.value       = s.selectedTheme
  wmOpacity.value           = s.wmOpacity
  selectedPaperSize.value   = s.selectedPaperSize
  selectedOrientation.value = s.selectedOrientation
  showPrice.value           = s.showPrice
  showBestsellerStars.value = s.showBestsellerStars
  await nextTick()
  // ตั้งค่าหมวดหมู่หลัง nextTick เพื่อให้ watch selectedTheme ไม่ override
  catBgColor.value       = s.catBgColor
  catBgTransparent.value = s.catBgTransparent
  catBorderColor.value   = s.catBorderColor
  showCatBorder.value    = s.showCatBorder
  catTextColor.value     = s.catTextColor
  catFontSizePx.value    = s.catFontSizePx
  if (s.categoryOrder?.length) {
    const validIds = new Set(orderedGroupIds.value)
    const saved = s.categoryOrder.filter(id => validIds.has(id))
    const newIds = orderedGroupIds.value.filter(id => !saved.includes(id))
    orderedGroupIds.value = [...saved, ...newIds]
  }
  skipThemeWatch.value = false
}

function deletePreset() {
  if (!selectedPresetName.value) return
  const name = selectedPresetName.value
  savedPresets.value = savedPresets.value.filter(p => p.name !== name)
  localStorage.setItem(PRESET_KEY, JSON.stringify(savedPresets.value))
  selectedPresetName.value = ''
  toast.success(`ลบ Style "${name}" สำเร็จ`)
}

loadPresets()

// --- ชื่อเมนู ---
const menuTitle = ref('เมนูยำ')

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
    titleSize: 36,
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
    titleSize: 30,
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
    titleSize: 24,
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
  bgColor: string
  textColor: string
  subTextColor: string
  altTextColor: string
  separatorColor: string
  catOutlined: boolean
}

const selectedDensity = ref('compact')
const currentDensity = computed<DensityConfig>(() => {
  const found = densities.find(d => d.id === selectedDensity.value)
  return found || (densities[1] as DensityConfig)
})

// --- Themes ---
const themes: ThemeConfig[] = [
  { id: 'amber',      label: 'ส้มทอง',    accent: '#E87B00', priceColor: '#c75c00', bgColor: '#ffffff', textColor: '#222222', subTextColor: '#666666', altTextColor: '#555555', separatorColor: '#dddddd', catOutlined: false },
  { id: 'red',        label: 'แดงเผ็ด',   accent: '#c0392b', priceColor: '#a93226', bgColor: '#ffffff', textColor: '#222222', subTextColor: '#666666', altTextColor: '#555555', separatorColor: '#dddddd', catOutlined: false },
  { id: 'green',      label: 'เขียวสด',   accent: '#27ae60', priceColor: '#1e8449', bgColor: '#ffffff', textColor: '#222222', subTextColor: '#666666', altTextColor: '#555555', separatorColor: '#dddddd', catOutlined: false },
  { id: 'indigo',     label: 'น้ำเงิน',   accent: '#2c3e99', priceColor: '#2133a0', bgColor: '#ffffff', textColor: '#222222', subTextColor: '#666666', altTextColor: '#555555', separatorColor: '#dddddd', catOutlined: false },
  { id: 'black',      label: 'ขาวดำ',     accent: '#1a1a1a', priceColor: '#444444', bgColor: '#ffffff', textColor: '#222222', subTextColor: '#666666', altTextColor: '#555555', separatorColor: '#dddddd', catOutlined: false },
  { id: 'dark-black', label: 'พื้นดำ',    accent: '#ffffff', priceColor: '#e0e0e0', bgColor: '#111111', textColor: '#f0f0f0', subTextColor: '#aaaaaa', altTextColor: '#888888', separatorColor: '#444444', catOutlined: true  },
  { id: 'dark-gray',  label: 'พื้นเทา',   accent: '#ffffff', priceColor: '#e0e0e0', bgColor: '#2d2d2d', textColor: '#f0f0f0', subTextColor: '#b0b0b0', altTextColor: '#909090', separatorColor: '#555555', catOutlined: true  },
]
const selectedTheme = ref('amber')
const currentTheme = computed<ThemeConfig>(() => {
  const found = themes.find(t => t.id === selectedTheme.value)
  return found || (themes[0] as ThemeConfig)
})

// column gap เพิ่มสำหรับ A2
const paperGridGap = computed(() => {
  const parts = currentDensity.value.gridGap.split(' ')
  const rowGap = parts[0]
  const colGap = parts.length > 1 ? parts[1] : parts[0]
  const colPx = parseInt(colGap) + (selectedPaperSize.value === 'a2' ? 48 : 0)
  return `${rowGap} ${colPx}px`
})

// --- ปรับแต่ง Category Pill ---
const wmOpacity         = ref(30)
const catBgColor        = ref('#E87B00')
const catBgTransparent  = ref(false)
const catBorderColor    = ref('#ffffff')
const showCatBorder     = ref(false)
const catTextColor      = ref('#ffffff')
const catFontSizePx     = ref(16)

const skipThemeWatch = ref(false)

watch(selectedTheme, () => {
  if (skipThemeWatch.value) return
  const t = currentTheme.value
  catBgColor.value     = t.catOutlined ? '#111111' : t.accent
  showCatBorder.value  = t.catOutlined
  catBorderColor.value = '#ffffff'
  catTextColor.value   = '#ffffff'
})

// --- ขนาดกระดาษและแนวปริ้น ---
const selectedPaperSize = ref<'a4' | 'a2'>('a4')
const selectedOrientation = ref<'portrait' | 'landscape'>('portrait')

const paperConfig = computed(() => {
  const map: Record<string, { widthPx: number; heightPx: number; widthMm: string; pageSize: string; cols: number }> = {
    'a4-portrait':  { widthPx: 794,  heightPx: 1123, widthMm: '210mm', pageSize: 'A4 portrait',  cols: 2 },
    'a4-landscape': { widthPx: 1123, heightPx: 794,  widthMm: '297mm', pageSize: 'A4 landscape', cols: 3 },
    'a2-portrait':  { widthPx: 1587, heightPx: 2245, widthMm: '420mm', pageSize: 'A2 portrait',  cols: 2 },
    'a2-landscape': { widthPx: 2245, heightPx: 1587, widthMm: '594mm', pageSize: 'A2 landscape', cols: 3 },
  }
  return map[`${selectedPaperSize.value}-${selectedOrientation.value}`]
})

// --- Options ---
const isFullscreen = ref(false)
const showPrice = ref(true)
const showBestsellerStars = ref(true)

// --- แปลภาษาอัตโนมัติ ---
const { receiptSettings, loadReceiptSettings } = useSettings()
const aiConfig = useRuntimeConfig().public
const altNames = ref<Map<string, { en: string; my: string }>>(new Map())
const isTranslating = ref(false)
const showAltNames = ref(false)

function resolveKey(saved: string | undefined, envKey: string) {
  return saved || envKey || ''
}

function safeParseTranslations(text: string): Array<{ th: string; en: string; my: string }> | null {
  try {
    const match = text.match(/\[[\s\S]*\]/)
    const parsed = JSON.parse(match ? match[0] : text)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function translateWithGemini(apiKey: string, prompt: string) {
  const model = receiptSettings.value.geminiModel || 'gemini-2.0-flash-lite'
  const modelFull = model.startsWith('models/') ? model : `models/${model}`
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelFull}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  })
  if (!res.ok) throw new Error(`Gemini error ${res.status}`)
  const data = await res.json()
  return safeParseTranslations(data.candidates[0].content.parts[0].text)
}

async function translateWithOpenRouter(apiKey: string, prompt: string) {
  const models = receiptSettings.value.openRouterModels
    ? receiptSettings.value.openRouterModels.split(',').map((m: string) => m.trim()).filter(Boolean)
    : ['inclusionai/ling-2.6-1t:free', 'z-ai/glm-4.5-air:free', 'openai/gpt-oss-120b:free']
  for (const modelId of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'X-Title': 'Yum2K POS' },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      })
      if (res.status === 429) continue
      if (!res.ok) continue
      const data = await res.json()
      const parsed = safeParseTranslations(data.choices[0].message.content)
      if (parsed) return parsed
    } catch { continue }
  }
  return null
}

async function translateWithGroq(apiKey: string, prompt: string) {
  const model = receiptSettings.value.groqModel || 'llama-3.3-70b-versatile'
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  })
  if (!res.ok) throw new Error(`Groq error ${res.status}`)
  const data = await res.json()
  return safeParseTranslations(data.choices[0].message.content)
}

async function translateMenuNames() {
  await loadReceiptSettings()
  const names = [...new Set(filteredGroups.value.flatMap(g => g.products.map(p => p.name)))]
  if (!names.length) return

  isTranslating.value = true
  altNames.value = new Map()

  try {
    const prompt = `คุณคือผู้แปลชื่อเมนูอาหารสำหรับร้านยำไทย ตอบเป็น JSON array เท่านั้น ห้ามมีข้อความอื่นนอกจาก JSON
แปลชื่ออาหารไทยต่อไปนี้เป็นภาษาอังกฤษ (en) และภาษาพม่า (my, ใช้อักษรพม่า)

คำศัพท์เฉพาะที่ต้องแปลให้ถูกต้อง (ภาษาอังกฤษ → ภาษาพม่า):
- ยำ = Spicy Thai Salad → သုပ်
- เส้นแก้ว = Glass Noodle (ห้ามแปลว่า Seaweed Noodle) → ကြာဇံ
- วุ้นเส้น = Glass Noodle / Vermicelli → ကြာဇံ
- มามา = Mama Instant Noodle → မာမာခေါက်ဆွဲ
- เส้นมันหนึบ = Chewy Starch Noodle → ကော်ခေါက်ဆွဲ
- เส้นบุก = Konjac Noodle → ဘူကျိုးခေါက်ဆွဲ
- หมูสับ = Minced Pork → ဝက်သားကြိတ်
- หมูยอ = Vietnamese Pork Sausage → ဗီယက်နမ်ဝက်သားပေါင်း
- รวมมิตร = Mixed / Combination → ရောစပ်
- รวมทะเล = Seafood Mix → ပင်လယ်စာရောစပ်
- ทะเล = Seafood → ပင်လယ်စာ
- กุ้ง = Shrimp → ပုဇွန်
- ปลาหมึก = Squid → ဗြောင်
- ปูอัด = Crab Stick → ဂဏန်းချောင်း
- ลูกชิ้น = Meatball → အသားလုံး
- ลูกชิ้นปลา = Fish Ball → ငါးလုံး
- แมงกะพรุน = Jellyfish → တောင်ကြောင်
- ไข่เยี่ยวม้า = Century Egg → ပုပ်ကြက်ဥ
- ปลาร้า = Fermented Fish Sauce → ငါးပိ
- น้ำมันงา = Sesame Oil → နှမ်းဆီ
- ธรรมดา = Plain / Regular → ရိုးရိုး
- ไม่มีเส้น = No Noodles → ခေါက်ဆွဲမပါ
- แซลมอน = Salmon → ဆော်လမွန်

รายชื่อ: ${JSON.stringify(names)}
รูปแบบที่ต้องการ: [{"th":"ชื่อไทย","en":"English Name","my":"မြန်မာနာမည်"}]`

    const geminiKey = resolveKey(receiptSettings.value.geminiApiKey, aiConfig.defaultGeminiKey as string)
    const orKey = resolveKey(receiptSettings.value.openRouterApiKey, aiConfig.defaultOpenRouterKey as string)
    const groqKey = resolveKey(receiptSettings.value.groqApiKey, aiConfig.defaultGroqKey as string)

    let result: Array<{ th: string; en: string; my: string }> | null = null

    if (geminiKey && receiptSettings.value.geminiEnabled !== false) {
      result = await translateWithGemini(geminiKey, prompt).catch(() => null)
    }
    if (!result && orKey && receiptSettings.value.openRouterEnabled !== false) {
      result = await translateWithOpenRouter(orKey, prompt)
    }
    if (!result && groqKey && receiptSettings.value.groqEnabled !== false) {
      result = await translateWithGroq(groqKey, prompt).catch(() => null)
    }

    if (result) {
      const map = new Map<string, { en: string; my: string }>()
      for (const item of result) {
        if (item.th && (item.en || item.my)) map.set(item.th, { en: item.en || '', my: item.my || '' })
      }
      altNames.value = map
      showAltNames.value = true
    } else {
      alert('ไม่สามารถแปลภาษาได้ กรุณาตรวจสอบการตั้งค่า AI ใน Settings')
    }
  } catch (e: any) {
    console.error('แปลภาษาไม่สำเร็จ:', e)
    alert('แปลภาษาไม่สำเร็จ: ' + (e?.message || 'ไม่ทราบสาเหตุ'))
  } finally {
    isTranslating.value = false
  }
}

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
  if (lower.includes('แซลมอน')) return 'salmon'
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

// --- Category Selection + Ordering ---
const selectedCategoryIds = ref<number[]>([])
const orderedGroupIds     = ref<number[]>([])

watch(
  allGroups,
  (groups) => {
    const validIds = groups.map(g => g.categoryId)
    for (const g of groups) {
      if (!orderedGroupIds.value.includes(g.categoryId)) {
        orderedGroupIds.value.push(g.categoryId)
      }
      if (!selectedCategoryIds.value.includes(g.categoryId)) {
        selectedCategoryIds.value.push(g.categoryId)
      }
    }
    orderedGroupIds.value     = orderedGroupIds.value.filter(id => validIds.includes(id))
    selectedCategoryIds.value = selectedCategoryIds.value.filter(id => validIds.includes(id))
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

// --- กลุ่มที่จะแสดงใน Preview/Print (ตามลำดับที่ผู้ใช้เรียง) ---
const filteredGroups = computed(() => {
  const groupMap = new Map(allGroups.value.map(g => [g.categoryId, g]))
  return orderedGroupIds.value
    .filter(id => selectedCategoryIds.value.includes(id))
    .map(id => groupMap.get(id)!)
    .filter(Boolean)
})

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
      backgroundColor: currentTheme.value.bgColor,
      logging: false,
    })
    const link = document.createElement('a')
    const date = new Date().toLocaleDateString('th-TH').replace(/\//g, '-')
    link.download = `${menuTitle.value}_${date}.png`
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

  const { widthPx, heightPx, widthMm, pageSize } = paperConfig.value
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${widthPx}px;height:${heightPx}px;border:0;`
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
        <title>${menuTitle.value}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          html, body { width:${widthMm}; background:${currentTheme.value.bgColor}; font-family:'Sarabun','Noto Sans Thai',sans-serif; }
          body {
            --menu-font-scale: ${fontSizeScale.value / 100};
            --wm-scale: ${paperConfig.value.widthPx / 794};
            --wm-opacity: ${wmOpacity.value / 100};
            padding: ${currentDensity.value.a4Padding};
          }
          @page { size: ${pageSize}; margin: 0; }
          @media print {
            html, body { width:${widthMm}; }
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
