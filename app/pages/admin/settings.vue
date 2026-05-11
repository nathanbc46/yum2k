<!-- =============================================================================
  pages/admin/settings.vue
  หน้าตั้งค่าร้านค้าและใบเสร็จ สำหรับ Admin
  - ตั้งค่าข้อมูลร้าน (ชื่อ, เบอร์โทร, ที่อยู่)
  - ตั้งค่าใบเสร็จ (ขนาดกระดาษ, ข้อความท้ายบิล)
  - Preview ใบเสร็จแบบ Real-time
============================================================================= -->
<template>
  <div class="flex-1 overflow-y-auto p-6">
    <div class="max-w-none mx-auto space-y-6">
      
      <!-- RawBT Status Alert (แสดงเฉพาะเมื่อเลือกใช้ RawBT และยังไม่ได้เปิดแอป) -->
      <div
        v-if="form.printerMethod === 'rawbt' && !isRawBTConnected"
        class="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top duration-500"
      >
        <div class="w-10 h-10 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center shrink-0 text-xl">
          ⚠️
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-bold text-red-400">ตรวจไม่พบแอป RawBT</h3>
          <p class="text-xs text-surface-400 mt-1 leading-relaxed">
            ระบบพิมพ์แบบไร้เสียง (Silent Printing) จะไม่ทำงานหากไม่ได้เปิดแอป RawBT ทิ้งไว้
            กรุณาติดตั้งแอปหรือเปิดแอปในเครื่องนี้เพื่อใช้งาน หากยังไม่มีสามารถดาวน์โหลดได้ที่
            <a href="https://rawbt.ru/en/windows.html" target="_blank" class="text-primary-400 underline decoration-primary-400/30">Windows</a> หรือ
            <a href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter" target="_blank" class="text-primary-400 underline decoration-primary-400/30">Android (Play Store)</a>
          </p>
          <button
            @click="checkPrinterStatus"
            class="mt-3 text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all"
          >
            🔄 ตรวจสอบการเชื่อมต่ออีกครั้ง
          </button>
        </div>
      </div>

      <!-- Page Header -->
      <div>
        <h1 class="text-2xl font-bold text-surface-50">⚙️ ตั้งค่าร้านค้า</h1>
        <p class="text-sm text-surface-400 mt-1">เลือกหมวดการตั้งค่าด้านซ้าย</p>
      </div>

      <!-- Layout: Sidebar Tabs + Content -->
      <div class="flex gap-5 items-start">

        <!-- ====== Left: Vertical Tab Nav ====== -->
        <div class="w-44 shrink-0 bg-surface-950 border border-surface-800 rounded-2xl p-2 sticky top-6">
          <nav class="flex flex-col gap-1">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              @click="activeTab = (tab.key as typeof activeTab)"
              class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-left"
              :class="activeTab === tab.key
                ? 'bg-surface-800 text-surface-50 shadow-sm'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-900'"
            >
              <span class="text-lg leading-none shrink-0">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          </nav>
        </div>

        <!-- ====== Right: Tab Content ====== -->
        <div class="flex-1 min-w-0 space-y-5">

        <!-- ====== TAB: ร้านค้า ====== -->
        <div v-show="activeTab === 'shop'" class="space-y-5">

          <!-- ส่วนข้อมูลร้าน -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">ข้อมูลร้านค้า</h2>
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <label class="form-label">ชื่อร้าน <span class="text-danger">*</span></label>
                  <input v-model="form.shopName" type="text" placeholder="เช่น Yum2K, ร้านยำรสเด็ด" class="form-input" />
                </div>
                <div>
                  <label class="form-label">รหัสเครื่อง (Device Code) <span class="text-danger">*</span></label>
                  <input v-model="form.deviceCode" type="text" placeholder="เช่น D1, TAB-01" class="form-input" />
                  <p class="text-[10px] text-surface-500 mt-1">ใช้แยกเลขบิลระหว่างเครื่อง (ห้ามซ้ำกับเครื่องอื่น)</p>
                </div>
              </div>
              <div>
                <label class="form-label">คำอธิบายร้าน (Tagline)</label>
                <input v-model="form.shopTagline" type="text" placeholder="เช่น ยำรสเด็ด อร่อยทุกคำ!" class="form-input" />
              </div>
              <div>
                <label class="form-label">เบอร์โทรศัพท์</label>
                <input v-model="form.shopPhone" type="tel" placeholder="เช่น 091-234-5678" class="form-input" />
              </div>
              <div>
                <label class="form-label">ที่อยู่ร้าน</label>
                <textarea
                  v-model="form.shopAddress"
                  rows="2"
                  placeholder="ที่อยู่สำหรับแสดงในใบเสร็จ..."
                  class="form-input resize-none"
                />
              </div>
              <div>
                <label class="form-label">ข้อความท้ายใบเสร็จ</label>
                <input v-model="form.footerMessage" type="text" placeholder="เช่น ขอบคุณที่อุดหนุนครับ/ค่ะ" class="form-input" />
              </div>
              
            </div>
          </div>
        </div>

        <!-- ====== TAB: AI ====== -->
        <div v-show="activeTab === 'ai'" class="space-y-5">

          <!-- การรวมระบบ AI (AI Integration) -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">การตั้งค่า AI อัจฉริยะ</h2>
            <div class="space-y-6">
              
              <!-- Gemini -->
              <div class="p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🤖</span>
                    <span class="text-sm font-bold text-primary-400">Google Gemini</span>
                  </div>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-[10px] text-primary-400 underline decoration-primary-400/30">รับ API Key</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="form-label !text-[10px]">API Key</label>
                    <input v-model="form.geminiApiKey" type="password" placeholder="AI_xxxxxxxx" class="form-input font-mono !text-[11px]" />
                    <p v-if="!form.geminiApiKey && config.public.defaultGeminiKey" class="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                      <span>✓</span><span>ใช้ค่าเริ่มต้นจาก ENV</span>
                    </p>
                  </div>
                  <div>
                    <label class="form-label !text-[10px]">Model Name</label>
                    <input v-model="form.geminiModel" type="text" placeholder="เช่น gemini-3.1-flash-lite-preview" class="form-input font-mono !text-[11px]" />
                  </div>
                </div>
              </div>

              <!-- OpenRouter -->
              <div class="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🌐</span>
                    <span class="text-sm font-bold text-amber-400">OpenRouter (แนะนำ)</span>
                  </div>
                  <a href="https://openrouter.ai/keys" target="_blank" class="text-[10px] text-amber-400 underline decoration-amber-400/30">รับ API Key</a>
                </div>
                <div class="space-y-3">
                  <div>
                    <label class="form-label !text-[10px]">API Key</label>
                    <input v-model="form.openRouterApiKey" type="password" placeholder="sk-or-v1-xxxx..." class="form-input font-mono !text-[11px]" />
                    <p v-if="!form.openRouterApiKey && config.public.defaultOpenRouterKey" class="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                      <span>✓</span><span>ใช้ค่าเริ่มต้นจาก ENV</span>
                    </p>
                  </div>
                  <div>
                    <label class="form-label !text-[10px]">Models (คั่นด้วยคอมมา สำหรับระบบสำรองอัตโนมัติ)</label>
                    <textarea v-model="form.openRouterModels" rows="2" placeholder="เช่น qwen/qwen3-32b:free, llama-3.3-70b-versatile:free" class="form-input font-mono !text-[11px] resize-none" />
                  </div>
                </div>
              </div>

              <!-- Groq -->
              <div class="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">⚡</span>
                    <span class="text-sm font-bold text-cyan-400">Groq (Fallback)</span>
                  </div>
                  <a href="https://console.groq.com/keys" target="_blank" class="text-[10px] text-cyan-400 underline decoration-cyan-400/30">รับ API Key</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="form-label !text-[10px]">API Key</label>
                    <input v-model="form.groqApiKey" type="password" placeholder="gsk_xxxxxxxx" class="form-input font-mono !text-[11px]" />
                    <p v-if="!form.groqApiKey && config.public.defaultGroqKey" class="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                      <span>✓</span><span>ใช้ค่าเริ่มต้นจาก ENV</span>
                    </p>
                  </div>
                  <div>
                    <label class="form-label !text-[10px]">Model Name</label>
                    <input v-model="form.groqModel" type="text" placeholder="เช่น llama-3.3-70b-versatile" class="form-input font-mono !text-[11px]" />
                  </div>
                </div>
              </div>

              <p class="text-[10px] text-surface-500 italic text-center">หากเว้นช่อง Model ไว้ ระบบจะใช้ค่าเริ่มต้นที่เหมาะสมที่สุดให้ทันทีค่ะ</p>
            </div>
          </div>
        </div>

        <!-- ====== TAB: ใบเสร็จ & เครื่องพิมพ์ ====== -->
        <div v-show="activeTab === 'receipt'" class="space-y-5">
          <!-- ส่วนตั้งค่าใบเสร็จ -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">การพิมพ์ใบเสร็จ</h2>
            <div class="space-y-4">
              <!-- Paper Size -->
              <div>
                <label class="form-label">ขนาดกระดาษ Thermal Printer</label>
                <div class="grid grid-cols-2 gap-3 mt-1">
                  <button
                    v-for="size in ['58mm', '80mm']"
                    :key="size"
                    type="button"
                    @click="form.paperSize = size as any"
                    :class="[
                      'py-3 rounded-xl border font-semibold text-sm transition-all',
                      form.paperSize === size
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-surface-700 bg-surface-950 text-surface-400 hover:border-surface-500'
                    ]"
                  >
                    🖨️ {{ size }}
                    <div class="text-[10px] font-normal opacity-70 mt-0.5">
                      {{ size === '58mm' ? 'พื้นที่พิมพ์ 48mm' : 'พื้นที่พิมพ์ 72mm' }}
                    </div>
                  </button>
                </div>
              </div>

              <!-- Margin ซ้าย/ขวา -->
              <div>
                <label class="form-label">Margin ใบเสร็จ (ตัวอักษร)</label>
                <div class="grid grid-cols-2 gap-3 mt-1">
                  <div>
                    <label class="text-xs text-surface-400 mb-1 block">ซ้าย</label>
                    <input
                      type="number"
                      v-model.number="form.receiptMarginLeft"
                      min="0"
                      max="10"
                      class="form-input text-sm"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-surface-400 mb-1 block">ขวา</label>
                    <input
                      type="number"
                      v-model.number="form.receiptMarginRight"
                      min="0"
                      max="10"
                      class="form-input text-sm"
                    />
                  </div>
                </div>
                <p class="text-xs text-surface-500 mt-1">0–10 ตัวอักษร — ใช้เมื่อข้อความชิดขอบกระดาษ (ค่าเริ่มต้น: 0)</p>
              </div>

              <!-- Column Width -->
              <div>
                <label class="form-label">ความกว้างคอลัมน์ จำนวนราคา (visual columns)</label>
                <div class="grid grid-cols-2 gap-3 mt-1">
                  <div>
                    <label class="text-xs text-surface-400 mb-1 block">จำนวน (qty)</label>
                    <input
                      type="number"
                      v-model.number="form.receiptQtyWidth"
                      min="2"
                      max="8"
                      class="form-input text-sm"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-surface-400 mb-1 block">ราคา (price)</label>
                    <input
                      type="number"
                      v-model.number="form.receiptPriceWidth"
                      min="4"
                      max="12"
                      class="form-input text-sm"
                    />
                  </div>
                </div>
                <p class="text-xs text-surface-500 mt-1">
                  รวมกัน = คอลัมน์ "จำนวนราคา"
                  <span class="text-surface-300 font-semibold">{{ (form.receiptQtyWidth ?? 4) + (form.receiptPriceWidth ?? 7) }} cols</span>
                  — ชื่อสินค้าได้
                  <span class="text-surface-300 font-semibold">{{ receiptNameWidthPreview.nameWidth }} cols</span>
                  (~{{ receiptNameWidthPreview.thaiChars }} ตัวอักษรไทย)
                </p>
              </div>

              <!-- Toggle Options -->
              <div class="space-y-3">
                <div
                  v-for="toggle in toggleOptions"
                  :key="toggle.key"
                  class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800"
                >
                  <div>
                    <div class="text-sm font-semibold text-surface-50">{{ toggle.label }}</div>
                    <div class="text-xs text-surface-500">{{ toggle.desc }}</div>
                  </div>
                  <button
                    type="button"
                    @click="(form as any)[toggle.key] = !(form as any)[toggle.key]"
                    class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                    :class="(form as any)[toggle.key] ? 'bg-primary-500' : 'bg-surface-700'"
                  >
                    <div
                      class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                      :class="(form as any)[toggle.key] ? 'translate-x-[22px]' : 'translate-x-0'"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ส่วนตั้งค่าเครื่องพิมพ์ -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">เครื่องพิมพ์ใบเสร็จ</h2>
            <div class="space-y-4">

              <!-- เลือกวิธีการพิมพ์ -->
              <div>
                <label class="form-label">วิธีการพิมพ์</label>
                <div class="space-y-2 mt-1">
                  <label
                    v-for="method in printerMethods"
                    :key="method.value"
                    class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                    :class="form.printerMethod === method.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-surface-700 bg-surface-950 hover:border-surface-500'"
                  >
                    <input
                      type="radio"
                      :value="method.value"
                      v-model="form.printerMethod"
                      class="mt-0.5 accent-primary-500"
                      @change="() => { checkPrinterStatus(); usbSecurityError = false }"
                    />
                    <div>
                      <div class="text-sm font-semibold text-surface-50">{{ method.label }}</div>
                      <div class="text-xs text-surface-400">{{ method.desc }}</div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- WiFi: ตั้งค่า IP -->
              <template v-if="form.printerMethod === 'wifi'">
                <div class="space-y-3">
                  <div class="grid grid-cols-3 gap-3">
                    <div class="col-span-2">
                      <label class="form-label">IP Address ของเครื่องพิมพ์</label>
                      <input
                        v-model="form.printerIp"
                        type="text"
                        placeholder="เช่น 10.10.100.25"
                        class="form-input font-mono"
                      />
                    </div>
                    <div>
                      <label class="form-label">TCP Port</label>
                      <input
                        v-model.number="form.printerPort"
                        type="number"
                        placeholder="9100"
                        class="form-input font-mono"
                      />
                    </div>
                  </div>

                  <!-- Bridge URL (สำหรับ app cloud-hosted) -->
                  <div>
                    <label class="form-label">
                      Local Bridge URL
                      <span class="normal-case font-normal text-surface-500 ml-1">(เฉพาะ app บน Vercel/cloud)</span>
                    </label>
                    <input
                      v-model="form.printerBridgeUrl"
                      type="text"
                      placeholder="http://192.168.x.x:9200  (เว้นว่างถ้ารัน local)"
                      class="form-input font-mono !text-[12px]"
                    />
                  </div>

                  <!-- Help: วิธีหา IP + กรณีไม่มี Router -->
                  <div class="rounded-xl border border-surface-700 overflow-hidden">
                    <!-- Toggle button -->
                    <button
                      type="button"
                      @click="showLanHelp = !showLanHelp"
                      class="w-full flex items-center gap-2 px-3 py-2.5 bg-surface-800 hover:bg-surface-750 transition-colors text-left"
                    >
                      <span class="text-base">💡</span>
                      <span class="flex-1 text-xs font-semibold text-surface-300">วิธีหา IP และการเชื่อมต่อในแบบต่างๆ</span>
                      <span class="text-surface-500 text-xs">{{ showLanHelp ? '▲' : '▼' }}</span>
                    </button>

                    <Transition name="expand">
                      <div v-if="showLanHelp" class="px-4 py-3 space-y-4 bg-surface-950 border-t border-surface-700 text-xs text-surface-400">

                        <!-- วิธีหา IP -->
                        <div>
                          <p class="font-bold text-surface-300 mb-1">🔍 วิธีหา IP ของ Xprinter</p>
                          <p>กดปุ่ม Feed ค้างไว้ขณะเปิดเครื่อง → printer จะพิมพ์ self-test page ที่มี IP address</p>
                        </div>

                        <div class="border-t border-surface-800" />

                        <!-- แบบ AP Mode (Xprinter เป็น Hotspot) -->
                        <div>
                          <p class="font-bold text-green-400 mb-1">📶 Printer เป็น WiFi Hotspot (AP Mode) — แนะนำ</p>
                          <div class="font-mono bg-surface-900 rounded-lg p-2 text-[10px] leading-relaxed">
                            Tablet ──WiFi──▶ Xprinter AP (SSID: Printer)
                          </div>
                          <p class="mt-1">Tablet connect WiFi ชื่อ "Printer" แล้วใช้ IP ที่ระบุในใบ self-test เลย</p>
                          <p class="mt-1 text-amber-400/80">⚠️ ถ้า app รันบน Vercel/cloud ต้องรัน <strong class="text-surface-200">Local Bridge</strong> ด้วย (ดูด้านล่าง)</p>
                        </div>

                        <div class="border-t border-surface-800" />

                        <!-- แบบมี Router -->
                        <div>
                          <p class="font-bold text-surface-300 mb-1">🌐 มี Router / Switch</p>
                          <div class="font-mono bg-surface-900 rounded-lg p-2 text-[10px] leading-relaxed">
                            Xprinter ──LAN──▶ Router ◀──WiFi── Tablet
                          </div>
                          <p class="mt-1">ใช้ IP ที่ Router assign ให้ printer ได้เลย (ดูจาก self-test page)</p>
                        </div>

                        <div class="border-t border-surface-800" />

                        <!-- แบบไม่มี Router: LAN ตรง -->
                        <div>
                          <p class="font-bold text-surface-300 mb-1">🔌 ต่อสาย LAN ตรง (ไม่มี Router)</p>
                          <div class="font-mono bg-surface-900 rounded-lg p-2 text-[10px] leading-relaxed">
                            Tablet ──USB-C Ethernet──LAN──▶ Xprinter
                          </div>
                          <p class="mt-2 font-semibold text-surface-300">ตั้ง Static IP เอง:</p>
                          <ol class="list-decimal list-inside mt-1 space-y-1 pl-1">
                            <li>Xprinter → <code class="bg-surface-800 px-1 rounded text-primary-400">192.168.0.100</code></li>
                            <li>Tablet (Settings → Network → Ethernet → Static) → <code class="bg-surface-800 px-1 rounded text-primary-400">192.168.0.1</code> / Subnet <code class="bg-surface-800 px-1 rounded text-primary-400">255.255.255.0</code></li>
                          </ol>
                          <p class="mt-2 text-amber-400/80">⚠️ ใช้ USB-C Hub ที่มี PD charging + Ethernet ในตัวเดียว</p>
                        </div>

                        <div class="border-t border-surface-800" />

                        <!-- Local Bridge (กรณี cloud) -->
                        <div>
                          <p class="font-bold text-primary-400 mb-1">🌉 Local Print Bridge (app รันบน Vercel/cloud)</p>
                          <p class="mb-2">เมื่อ app อยู่บน cloud server ไม่สามารถ reach IP ของ printer ใน local network ได้ ต้องรัน bridge บนเครื่องที่ connect WiFi เดียวกับ printer</p>
                          <ol class="list-decimal list-inside space-y-1 pl-1">
                            <li>Connect เครื่อง Windows/Mac/Linux เข้า WiFi "Printer"</li>
                            <li>ติดตั้ง Node.js แล้วรัน: <code class="bg-surface-800 px-1 rounded text-primary-400">node print-bridge.js</code></li>
                            <li>ดู IP ของเครื่องที่แสดงใน terminal แล้วกรอกใน <strong class="text-surface-200">Local Bridge URL</strong> ด้านบน</li>
                          </ol>
                          <p class="mt-2 text-surface-500">ไฟล์ <code class="bg-surface-800 px-1 rounded">print-bridge.js</code> อยู่ใน root ของ project</p>
                        </div>

                      </div>
                    </Transition>
                  </div>
                </div>
              </template>

              <!-- RawBT: คำแนะนำการติดตั้ง -->
              <template v-if="form.printerMethod === 'rawbt'">
                <div class="space-y-3">
                  <!-- สถานะ RawBT -->
                  <div class="flex items-center gap-3 p-3 bg-surface-950 rounded-xl border border-surface-800">
                    <div class="flex-1">
                      <div class="text-xs text-surface-400">สถานะ RawBT</div>
                      <div class="text-sm font-semibold mt-0.5" :class="isRawBTConnected ? 'text-green-400' : 'text-red-400'">
                        {{ isRawBTConnected ? 'เปิดอยู่และพร้อมใช้งาน' : 'ไม่พบแอป หรือยังไม่ได้เปิด' }}
                      </div>
                    </div>
                    <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="isRawBTConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'" />
                  </div>

                  <!-- Help RawBT -->
                  <div class="rounded-xl border border-surface-700 overflow-hidden">
                    <button
                      type="button"
                      @click="showRawbtHelp = !showRawbtHelp"
                      class="w-full flex items-center gap-2 px-3 py-2.5 bg-surface-800 hover:bg-surface-750 transition-colors text-left"
                    >
                      <span class="text-base">💡</span>
                      <span class="flex-1 text-xs font-semibold text-surface-300">วิธีติดตั้งและใช้งาน RawBT</span>
                      <span class="text-surface-500 text-xs">{{ showRawbtHelp ? '▲' : '▼' }}</span>
                    </button>
                    <Transition name="expand">
                      <div v-if="showRawbtHelp" class="px-4 py-3 space-y-4 bg-surface-950 border-t border-surface-700 text-xs text-surface-400">

                        <div>
                          <p class="font-bold text-surface-300 mb-1">📱 วิธีติดตั้ง</p>
                          <ol class="list-decimal list-inside space-y-1 pl-1">
                            <li>ดาวน์โหลด <strong class="text-surface-200">RawBT</strong> จาก Play Store บน Android Tablet</li>
                            <li>เปิดแอป RawBT → เลือก <strong class="text-surface-200">Printer → USB</strong></li>
                            <li>เสียบ Xprinter ผ่าน <strong class="text-surface-200">USB OTG</strong> แล้วกด Allow เมื่อ Android ถาม</li>
                            <li>ทดสอบพิมพ์จากในแอป RawBT ให้ผ่านก่อน</li>
                          </ol>
                        </div>

                        <div class="border-t border-surface-800" />

                        <div>
                          <p class="font-bold text-surface-300 mb-1">🔌 การเชื่อมต่อ</p>
                          <div class="font-mono bg-surface-900 rounded-lg p-2 text-[10px] leading-relaxed">
                            Tablet ──USB OTG adapter──▶ Xprinter
                          </div>
                          <p class="mt-1">RawBT รับ USB ระดับ System ได้ ไม่ติดปัญหา Android driver</p>
                        </div>

                        <div class="border-t border-surface-800" />

                        <div>
                          <p class="font-bold text-amber-400 mb-1">⚠️ ข้อควรระวัง</p>
                          <ul class="list-disc list-inside space-y-1 pl-1">
                            <li>ต้องเปิดแอป RawBT <strong class="text-surface-200">ทิ้งไว้เบื้องหลัง</strong> ตลอดเวลา</li>
                            <li>ถ้าแอป RawBT ถูก Android kill ให้เปิดใหม่แล้วกดตรวจสอบสถานะ</li>
                          </ul>
                        </div>

                      </div>
                    </Transition>
                  </div>

                  <button
                    type="button"
                    @click="checkPrinterStatus"
                    class="w-full py-2 text-xs font-bold rounded-xl border border-surface-600 bg-surface-800 text-surface-400 hover:bg-surface-700 transition-all"
                  >
                    🔄 ตรวจสอบสถานะ RawBT
                  </button>
                </div>
              </template>

              <!-- USB: ปุ่มเชื่อมต่อและสถานะ -->
              <template v-if="form.printerMethod === 'usb'">
                <div v-if="!isUSBSupported()" class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  ⚠️ Browser นี้ไม่รองรับ WebUSB กรุณาใช้ Chrome บน Android หรือ Desktop
                </div>
                <div v-else class="space-y-3">
                  <!-- Security Error Alert -->
                  <div v-if="usbSecurityError" class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 space-y-2">
                    <p class="font-bold">⛔ Android ป้องกันการเข้าถึง USB Printer</p>
                    <p>Android OS ครอง USB printer driver ไว้ก่อน ทำให้ WebUSB ไม่สามารถ open device ได้ นี่เป็น limitation ของ Android</p>
                    <p class="font-semibold">วิธีแก้ไข เลือกวิธีใดวิธีหนึ่ง:</p>
                    <ul class="list-disc list-inside space-y-1 pl-1">
                      <li><strong>WiFi</strong> — เลือก "WiFi / Network" แล้วกรอก IP ของ printer (แนะนำ)</li>
                      <li><strong>RawBT</strong> — ติดตั้งแอป RawBT จาก Play Store แล้วเลือก "RawBT App"</li>
                    </ul>
                  </div>
                  <!-- สถานะ USB -->
                  <div class="flex items-center gap-3 p-3 bg-surface-950 rounded-xl border border-surface-800">
                    <div class="flex-1">
                      <div class="text-xs text-surface-400">สถานะ</div>
                      <div class="text-sm font-semibold mt-0.5" :class="usbDeviceName ? 'text-green-400' : 'text-surface-500'">
                        {{ usbDeviceName ? `เชื่อมต่อแล้ว: ${usbDeviceName}` : 'ยังไม่ได้เชื่อมต่อ' }}
                      </div>
                    </div>
                    <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="usbDeviceName ? 'bg-green-500' : 'bg-surface-600'" />
                  </div>
                  <button
                    type="button"
                    @click="handleConnectUSB"
                    :disabled="isConnectingUSB"
                    class="w-full py-2.5 text-sm font-bold rounded-xl border transition-all"
                    :class="usbDeviceName
                      ? 'border-surface-600 bg-surface-800 text-surface-300 hover:bg-surface-700'
                      : 'border-primary-500/50 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20'"
                  >
                    {{ isConnectingUSB ? '⏳ กำลังเชื่อมต่อ...' : usbDeviceName ? '🔄 เปลี่ยนเครื่องพิมพ์' : '🔌 เชื่อมต่อเครื่องพิมพ์ USB' }}
                  </button>

                  <!-- Help USB -->
                  <div class="rounded-xl border border-surface-700 overflow-hidden">
                    <button
                      type="button"
                      @click="showUsbHelp = !showUsbHelp"
                      class="w-full flex items-center gap-2 px-3 py-2.5 bg-surface-800 hover:bg-surface-750 transition-colors text-left"
                    >
                      <span class="text-base">💡</span>
                      <span class="flex-1 text-xs font-semibold text-surface-300">วิธีใช้งาน WebUSB และข้อจำกัด</span>
                      <span class="text-surface-500 text-xs">{{ showUsbHelp ? '▲' : '▼' }}</span>
                    </button>
                    <Transition name="expand">
                      <div v-if="showUsbHelp" class="px-4 py-3 space-y-4 bg-surface-950 border-t border-surface-700 text-xs text-surface-400">

                        <div>
                          <p class="font-bold text-surface-300 mb-1">🔌 การเชื่อมต่อ</p>
                          <div class="font-mono bg-surface-900 rounded-lg p-2 text-[10px] leading-relaxed">
                            Tablet ──USB OTG adapter──▶ Xprinter
                          </div>
                        </div>

                        <div class="border-t border-surface-800" />

                        <div>
                          <p class="font-bold text-surface-300 mb-1">📋 ขั้นตอนการใช้งาน</p>
                          <ol class="list-decimal list-inside space-y-1 pl-1">
                            <li>เสียบ Xprinter ผ่าน USB OTG ก่อน</li>
                            <li>กดปุ่ม <strong class="text-surface-200">"เชื่อมต่อเครื่องพิมพ์ USB"</strong> → Chrome จะแสดง device picker</li>
                            <li>เลือก Xprinter แล้วกด Connect (ทำครั้งเดียว)</li>
                            <li>จากนั้น Chrome จำ device ไว้ — พิมพ์ได้เลยโดยไม่ต้องเลือกใหม่</li>
                          </ol>
                        </div>

                        <div class="border-t border-surface-800" />

                        <div>
                          <p class="font-bold text-amber-400 mb-1">⚠️ ข้อจำกัดบน Android</p>
                          <p>Android OS อาจครอง USB printer driver ไว้ก่อน ทำให้ได้รับ <code class="bg-surface-800 px-1 rounded text-red-400">SecurityError</code> ถ้าเจอปัญหานี้ให้เปลี่ยนใช้ <strong class="text-surface-200">WiFi</strong> หรือ <strong class="text-surface-200">RawBT</strong> แทน</p>
                        </div>

                      </div>
                    </Transition>
                  </div>
                </div>
              </template>

              <!-- การแสดงผลภาษาไทย (แสดงเฉพาะ usb/wifi) -->
              <div v-if="form.printerMethod === 'usb' || form.printerMethod === 'wifi'" class="space-y-3">
                <!-- Image Mode Toggle -->
                <div class="flex items-start justify-between gap-3 p-3 bg-surface-950 rounded-xl border border-surface-800">
                  <div>
                    <p class="text-sm font-semibold text-surface-200">โหมดภาพ (Image Mode)</p>
                    <p class="text-xs text-surface-500 mt-0.5 leading-relaxed">
                      render ข้อความเป็น bitmap ก่อนปริ้น — ใช้เมื่อข้อความออกมาเป็นภาษาจีน
                    </p>
                  </div>
                  <button
                    type="button"
                    @click="form.printerImageMode = !form.printerImageMode"
                    :class="[
                      'relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200',
                      form.printerImageMode ? 'bg-primary-500' : 'bg-surface-700'
                    ]"
                  >
                    <span :class="[
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                      form.printerImageMode ? 'translate-x-6' : 'translate-x-0'
                    ]" />
                  </button>
                </div>

                <!-- Code Page (ซ่อนเมื่อใช้ Image Mode) -->
                <div v-if="!form.printerImageMode" class="space-y-1">
                  <label class="form-label">Code Page ภาษาไทย</label>
                  <select v-model.number="form.printerCodePage" class="form-input text-sm">
                    <option :value="70">70 — PC874 Thai / TIS-620 (แนะนำ)</option>
                    <option :value="255">255 — Thai variant (บางรุ่น)</option>
                    <option :value="21">21 — Xprinter บางรุ่น</option>
                    <option :value="20">20 — Epson TM series</option>
                    <option :value="0">0 — ไม่ระบุ (ใช้ค่า default ของ printer)</option>
                  </select>
                  <p class="text-xs text-surface-500">ถ้าข้อความออกมาเป็นภาษาจีน ให้เปิด Image Mode แทน</p>
                </div>
              </div>

              <!-- Kitchen Copy Toggle -->
              <div class="space-y-3 pt-2 border-t border-surface-800">
                <div class="flex items-start justify-between gap-3 p-4 bg-surface-950 rounded-xl border border-primary-500/20 shadow-lg shadow-primary-500/5">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-lg">👨‍🍳</span>
                      <p class="text-sm font-bold text-surface-50">พิมพ์ใบสั่งทำอาหาร (Kitchen Copy)</p>
                    </div>
                    <p class="text-[11px] text-surface-500 leading-relaxed">
                      พิมพ์บิล 2 ชุดและตัดกระดาษคั่น ชุดที่ 2 จะตัดส่วนหัวร้านออกและแสดงเฉพาะรายการอาหารสำหรับเข้าครัว
                    </p>
                  </div>
                  <button
                    type="button"
                    @click="form.printKitchenCopy = !form.printKitchenCopy"
                    class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center mt-1"
                    :class="form.printKitchenCopy ? 'bg-primary-500' : 'bg-surface-700'"
                  >
                    <div class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                      :class="form.printKitchenCopy ? 'translate-x-[22px]' : 'translate-x-0'" />
                  </button>
                </div>
              </div>

              <!-- ทดสอบพิมพ์ (แสดงทุก method) -->
              <button
                type="button"
                @click="handleTestPrint"
                :disabled="isTestingPrint"
                class="w-full py-2.5 text-sm font-bold rounded-xl border border-surface-600 bg-surface-800 text-surface-300 hover:bg-surface-700 transition-all disabled:opacity-50"
              >
                {{ isTestingPrint ? '⏳ กำลังพิมพ์...' : '🖨️ ทดสอบพิมพ์' }}
              </button>
            </div>
          </div>

        </div>

        <!-- ====== TAB: KDS ====== -->
        <div v-show="activeTab === 'kds'" class="space-y-5">

          <!-- KDS Card -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-xl">👨‍🍳</span>
              <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest">ระบบจอสั่งงานห้องเครื่อง (KDS)</h2>
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800">
                <div>
                  <div class="text-sm font-semibold text-surface-50">เปิดใช้งาน KDS</div>
                  <div class="text-xs text-surface-500">เปิดใช้สถานะ รอทำ/รอเสิร์ฟ (ถ้าปิดออร์เดอร์จะเสร็จทันที)</div>
                </div>
                <button
                  type="button"
                  @click="form.enableKds = !form.enableKds"
                  class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                  :class="form.enableKds ? 'bg-primary-500' : 'bg-surface-700'"
                >
                  <div class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                    :class="form.enableKds ? 'translate-x-[22px]' : 'translate-x-0'" />
                </button>
              </div>
            </div>
          </div>

          <!-- POS Display Card -->
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-xl">🛒</span>
              <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest">การแสดงสินค้าในหน้าขาย (POS)</h2>
            </div>
            <div class="space-y-3">
              <div class="flex items-start justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800 gap-3">
                <div>
                  <div class="text-sm font-semibold text-surface-50">แสดงสินค้าหมวดหมู่ย่อยรวมด้วย</div>
                  <div class="text-xs text-surface-500 mt-1 leading-relaxed">
                    เมื่อกดเลือกหมวดหมู่ที่มีหมวดหมู่ย่อย จะแสดงสินค้าของหมวดหมู่ย่อยทั้งหมดรวมกัน<br />
                    <span class="text-primary-400/80">(ปิด = แสดงเฉพาะสินค้าในหมวดหมู่นั้นโดยตรงเท่านั้น)</span>
                  </div>
                </div>
                <button
                  type="button"
                  @click="form.showSubcategoryProducts = !form.showSubcategoryProducts"
                  class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center mt-0.5"
                  :class="form.showSubcategoryProducts ? 'bg-primary-500' : 'bg-surface-700'"
                >
                  <div class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                    :class="form.showSubcategoryProducts ? 'translate-x-[22px]' : 'translate-x-0'" />
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- ====== TAB: LINE ====== -->
        <div v-show="activeTab === 'line'" class="space-y-5">
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="#06C755"/>
                <path d="M20 10.64C20 6.97 16.42 4 12 4S4 6.97 4 10.64c0 3.28 2.91 6.03 6.84 6.55.27.06.63.18.72.41.08.21.05.53.03.74l-.12.7c-.04.21-.16.82.72.45.88-.37 4.74-2.79 6.47-4.77C20.44 13.22 20 11.97 20 10.64z" fill="white"/>
              </svg>
              <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest">LINE แจ้งเตือน</h2>
            </div>
            <p class="text-[11px] text-surface-500 mb-4 leading-relaxed">
              ต้องตั้งค่า <code class="bg-surface-800 px-1 rounded text-primary-400">NUXT_LINE_CHANNEL_ACCESS_TOKEN</code> ใน .env ก่อนจึงจะรับข้อความได้
            </p>
            <div class="space-y-3">
              <!-- ออร์เดอร์ใหม่ -->
              <div class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800">
                <div>
                  <div class="text-sm font-semibold text-surface-50">มีออร์เดอร์ใหม่</div>
                  <div class="text-xs text-surface-500">ส่งข้อความทุกครั้งที่มีการสั่งซื้อ</div>
                </div>
                <button
                  type="button"
                  @click="form.lineNewOrder = !form.lineNewOrder"
                  class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                  :class="form.lineNewOrder ? 'bg-primary-500' : 'bg-surface-700'"
                >
                  <div class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                    :class="form.lineNewOrder ? 'translate-x-[22px]' : 'translate-x-0'" />
                </button>
              </div>

              <!-- สต็อกใกล้หมด -->
              <div class="flex items-center justify-between bg-surface-950 rounded-xl px-4 py-3 border border-surface-800">
                <div>
                  <div class="text-sm font-semibold text-surface-50">สต็อกใกล้หมด</div>
                  <div class="text-xs text-surface-500">แจ้งเตือนเมื่อสินค้าถึงขีดเตือน</div>
                </div>
                <button
                  type="button"
                  @click="form.lineLowStock = !form.lineLowStock"
                  class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                  :class="form.lineLowStock ? 'bg-primary-500' : 'bg-surface-700'"
                >
                  <div class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                    :class="form.lineLowStock ? 'translate-x-[22px]' : 'translate-x-0'" />
                </button>
              </div>

              <!-- สรุปยอดรายวัน -->
              <div class="bg-surface-950 rounded-xl border border-surface-800 overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3">
                  <div>
                    <div class="text-sm font-semibold text-surface-50">สรุปยอดรายวัน</div>
                    <div class="text-xs text-surface-500">ส่งสรุปยอดขายเข้า LINE ตามเวลาที่กำหนด</div>
                  </div>
                  <button
                    type="button"
                    @click="form.lineDailySummary = !form.lineDailySummary"
                    class="relative w-12 h-[26px] rounded-full transition-all duration-300 shrink-0 p-[3px] flex items-center"
                    :class="form.lineDailySummary ? 'bg-primary-500' : 'bg-surface-700'"
                  >
                    <div class="w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300"
                      :class="form.lineDailySummary ? 'translate-x-[22px]' : 'translate-x-0'" />
                  </button>
                </div>
                <!-- Time picker (แสดงเมื่อเปิด) -->
                <Transition name="expand">
                  <div v-if="form.lineDailySummary" class="px-4 pb-4 border-t border-surface-800 pt-3 space-y-3">
                    <div>
                      <label class="form-label !mb-2">เวลาที่ส่ง</label>
                      <div class="flex items-center gap-2">
                        <select
                          v-model.number="form.lineDailySummaryHour"
                          class="form-input !w-auto"
                        >
                          <option v-for="h in summaryHourOptions" :key="h.value" :value="h.value">
                            {{ h.label }}
                          </option>
                        </select>
                        <span class="text-xs text-surface-500">น. (เวลาไทย)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="handleTestLineSummary"
                      :disabled="isTestingSummary"
                      class="w-full py-2 text-xs font-bold rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-all"
                    >
                      {{ isTestingSummary ? '⏳ กำลังส่ง...' : '🧪 ทดสอบส่ง LINE สรุปยอดตอนนี้' }}
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== Save Button (แสดงทุก Tab) ====== -->
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="w-full py-3.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-900/20"
        >
          {{ isSaving ? 'กำลังบันทึก...' : '✅ บันทึกการตั้งค่า' }}
        </button>

        </div>
        <!-- /Center: Tab Content -->

        <!-- ====== Right: Receipt Preview (ร้านค้า + ใบเสร็จ) ====== -->
        <div v-if="activeTab === 'shop' || activeTab === 'receipt'" class="w-52 shrink-0 sticky top-6">
          <div class="bg-surface-900 border border-surface-700 rounded-2xl p-4 shadow-2xl shadow-black/50">
            <h2 class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>📄</span> ตัวอย่างใบเสร็จ
            </h2>
            <div class="flex justify-center bg-surface-950 rounded-xl p-3 overflow-auto border border-surface-800">
              <div :class="['font-mono text-black bg-white p-3 text-[10px] shadow-lg', form.paperSize === '58mm' ? 'w-[48mm]' : 'w-[72mm]']">
                <div class="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                  <p class="font-black text-sm uppercase">{{ form.shopName || 'ชื่อร้าน' }}</p>
                  <p v-if="form.shopTagline" class="text-[9px]">{{ form.shopTagline }}</p>
                  <p v-if="form.shopPhone" class="text-[9px]">📞 {{ form.shopPhone }}</p>
                  <p v-if="form.shopAddress" class="text-[8px] leading-tight">{{ form.shopAddress }}</p>
                  <p class="text-[8px] text-gray-400 mt-0.5">07/04/2026 13:30</p>
                </div>
                <div class="text-[9px] space-y-0.5 mb-2">
                  <p v-if="form.showOrderNumber">เลขที่บิล: <strong>YUM-260407-1330-{{ form.deviceCode || 'D1' }}-0001</strong></p>
                  <p v-if="form.showStaffName">พนักงาน: ผู้จัดการ</p>
                  <p>ชำระ: เงินสด</p>
                </div>
                <div class="border-t border-dashed border-gray-400 pt-1.5 mb-2">
                  <div class="flex justify-between"><span class="flex-1">ยำมะม่วง</span><span class="w-5 text-right">x1</span><span class="w-12 text-right">60</span></div>
                  <div class="text-[8px] text-gray-400 pl-2">เผ็ดน้อย</div>
                  <div class="flex justify-between mt-1"><span class="flex-1">ข้าวสวย</span><span class="w-5 text-right">x2</span><span class="w-12 text-right">40</span></div>
                </div>
                <div class="border-t border-dashed border-gray-400 pt-1 text-[9px] space-y-0.5 mb-2">
                  <div class="flex justify-between"><span>ยอดรวม</span><span>100</span></div>
                  <div class="flex justify-between font-black text-xs border-t border-gray-400 pt-0.5 mt-0.5"><span>ยอดสุทธิ</span><span>100 บาท</span></div>
                </div>
                <div class="text-center border-t border-dashed border-gray-400 pt-1.5 text-[9px]">
                  <p class="font-bold">{{ form.footerMessage || 'ขอบคุณที่อุดหนุน' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- /Right: Receipt Preview -->

      </div>
      <!-- /Layout -->

    </div>
  </div>
</template>


<script setup lang="ts">
import { useSettings, type ReceiptSettings } from '~/composables/useSettings'
import { useToast } from '~/composables/useToast'
import { usePrinter } from '~/composables/usePrinter'

definePageMeta({ layout: 'admin' })

// ระบบ Tab
const activeTab = ref<'shop' | 'receipt' | 'kds' | 'line' | 'ai'>('shop')
const tabs: { key: typeof activeTab.value; icon: string; label: string }[] = [
  { key: 'shop', icon: '🏪', label: 'ร้านค้า' },
  { key: 'receipt', icon: '🖨️', label: 'ใบเสร็จ' },
  { key: 'kds', icon: '👨‍🍳', label: 'KDS' },
  { key: 'line', icon: '💬', label: 'LINE' },
  { key: 'ai', icon: '🤖', label: 'AI' },
]

const config = useRuntimeConfig()
const { receiptSettings, isSaving, loadReceiptSettings, saveReceiptSettings } = useSettings()
const { checkRawBTStatus, connectUSBPrinter, getUSBPrinter, isUSBSupported, testPrint } = usePrinter()
const toast = useToast()

const isRawBTConnected = ref(true)
const usbDeviceName = ref<string>('')
const isConnectingUSB = ref(false)
const isTestingPrint = ref(false)
const usbSecurityError = ref(false)
const showLanHelp = ref(false)
const showRawbtHelp = ref(false)
const showUsbHelp = ref(false)

// ใช้ reactive copy เพื่อแก้ไขก่อนบันทึก
const form = reactive<ReceiptSettings>({
  deviceCode: 'D1',
  shopName: 'Yum2K',
  shopTagline: '',
  shopPhone: '',
  shopAddress: '',
  footerMessage: 'ขอบคุณที่อุดหนุนครับ/ค่ะ',
  paperSize: '80mm',
  printerMethod: 'usb',
  printerIp: '',
  printerPort: 9100,
  printerBridgeUrl: '',
  printerCodePage: 70,
  printerImageMode: false,
  showOrderNumber: true,
  showStaffName: true,
  showTaxInfo: false,
  geminiApiKey: '',
  geminiModel: '',
  groqApiKey: '',
  groqModel: '',
  openRouterApiKey: '',
  openRouterModels: '',
  lineNewOrder: false,
  lineLowStock: false,
  lineDailySummary: true,
  lineDailySummaryHour: 22,
  enableKds: false,
  showSubcategoryProducts: false,
  printKitchenCopy: false,
  receiptMarginLeft: 0,
  receiptMarginRight: 0,
  receiptQtyWidth: 4,
  receiptPriceWidth: 7,
})

const printerMethods = [
  {
    value: 'wifi' as const,
    label: 'WiFi / Network — แนะนำ',
    desc: 'ส่ง ESC/POS ตรงไปยัง IP ของ printer ผ่าน TCP port 9100 ไม่ต้องแอปเพิ่ม'
  },
  {
    value: 'rawbt' as const,
    label: 'RawBT App (USB OTG)',
    desc: 'ผ่านแอป RawBT ที่ต้องเปิดค้างไว้บนเครื่อง รองรับ USB OTG บน Android'
  },
  {
    value: 'usb' as const,
    label: 'USB (WebUSB)',
    desc: 'WebUSB direct — อาจไม่รองรับบน Android เนื่องจาก OS ครอง USB driver ไว้'
  },
  {
    value: 'browser' as const,
    label: 'Browser Print Dialog',
    desc: 'ใช้ระบบพิมพ์ของ browser (จะมีหน้าต่าง confirm)'
  },
]

const summaryHourOptions = Array.from({ length: 8 }, (_, i) => {
  const h = 16 + i // 16–23
  return { value: h, label: `${h.toString().padStart(2, '0')}:00` }
})

const receiptNameWidthPreview = computed(() => {
  const lineWidth = form.paperSize === '58mm' ? 32 : 42
  const marginLeft = form.receiptMarginLeft ?? 0
  const marginRight = form.receiptMarginRight ?? 0
  const effectiveWidth = lineWidth - marginLeft - marginRight
  const qtyWidth = form.receiptQtyWidth ?? 4
  const priceWidth = form.receiptPriceWidth ?? 7
  const nameWidth = effectiveWidth - qtyWidth - priceWidth
  const thaiChars = Math.floor(nameWidth / 2)
  return { nameWidth, thaiChars }
})

onMounted(async () => {
  await loadReceiptSettings()
  Object.assign(form, receiptSettings.value)
  await checkPrinterStatus()
})

async function checkPrinterStatus() {
  isRawBTConnected.value = await checkRawBTStatus()
  // เช็คสถานะ USB printer ที่ pair ไว้แล้ว
  if (isUSBSupported()) {
    const device = await getUSBPrinter()
    usbDeviceName.value = device?.productName || (device ? 'USB Printer' : '')
  }
}

async function handleConnectUSB() {
  isConnectingUSB.value = true
  try {
    const device = await connectUSBPrinter()
    if (device) {
      usbDeviceName.value = device.productName || 'USB Printer'
      toast.success(`เชื่อมต่อสำเร็จ: ${usbDeviceName.value}`)
    } else {
      toast.error('ยกเลิกการเชื่อมต่อ หรือไม่พบเครื่องพิมพ์')
    }
  } finally {
    isConnectingUSB.value = false
  }
}

async function handleTestPrint() {
  isTestingPrint.value = true
  await saveReceiptSettings({ ...form })
  try {
    const result = await testPrint()
    if (result.success) {
      toast.success('ส่งคำสั่งพิมพ์เรียบร้อยแล้ว')
    } else if (result.errorType === 'security_error') {
      usbSecurityError.value = true
      toast.error('USB ถูก Android OS ครอง ไม่สามารถใช้ WebUSB ได้ ดูคำแนะนำด้านล่าง')
    } else if (result.errorType === 'no_ip') {
      toast.error('กรุณากรอก IP ของ printer ก่อน')
    } else if (result.errorType === 'no_device') {
      toast.error('ไม่พบ USB printer กรุณากด "เชื่อมต่อเครื่องพิมพ์ USB" ก่อน')
    } else if (result.errorType === 'connection_error') {
      toast.error('เชื่อมต่อ printer ไม่ได้ กรุณาตรวจสอบ IP และการเชื่อมต่อเครือข่าย')
    } else {
      const detail = result.errorMessage ? ` (${result.errorMessage})` : ''
      toast.error(`ไม่สามารถพิมพ์ได้ กรุณาตรวจสอบการเชื่อมต่อ${detail}`)
    }
  } finally {
    isTestingPrint.value = false
  }
}

const toggleOptions = [
  { key: 'showOrderNumber', label: 'แสดงเลขที่บิล', desc: 'แสดงเลขที่บิลบนใบเสร็จ' },
  { key: 'showStaffName', label: 'แสดงชื่อพนักงาน', desc: 'แสดงชื่อพนักงานที่ขาย' },
  { key: 'showTaxInfo', label: 'แสดงข้อมูลภาษี (VAT)', desc: 'แสดงยอดภาษีแยกในใบเสร็จ' },
]

async function handleSave() {
  try {
    await saveReceiptSettings({ ...form })
    toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว')
  } catch (e: any) {
    toast.error('ล้มเหลว: ' + e.message)
  }
}


const isTestingSummary = ref(false)

async function handleTestLineSummary() {
  isTestingSummary.value = true
  try {
    const res = await $fetch<{ status: string; reason?: string; orderCount?: number; revenue?: number }>('/api/line-daily-summary?force=true')
    if (res.status === 'ok') {
      toast.success(`ส่ง LINE สรุปยอดเรียบร้อย (${res.orderCount} บิล ฿${res.revenue?.toLocaleString('th-TH')})`)
    } else if (res.status === 'skipped') {
      toast.success(`ข้าม: ${res.reason === 'already_sent_today' ? 'ส่งไปแล้ววันนี้' : res.reason}`)
    } else {
      toast.error('ส่งไม่สำเร็จ: ' + (res.reason ?? 'unknown error'))
    }
  } catch (e: any) {
    toast.error('เกิดข้อผิดพลาด: ' + e.message)
  } finally {
    isTestingSummary.value = false
  }
}


</script>

<style scoped>

.form-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.375rem;
  color: var(--color-surface-400, #94a3b8);
}
.form-input {
  width: 100%;
  background-color: var(--color-surface-950, #020617);
  border: 1px solid var(--color-surface-700, #334155);
  color: var(--color-surface-50, #f8fafc);
  border-radius: 0.75rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s ease;
}
.form-input:focus {
  border-color: var(--color-primary-500, #8b5cf6);
}
.expand-enter-active, .expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 120px;
}
</style>
