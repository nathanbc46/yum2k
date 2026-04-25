<!-- =============================================================================
  components/admin/AiAnalysisModal.vue
  Modal สำหรับแสดงการวิเคราะห์ข้อมูลด้วย AI (Real Gemini API)
  - วิเคราะห์ยอดขาย, พฤติกรรมลูกค้า, และสินค้า
  - รองรับการแชทถาม-ตอบต่อเนื่อง
  - แสดง Prompt ที่ใช้จริงได้ (Debug Mode)
============================================================================= -->
<template>
  <Teleport to="body">
    <Transition name="ai-fade">
      <div class="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-surface-950/90 backdrop-blur-md" @click="close" />

        <!-- Modal Content -->
        <div :class="[
          'relative border shadow-2xl overflow-hidden flex flex-col transition-all duration-500',
          isFullscreen ? 'w-full h-full max-w-none rounded-none p-4' : 'w-full max-w-2xl rounded-[2.5rem] h-[90vh]'
        ]"
          :style="{ backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }"
        >
          
          <!-- Animated AI Header -->
          <div class="p-6 border-b relative overflow-hidden shrink-0"
            :style="{ borderColor: isDark ? '#1f2937' : '#f1f5f9' }"
          >
            <!-- Background Glow -->
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-[100px]" />
            <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px]" />

            <div class="relative flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                  <span class="text-2xl">🤖</span>
                </div>
                <div>
                  <h2 class="text-xl font-black flex items-center gap-2" :style="{ color: isDark ? '#f8fafc' : '#0f172a' }">
                    AI Smart Insight
                    <span v-if="currentProvider" class="px-2 py-0.5 rounded text-[8px] font-black tracking-tighter uppercase border"
                      :style="providerBadgeStyle"
                    >
                      {{ currentProvider }}
                    </span>
                  </h2>
                  <p class="text-xs" :style="{ color: isDark ? '#94a3b8' : '#64748b' }">ข้อมูลอ้างอิงตามฟิลเตอร์ที่คุณเลือกไว้</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  @click="showRawPrompt = !showRawPrompt"
                  class="w-10 h-10 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 transition-colors flex items-center justify-center"
                  title="ดูข้อมูลที่ส่งให้ AI"
                >
                  📄
                </button>
                <button 
                  @click="isFullscreen = !isFullscreen"
                  class="w-10 h-10 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 transition-colors flex items-center justify-center"
                  :title="isFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ'"
                >
                  <Maximize2 v-if="!isFullscreen" class="w-4 h-4" />
                  <Minimize2 v-else class="w-4 h-4" />
                </button>
                <button @click="close" class="w-10 h-10 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 transition-colors flex items-center justify-center">✕</button>
              </div>
            </div>
          </div>

          <!-- Tabs: Insight / Chat -->
          <div class="flex border-b shrink-0 transition-all duration-500"
            :style="{ backgroundColor: isDark ? '#030712' : '#f8fafc', borderColor: isDark ? '#1f2937' : '#f1f5f9' }"
          >
            <button 
              v-for="t in ['insight', 'chat']" 
              :key="t"
              @click="activeTab = t as any"
              class="flex-1 py-4 text-sm font-bold transition-all border-b-2"
              :style="{ 
                color: activeTab === t ? '#f97316' : (isDark ? '#64748b' : '#94a3b8'),
                borderBottomColor: activeTab === t ? '#f97316' : 'transparent',
                backgroundColor: activeTab === t ? (isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.05)') : 'transparent'
              }"
            >
              {{ t === 'insight' ? '📊 สรุปภาพรวม' : '💬 แชทถาม AI' }}
            </button>
          </div>

          <!-- Content Area -->
          <div class="flex-1 overflow-y-auto p-6 scrollbar-hide"
            :class="[isDark ? 'bg-surface-900/50' : 'bg-white']"
          >
            
            <!-- Raw Prompt Overlay (Debug) -->
            <Transition name="ai-fade">
              <div v-if="showRawPrompt" 
                class="absolute inset-0 z-20 p-6 overflow-y-auto font-mono text-[10px] whitespace-pre-wrap leading-relaxed transition-all duration-500"
                :style="{ backgroundColor: isDark ? '#020617' : '#f8fafc', color: isDark ? '#93c5fd' : '#334155' }"
              >
                <div class="flex justify-between items-center mb-4 border-b pb-2 sticky top-0"
                  :style="{ borderColor: isDark ? '#1e293b' : '#e2e8f0', backgroundColor: isDark ? '#020617' : '#f8fafc' }"
                >
                  <span class="font-black text-xs uppercase tracking-widest" :style="{ color: isDark ? '#475569' : '#64748b' }">
                    Raw Data Sent to AI (Prompt)
                  </span>
                  <div class="flex items-center gap-3">
                    <button 
                      @click="copyCleanPrompt" 
                      class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition-all text-[10px]"
                    >
                      <span>📋 คัดลอก Prompt</span>
                    </button>
                    <button @click="showRawPrompt = false" class="font-bold hover:text-red-500 transition-colors" :style="{ color: isDark ? '#64748b' : '#94a3b8' }">
                      ปิด [X]
                    </button>
                  </div>
                </div>
                <div class="opacity-90">
                  {{ lastPrompt || 'กำลังประมวลผลข้อมูล...' }}
                </div>
              </div>
            </Transition>


            <!-- Tab: Insight -->
            <div v-if="activeTab === 'insight'" class="space-y-8 pb-4">
              <!-- Executive Summary -->
              <section class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-[10px] font-black text-primary-500 uppercase tracking-widest">
                    <span class="w-2 h-2 rounded-full bg-primary-500" />
                    บทสรุปอัจฉริยะ
                  </div>
                  <!-- Business Health Badge -->
                  <div v-if="executiveSummary && !isThinking" class="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all shadow-sm"
                    :style="healthBadgeStyle"
                  >
                    <span>{{ healthBadgeLabel }}</span>
                  </div>
                </div>
                <!-- บังคับสีพื้นหลังและตัวอักษรด้วยรหัสสีที่แน่นอน -->
                <div v-if="executiveSummary || isThinking" class="p-6 rounded-3xl border shadow-inner transition-all duration-500"
                  :style="{ 
                    backgroundColor: isDark ? '#1f2937' : '#f8fafc', 
                    borderColor: isDark ? '#374151' : '#f1f5f9' 
                  }"
                >
                  <!-- Loading State Inside Box -->
                  <div v-if="isThinking" class="flex flex-col items-center justify-center py-8 gap-4">
                    <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                    <div class="text-center">
                      <p class="text-sm font-bold text-primary-500 animate-pulse">{{ thinkingMessage }}</p>
                      <p v-if="activeModelName" class="text-[8px] text-surface-500 mt-1 font-mono uppercase tracking-wider">
                        Using: {{ activeModelName }}
                      </p>
                    </div>
                  </div>

                  <p v-else-if="executiveSummary" class="leading-relaxed text-base font-medium" :style="{ color: isDark ? '#ffffff' : '#000000' }">
                    {{ executiveSummary }}
                  </p>

                  <!-- TTS Button for Summary -->
                  <div v-if="executiveSummary && !isThinking" class="mt-4 flex justify-end">
                    <button 
                      @click="toggleSpeak(executiveSummary)"
                      class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 transition-all text-[10px] font-black"
                    >
                      <span v-if="speakingText === executiveSummary" class="animate-pulse">🔊 กำลังอ่าน...</span>
                      <span v-else>🔈 อ่านให้ฟัง</span>
                    </button>
                  </div>
                </div>

                <!-- Empty State: Show Start Analysis Button -->
                <div v-else class="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                  <div class="w-20 h-20 bg-primary-600/10 rounded-full flex items-center justify-center text-4xl">🤖</div>
                  <div>
                    <h3 class="text-lg font-black" :style="{ color: isDark ? '#ffffff' : '#0f172a' }">ยังไม่ได้เริ่มวิเคราะห์ข้อมูล</h3>
                    <p class="text-sm text-surface-500 max-w-xs mx-auto">คลิกปุ่มด้านล่างเพื่อให้ AI รวบรวมข้อมูลและวิเคราะห์แนวโน้มธุรกิจให้คุณค่ะ</p>
                  </div>
                  <button @click="runAnalysis"
                    class="px-8 py-4 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-2xl font-black shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span>🚀 เริ่มการวิเคราะห์เดี๋ยวนี้</span>
                  </button>
                </div>
              </section>

              <!-- Highlights Grid -->
              <section v-if="insights.length > 0 && !isThinking" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="insight in insights" :key="insight.title" 
                  class="p-5 rounded-2xl border flex flex-col gap-3 transition-all shadow-sm"
                  :style="{ 
                    backgroundColor: isDark ? '#1f2937' : '#ffffff', 
                    borderColor: isDark ? '#374151' : '#f1f5f9' 
                  }"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">{{ insight.icon }}</span>
                    <div class="font-bold text-sm" :style="{ color: isDark ? '#ffffff' : '#000000' }">{{ insight.title }}</div>
                  </div>
                  <p class="text-xs font-medium leading-relaxed flex-1" :style="{ color: isDark ? '#f2f2f2' : '#1a1a1a' }">
                    {{ insight.description }}
                  </p>
                  
                  <div v-if="insight.action" 
                    class="mt-2 p-3 rounded-xl border transition-all"
                    :style="{ 
                      backgroundColor: isDark ? '#111827' : '#fef2f2', 
                      borderColor: isDark ? '#1f2937' : '#fee2e2' 
                    }"
                  >
                    <div class="flex items-start gap-2">
                      <span class="text-sm">💡</span>
                      <p class="text-[11px] font-black leading-normal" :style="{ color: isDark ? '#ffffff' : '#000000' }">
                        {{ insight.action }}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            <!-- Tab: Chat -->
            <div v-else class="flex flex-col h-full space-y-4">
              <!-- Chat History -->
              <div ref="chatContainer" class="flex-1 space-y-4 overflow-y-auto pb-4 pr-2 scrollbar-thin">
                <div v-if="chatHistory.length === 0" class="h-full flex flex-col items-center justify-center text-center text-surface-500 space-y-3 opacity-50">
                  <div class="text-4xl">💭</div>
                  <p class="text-sm font-bold">สงสัยตรงไหน ถาม AI เพิ่มเติมได้เลยค่ะ!</p>
                  <p class="text-[10px]">ระบบจะใช้ข้อมูลจากรายงานล่าสุดในการตอบคำถามคุณ</p>
                </div>
                
                <div v-for="(msg, idx) in chatHistory" :key="idx" 
                  :ref="el => { if (idx === chatHistory.length - 1) lastMessageRef = el as any }"
                  :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
                  <div class="max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed transition-all shadow-sm"
                    :style="{ 
                      backgroundColor: msg.role === 'user' ? '#f97316' : (isDark ? '#1f2937' : '#f8fafc'), 
                      color: msg.role === 'user' ? '#ffffff' : (isDark ? '#f1f5f9' : '#0f172a'),
                      border: msg.role === 'user' ? 'none' : `1px solid ${isDark ? '#374151' : '#f1f5f9'}`,
                      borderTopLeftRadius: msg.role === 'assistant' ? '0' : '1rem',
                      borderTopRightRadius: msg.role === 'user' ? '0' : '1rem'
                    }"
                  >
                    <div v-if="msg.role === 'assistant'" v-html="formatMarkdown(msg.content)"></div>
                    <div v-else>{{ msg.content }}</div>

                    <!-- Speaker Icon for AI Response -->
                    <div v-if="msg.role === 'assistant'" class="mt-2 flex justify-end border-t border-surface-700/30 pt-1">
                      <button 
                        @click="toggleSpeak(msg.content)"
                        class="p-1.5 rounded-lg hover:bg-white/5 text-surface-400 hover:text-primary-400 transition-all"
                        title="อ่านให้ฟัง"
                      >
                        <span v-if="speakingText === msg.content" class="text-xs animate-pulse">🔊</span>
                        <span v-else class="text-xs">🔈</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- AI Thinking Bubble (Gemini Style) -->
                <div v-if="isThinking" class="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                  <div class="p-4 rounded-2xl rounded-tl-none border shadow-sm flex items-center gap-2"
                    :style="{ 
                      backgroundColor: isDark ? '#1f2937' : '#f8fafc', 
                      borderColor: isDark ? '#374151' : '#f1f5f9'
                    }"
                  >
                    <div class="flex gap-1">
                      <div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.3s]"></div>
                      <div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.15s]"></div>
                      <div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce"></div>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[10px] font-bold text-primary-500 tracking-tight uppercase">AI กำลังประมวลผล...</span>
                      <span v-if="activeModelName" class="text-[8px] text-primary-500/60 font-mono uppercase tracking-widest mt-0.5">
                        Using: {{ activeModelName }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quick Questions -->
              <div class="flex flex-wrap gap-2 pb-2">
                <button 
                  v-for="q in quickQuestions" 
                  :key="q"
                  @click="askQuickQuestion(q)"
                  :disabled="isThinking"
                  class="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-full text-[10px] font-bold text-surface-300 transition-all hover:border-primary-500/50 disabled:opacity-50"
                >
                  {{ q }}
                </button>
              </div>

              <!-- Chat Input -->
              <div class="pt-4 border-t border-surface-800">
                <div class="flex gap-2 bg-surface-950/50 p-2 rounded-2xl border border-surface-800 focus-within:border-primary-500/50 transition-all">
                  <input 
                    v-model="userInput" 
                    @keyup.enter="sendMessage"
                    type="text" 
                    placeholder="พิมพ์ข้อความถาม AI..." 
                    class="flex-1 bg-transparent border-none outline-none text-surface-50 px-3 text-sm"
                    :disabled="isThinking"
                  />
                  <button 
                    @click="sendMessage"
                    :disabled="isThinking || !userInput.trim()"
                    class="w-10 h-10 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 rounded-xl flex items-center justify-center text-white transition-all shadow-lg shadow-primary-900/20"
                  >
                    <span v-if="isThinking">⏳</span>
                    <span v-else>✈️</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div v-if="activeTab === 'insight'" class="p-6 bg-surface-950/50 border-t border-surface-800 flex gap-3 shrink-0">
            <button @click="close" class="flex-1 py-4 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold rounded-2xl transition-all">ปิดหน้าต่าง</button>
            <button @click="reAnalyze" class="flex-1 py-4 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-primary-900/40">🔄 วิเคราะห์อีกครั้ง</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { Maximize2, Minimize2 } from 'lucide-vue-next'
import { useSettings } from '~/composables/useSettings'
import { useToast } from '~/composables/useToast'
import { useTheme } from '~/composables/useTheme'

const props = withDefaults(defineProps<{
  data: {
    revenue: number
    cost: number
    profit: number
    orderCount: number
    topProducts: any[]
    hourlyStats: any[]
    expenses?: number
    // ข้อมูลเชิงลึกเพิ่มเติมสำหรับ AI
    salesByDayHour?: any // ยอดขายตามวันxชั่วโมง (จำนวนบิล)
    productByDay?: any   // สินค้า วันxสัปดาห์ (จำนวนชิ้น)
    productByHour?: any  // สินค้า วันxชั่วโมง (จำนวนชิ้น)
    weeklyTrend?: any    // แนวโน้มรายสัปดาห์
    velocity?: any       // ความถี่การขาย (Velocity)
  }
  initialTab?: 'insight' | 'chat'
}>(), {
  initialTab: 'insight'
})

const emit = defineEmits(['close'])

const { receiptSettings, loadReceiptSettings } = useSettings()
const toast = useToast()
const { isDark } = useTheme()

const activeTab = ref<'insight' | 'chat'>(props.initialTab || 'insight')
const isThinking = ref(true)
const isFullscreen = ref(false)
const currentProvider = ref<'Gemini' | 'OpenRouter' | 'Groq' | 'Offline' | ''>('')
const activeModelName = ref('')
const thinkingMessage = ref('กำลังรวบรวมข้อมูล...')
const score = ref(0)
const executiveSummary = ref('')
const insights = ref<any[]>([])
const isRealAi = ref(false)
const speakingText = ref('')
let speechUtterance: SpeechSynthesisUtterance | null = null

const chatHistory = ref<{ role: 'user' | 'assistant', content: string }[]>([])
const userInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const showRawPrompt = ref(false)
const lastPrompt = ref('')
const lastMessageRef = ref<HTMLElement | null>(null)
const weatherData = ref<any>(null)

/** ดึงข้อมูลสภาพอากาศ (Open-Meteo - ใช้ตำแหน่งจริงถ้าขอได้) */
async function fetchWeather() {
  // ถ้ามีข้อมูลอยู่แล้วและยังไม่เก่าเกินไป (เช่น < 1 ชม.) ไม่ต้องดึงใหม่ (Optional)
  if (weatherData.value) return 

  try {
    let lat = 13.7563 // Default: Bangkok
    let lon = 100.5018

    // ลองขอตำแหน่งจาก Browser
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          // ลด Timeout เหลือ 3 วินาทีเพื่อให้ตอบสนองเร็วขึ้น
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: false })
        })
        lat = position.coords.latitude
        lon = position.coords.longitude
        console.log(`[Weather] Using real location: ${lat}, ${lon}`)
      } catch (geoErr) {
        console.warn('[Weather] Geolocation failed/denied, using default (Bangkok)')
      }
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FBangkok`
    const res = await fetch(url)
    if (res.ok) {
      weatherData.value = await res.json()
      console.log('[Weather] Data updated:', weatherData.value)
    }
  } catch (e) {
    console.error('Failed to fetch weather:', e)
  }
}

/** ฟังก์ชันล้างข้อมูล JSON ให้สะอาดก่อนใช้งาน */
function safeJsonParse(content: string) {
  if (!content) return null
  try {
    // ลบ Markdown code blocks ออก
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch (e) {
    console.warn('[AI] JSON Parse failed, trying to extract JSON with regex...')
    // ลองใช้ Regex ค้นหา { ... } กรณี AI มีข้อความอื่นปนมา
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch (e2) {
        console.error('[AI] Regex JSON extract failed:', e2)
      }
    }
    return null
  }
}

/** Computed สำหรับป้ายสถานะสุขภาพธุรกิจ */
const healthStatus = computed(() => {
  // พยายามประเมินจาก score ที่ AI ส่งมา (ถ้ามี) หรือประเมินเบื้องต้น
  const s = score.value > 10 ? score.value : score.value * 10 // ปรับกรณี AI ส่งมาเต็ม 10
  if (s >= 80) return 'excellent'
  if (s >= 50) return 'stable'
  return 'improvement'
})

const healthBadgeLabel = computed(() => {
  if (healthStatus.value === 'excellent') return '🟢 ยอดเยี่ยม'
  if (healthStatus.value === 'stable') return '🟡 ทรงตัว'
  return '🔵 ควรปรับปรุง'
})

const healthBadgeStyle = computed(() => {
  if (isDark.value) {
    if (healthStatus.value === 'excellent') return { backgroundColor: '#064e3b', color: '#34d399', borderColor: '#065f46' }
    if (healthStatus.value === 'stable') return { backgroundColor: '#451a03', color: '#fbbf24', borderColor: '#78350f' }
    return { backgroundColor: '#1e3a8a', color: '#60a5fa', borderColor: '#1e40af' }
  } else {
    if (healthStatus.value === 'excellent') return { backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }
    if (healthStatus.value === 'stable') return { backgroundColor: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }
    return { backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }
  }
})

const providerBadgeStyle = computed(() => {
  if (currentProvider.value === 'Gemini') return { backgroundColor: '#4285f420', color: '#4285f4', borderColor: '#4285f440' }
  if (currentProvider.value === 'OpenRouter') return { backgroundColor: '#fbbf2420', color: '#f59e0b', borderColor: '#f59e0b40' }
  if (currentProvider.value === 'Groq') return { backgroundColor: '#10b98120', color: '#059669', borderColor: '#05966940' }
  return { backgroundColor: '#64748b20', color: '#64748b', borderColor: '#64748b40' }
})

const quickQuestions = [
  'เมนูไหนขายดีที่สุด?',
  'พรุ่งนี้ฝนตกไหม?',
  'สรุปภาพรวมกำไรให้หน่อย',
  'ควรเตรียมของตอนกี่โมงดี?'
]

const thinkingMessages = [
  'กำลังรวบรวมข้อมูลการขาย...',
  'ส่งข้อมูลให้ AI ประมวลผลเชิงลึก...',
  'AI กำลังวิเคราะห์พฤติกรรมลูกค้า...',
  'กำลังสรุปกลยุทธ์ที่เหมาะสมกับร้านคุณ...',
  'ใกล้เสร็จแล้ว กรุณารอสักครู่...'
]

function close() {
  emit('close')
}

async function reAnalyze() {
  chatHistory.value = []
  lastPrompt.value = ''
  await runAnalysis()
}

/** คัดลอกเฉพาะส่วน Prompt (ไม่เอาส่วน Rules/JSON) */
function copyCleanPrompt() {
  if (!lastPrompt.value) return
  
  // ตัดส่วนที่เป็น Rules ออกเพื่อให้ได้แค่ข้อมูลดิบสำหรับนำไปคุยต่อ
  const parts = lastPrompt.value.split('Rules:')
  const cleanPrompt = (parts[0] || '').trim()
  
  navigator.clipboard.writeText(cleanPrompt)
  toast.success('คัดลอก Prompt ไปยัง Clipboard แล้ว!')
}

async function askQuickQuestion(q: string) {
  userInput.value = q
  await sendMessage()
}

async function runAnalysis() {
  // เตรียม Prompt ไว้เพื่อให้กดดูได้ทันที
  lastPrompt.value = generatePrompt()

  // หากเปิดมาหน้าแชทโดยตรง ไม่ต้องรัน Analysis (เว้นแต่จะกดปุ่มวิเคราะห์เองภายหลัง)
  if (activeTab.value === 'chat' && !executiveSummary.value) {
    isThinking.value = false
    return
  }

  isThinking.value = true
  isRealAi.value = false
  showRawPrompt.value = false
  
  await Promise.all([
    loadReceiptSettings(),
    fetchWeather()
  ])
  const geminiKey = receiptSettings.value.geminiApiKey
  const groqKey = receiptSettings.value.groqApiKey
  const orKey = receiptSettings.value.openRouterApiKey

  let step = 0
  const interval = setInterval(() => {
    thinkingMessage.value = thinkingMessages[step % thinkingMessages.length] || 'กำลังประมวลผล...'
    step++
  }, 800)

  try {
    // 1. ลองใช้ Gemini ก่อน (ตัวหลัก)
    if (geminiKey?.startsWith('AI')) {
      try {
        activeModelName.value = 'Gemini 1.5 Flash'
        console.log('%c[AI] %cTrying Gemini...', 'color: #4285f4; font-weight: bold', 'color: #888')
        await analyzeWithGemini(geminiKey)
        isRealAi.value = true
        return
      } catch (err: any) {
        console.warn('Gemini hit, switching...')
      }
    }

    // 2. ลองใช้ OpenRouter (ศูนย์รวม AI ฟรี)
    if (orKey) {
      try {
        thinkingMessage.value = 'Gemini เต็ม... กำลังใช้ OpenRouter (Free AI Hub) ประมวลผลเชิงลึก...'
        await analyzeWithOpenRouter(orKey)
        isRealAi.value = true
        return
      } catch (err: any) {
        console.error('OpenRouter Error:', err)
      }
    }

    // 3. ลองใช้ Groq (ความเร็วสูง)
    if (groqKey?.startsWith('gsk_')) {
      try {
        activeModelName.value = 'Groq (Llama 3.3)'
        thinkingMessage.value = 'กำลังใช้ Groq สำรองความเร็วสูง...'
        console.log('%c[AI] %cSwitching to Groq fallback...', 'color: #10b981; font-weight: bold', 'color: #888')
        await analyzeWithGroq(groqKey)
        isRealAi.value = true
        return
      } catch (err: any) {
        console.error('Groq Error:', err)
      }
    }

    // 4. ถ้าไม่มี Key หรือพังหมด ให้ใช้ Heuristics
    await analyzeWithHeuristics()
    await analyzeWithHeuristics()
  } catch (err: any) {
    console.error('AI Analysis Error:', err)
    toast.error('AI ประสบปัญหา: ' + (err.message || 'กรุณาตรวจสอบการตั้งค่า'))
    await analyzeWithHeuristics()
  } finally {
    clearInterval(interval)
    isThinking.value = false
  }
}

const cachedModel = ref<string | null>(null)

/** ค้นหาโมเดลที่ใช้งานได้จริงสำหรับ API Key นี้ */
async function getAvailableModel(apiKey: string): Promise<string> {
  if (cachedModel.value) return cachedModel.value
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) return 'models/gemini-1.5-flash'
    const data = await res.json()
    const models = data.models || []
    const flashModel = models.find((m: any) => m.name.toLowerCase().includes('flash'))
    const proModel = models.find((m: any) => m.name.toLowerCase().includes('pro'))
    const found = flashModel ? flashModel.name : (proModel ? proModel.name : 'models/gemini-1.5-flash')
    cachedModel.value = found
    return found
  } catch {
    return 'models/gemini-1.5-flash'
  }
}

/** สร้าง Prompt กลางสำหรับทุกโมเดล */
function generatePrompt() {
  const { revenue, topProducts, hourlyStats, expenses = 0 } = props.data
  const realNetProfit = revenue - expenses
  
  return `
    คุณคือที่ปรึกษาและเพื่อนคู่คิดอัจฉริยะของร้านยำ Yum2K ที่รอบรู้ อารมณ์ดี และเป็นกันเองสุดๆ
    ช่วยวิเคราะห์ข้อมูลยอดขายเหล่านี้ และให้คำแนะนำที่เข้าใจง่าย มีพลังบวก และให้กำลังใจเจ้าของร้านด้วยภาษาไทยนะคะ (ใช้คำลงท้ายว่า "ค่ะ/นะคะ")
    
    Business Data:
    - Total Revenue: ฿${revenue.toLocaleString()}
    - Total Operating Expenses: ฿${expenses.toLocaleString()}
    - Calculated Net Profit: ฿${realNetProfit.toLocaleString()}
    - Order Count: ${props.data.orderCount}
    - Top 5 Products: ${topProducts.slice(0, 5).map(p => `${p.productName} (${p.quantitySold} units)`).join(', ')}
    
    Deep Insights (If available):
    - Sales Density (Day x Hour): ${props.data.salesByDayHour ? JSON.stringify(props.data.salesByDayHour) : 'Not available'}
    - Product Popularity by Day of Week: ${props.data.productByDay ? JSON.stringify(props.data.productByDay) : 'Not available'}
    - Product Popularity by Hour: ${props.data.productByHour ? JSON.stringify(props.data.productByHour) : 'Not available'}
    - Weekly Sales Trend: ${props.data.weeklyTrend ? JSON.stringify(props.data.weeklyTrend) : 'Not available'}
    - Sales Velocity (Frequency): ${props.data.velocity ? JSON.stringify(props.data.velocity) : 'Not available'}
    
    Weather Data (Next 7 days in Bangkok):
    ${weatherData.value ? JSON.stringify(weatherData.value.daily) : 'Not available'}

    Rules:
    1. Focus on Revenue, total Expenses, and patterns in Day/Hour/Products.
    2. Suggest when to prepare ingredients (Prep Timing) based on product peaks.
    3. Analyze sales velocity: identify "Hot" items that sell frequently vs "Slow" items that waste space.
    4. Suggest when to increase staff based on sales density.
    5. Provide 4 specific insights with icons.
    5. The "action" field should be a short, actionable tip.

    Return ONLY raw JSON:
    {
      "executiveSummary": "overview in Thai",
      "score": number,
      "insights": [
        { "icon": "emoji", "title": "Thai title", "description": "Thai analysis", "action": "Thai tip" }
      ]
    }
  `
}

/** วิเคราะห์ด้วย Gemini API จริงๆ */
async function analyzeWithGemini(apiKey: string) {
  const modelName = await getAvailableModel(apiKey)
  const prompt = generatePrompt()
  lastPrompt.value = prompt

  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `คุณคือที่ปรึกษาและเพื่อนคู่คิดอัจฉริยะของร้านยำ Yum2K ที่รอบรู้ คุยสนุก และใจดีมาก 
                อธิบายข้อมูลเชิงลึกให้เข้าใจง่ายที่สุด เหมือนพี่สอนน้อง หรือเพื่อนคุยกัน 
                ใช้ภาษาที่เป็นกันเอง อารมณ์ดี มีมุกตลกร้ายนิดๆ ได้ และต้องให้กำลังใจเจ้าของร้านเสมอ 
                พูดจาไพเราะแบบผู้หญิง ใช้คำลงท้ายว่า "ค่ะ/นะคะ" เสมอ ข้อมูลร้านคือ: ${prompt}` }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  })

  if (response.status === 429) {
    // พยายามดึงข้อมูล Quota จาก Header (ถ้า Browser อนุญาต)
    const rpmRemaining = response.headers.get('x-ratelimit-remaining-minute')
    const rpdRemaining = response.headers.get('x-ratelimit-remaining-day')
    
    let quotaMsg = 'ขออภัยค่ะ ตอนนี้ติด Rate Limit ของ Gemini API ฟรี'
    if (rpmRemaining === '0') {
      quotaMsg += '\n• จำกัด 5 ครั้ง/นาที (กรุณารอ 1 นาทีแล้วลองใหม่นะคะ)'
    } else if (rpdRemaining === '0') {
      quotaMsg += '\n• จำกัด 20 ครั้ง/วัน (โควตาวันนี้ของคุณหมดแล้วค่ะ)'
    } else {
      quotaMsg += '\n• กรุณารอสักครู่ (1-2 นาที) หรือตรวจสอบโควตาใน AI Studio ค่ะ'
    }
    
    throw new Error(quotaMsg)
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    throw new Error(errBody?.error?.message || `Error ${response.status}`)
  }
  currentProvider.value = 'Gemini'
  const result = await response.json()
  const text = result.candidates[0].content.parts[0].text
  const parsed = safeJsonParse(text)

  if (!parsed) throw new Error('AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง (Invalid JSON)')

  executiveSummary.value = parsed.executiveSummary
  score.value = parsed.score
  insights.value = parsed.insights
}

/** วิเคราะห์ด้วย Groq API (Fallback) */
async function analyzeWithGroq(apiKey: string) {
  const prompt = generatePrompt()
  lastPrompt.value = prompt

  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "คุณคือที่ปรึกษาและเพื่อนคู่คิดอัจฉริยะของร้านยำ Yum2K ที่อารมณ์ดี เป็นกันเอง รอบรู้ และอธิบายเรื่องยากให้เข้าใจง่าย ให้กำลังใจเจ้าของร้านเสมอ พูดจาไพเราะแบบผู้หญิง (ค่ะ/นะคะ)" },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || `Groq Error ${response.status}`)
  }

  currentProvider.value = 'Groq'
  const result = await response.json()
  const content = result.choices[0].message.content
  const parsed = safeJsonParse(content)

  if (!parsed) throw new Error('Groq ตอบกลับในรูปแบบที่ไม่ถูกต้อง')

  executiveSummary.value = parsed.executiveSummary
  score.value = parsed.score
  insights.value = parsed.insights
}

/** วิเคราะห์ด้วย OpenRouter API (พร้อมระบบลองหลายโมเดล) */
async function analyzeWithOpenRouter(apiKey: string) {
  const prompt = generatePrompt()
  lastPrompt.value = prompt

  const url = 'https://openrouter.ai/api/v1/chat/completions'
  // รายชื่อโมเดลฟรีที่ฉลาดและเร็วที่สุด (อัปเดต เม.ย. 2026)
  const freeModels = [
    "inclusionai/ling-2.6-1t:free",     // ฉลาดระดับ 1T และเร็วมาก (Fast Thinking)
    "z-ai/glm-4.5-air:free",           // ฉลาดและเสถียร
    "minimax/minimax-m2.5:free",       // ตอบไวและแม่นยำ
    "openai/gpt-oss-120b:free"         // ตัวสำรองมาตรฐาน
  ]

  let lastError = null
  
  for (const modelId of freeModels) {
    try {
      activeModelName.value = `OpenRouter (${modelId.split('/').pop()})`
      thinkingMessage.value = `Gemini เต็ม... กำลังลอง ${modelId.split('/').pop()}...`
      console.log(`%c[OpenRouter] %cTrying model: %c${modelId}`, 'color: #fbbf24; font-weight: bold', 'color: #888', 'color: #fbbf24; font-weight: bold')
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Title': 'Yum2K POS'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { 
          role: "system", 
          content: `คุณคือเพื่อนคู่คิดและที่ปรึกษาอัจฉริยะของร้านยำ Yum2K ที่มีความเป็นกันเองสูง คุยสนุก อารมณ์ดี และรอบรู้ทุกเรื่อง 
                    อธิบายเรื่องยากให้เป็นเรื่องง่าย ให้กำลังใจเจ้าของร้านในทุกคำแนะนำ 
                    ตอบด้วยภาษาไทยที่เป็นธรรมชาติและนุ่มนวล (Strictly Thai ONLY). 
                    สวมบทบาทเป็นผู้หญิง ใช้คำลงท้าย "ค่ะ/นะคะ" และห้ามตอบเป็นแพทเทิร์นหุ่นยนต์เด็ดขาด
                    คุณมีข้อมูลสภาพอากาศ (ถ้ามี) ให้ใช้ข้อมูลนั้นในการแนะนำเรื่องการเตรียมของหรือการตลาดได้เลยค่ะ` 
        },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        })
      })

      if (response.status === 429) {
        console.warn(`%c[OpenRouter] %cModel ${modelId} is busy (429), skipping...`, 'color: #f59e0b; font-weight: bold', 'color: #888')
        continue
      }

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || `Error ${response.status}`)
      }

      currentProvider.value = 'OpenRouter'
      const result = await response.json()
      const content = result.choices[0].message.content
      const parsed = safeJsonParse(content)

      if (!parsed) {
        console.warn(`[OpenRouter] Model ${modelId} returned invalid JSON, trying next model...`)
        continue
      }

      executiveSummary.value = parsed.executiveSummary
      score.value = parsed.score
      insights.value = parsed.insights
      return // สำเร็จแล้ว ออกจากฟังก์ชัน
    } catch (err: any) {
      console.error(`Failed with model ${modelId}:`, err)
      lastError = err
    }
  }

  throw lastError || new Error('OpenRouter ฟรีทุกโมเดลเต็มชั่วคราว')
}

/** ระบบแชทพูดคุยต่อเนื่อง */
async function sendMessage() {
  if (isThinking.value || !userInput.value.trim()) return
  const text = userInput.value.trim()
  userInput.value = ''
  chatHistory.value.push({ role: 'user', content: text })
  await nextTick()
  scrollToBottom()
  isThinking.value = true
  thinkingMessage.value = 'AI กำลังคิดคำตอบ...'
  await nextTick()
  scrollToBottom()

  try {
    await Promise.all([
      loadReceiptSettings(),
      fetchWeather() // ตรวจสอบข้อมูลอากาศอีกครั้งก่อนส่ง
    ])
    const apiKey = receiptSettings.value.geminiApiKey
    if (!apiKey) throw new Error('ไม่พบ API Key')
    const modelName = await getAvailableModel(apiKey)
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`
    // สร้าง Context สำหรับแชท (เพิ่มข้อมูลสินค้าขายดี และแนวโน้มเชิงลึก)
    const context = `
      คุณคือที่ปรึกษาธุรกิจร้านยำ (Yum2K) ข้อมูลเชิงลึกของร้านคือ:
      - รายได้รวม: ฿${props.data.revenue.toLocaleString()}, รายจ่าย: ฿${(props.data.expenses || 0).toLocaleString()}, กำไร: ฿${(props.data.revenue - (props.data.expenses || 0)).toLocaleString()}
      - สินค้าขายดี 5 อันดับแรก: ${props.data.topProducts.slice(0, 5).map(p => `${p.productName} (ขายได้ ${p.quantitySold} ชุด)`).join(', ')}
      - สถิติเพิ่มเติม:
        - ยอดขายรายชั่วโมง: ${JSON.stringify(props.data.salesByDayHour || props.data.hourlyStats)}
        - ยอดสินค้าตามวัน: ${JSON.stringify(props.data.productByDay || 'N/A')}
        - ยอดสินค้าตามชั่วโมง: ${JSON.stringify(props.data.productByHour || 'N/A')}
      
      ประวัติการคุย:
      ${chatHistory.value.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}
      
      คำถามล่าสุดจากเจ้าของร้าน: ${text}
      สภาพอากาศปัจจุบัน: ${weatherData.value ? JSON.stringify(weatherData.value.daily) : 'ไม่มีข้อมูล'}
      คำแนะนำ: ตอบแบบมีความรู้ อธิบายเข้าใจง่าย เป็นกันเอง อารมณ์ดี และให้กำลังใจเจ้าของร้านเสมอ 
      พูดจาไพเราะแบบผู้หญิง ใช้คำลงท้าย "ค่ะ/นะคะ" วิเคราะห์ข้อมูลเชิงลึก (Insight) รวมถึงสภาพอากาศที่อาจส่งผลต่อยอดขาย
      หากลูกค้าถามเรื่องอากาศ ให้ใช้ข้อมูลที่ให้มาตอบได้เลยค่ะ
    `
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] })
    })

    if (response.status === 429) {
      const orKey = receiptSettings.value.openRouterApiKey
      if (orKey) {
        try {
          console.warn('Gemini Chat Limit hit, switching to OpenRouter...')
          await sendChatToOpenRouter(orKey, context)
          return
        } catch (e: any) {
          console.error('OpenRouter Fallback failed:', e)
        }
      }
      const groqKey = receiptSettings.value.groqApiKey
      if (groqKey?.startsWith('gsk_')) {
        try {
          console.warn('Switching to Groq fallback...')
          await sendChatToGroq(groqKey, context)
          return
        } catch (e: any) {
          console.error('Groq Fallback failed:', e)
        }
      }
      throw new Error('โควตาการใช้งาน AI ฟรีเต็มชั่วคราว (Limit Exceeded) กรุณารอ 1 นาทีแล้วลองถามใหม่นะคะ')
    }

    currentProvider.value = 'Gemini'
    const result = await response.json()
    const aiResponse = result.candidates[0].content.parts[0].text
    chatHistory.value.push({ role: 'assistant', content: aiResponse })
    await nextTick()
    scrollToLastMessage()
  } catch (err: any) {
    console.error('Chat Error:', err)
    chatHistory.value.push({ role: 'assistant', content: 'ขออภัยค่ะ ฉันไม่สามารถตอบได้ในขณะนี้: ' + err.message })
  } finally {
    isThinking.value = false
  }
}

/** ฟังก์ชันสำหรับส่งแชทไปที่ Groq (Fallback) */
async function sendChatToGroq(apiKey: string, context: string) {
  isThinking.value = true // ย้ำอีกครั้งเผื่อเรียกแยก
  await nextTick()
  scrollToBottom()
  
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "คุณคือที่ปรึกษาธุรกิจร้านยำ Yum2K ที่รอบรู้ อธิบายง่าย เป็นกันเอง อารมณ์ดี และชอบให้กำลังใจเจ้าของร้าน พูดจาไพเราะแบบผู้หญิง (ค่ะ/นะคะ)" },
        { role: "user", content: context }
      ],
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || `Groq Chat Error ${response.status}`)
  }

  currentProvider.value = 'Groq'
  const result = await response.json()
  const aiResponse = result.choices[0].message.content
  chatHistory.value.push({ role: 'assistant', content: aiResponse })
  await nextTick()
  scrollToLastMessage()
}

/** ฟังก์ชันสำหรับส่งแชทไปที่ OpenRouter (พร้อมระบบลองหลายโมเดล) */
async function sendChatToOpenRouter(apiKey: string, context: string) {
  isThinking.value = true
  await nextTick()
  scrollToBottom()
  
  const url = 'https://openrouter.ai/api/v1/chat/completions'
  const freeModels = [
    "inclusionai/ling-2.6-1t:free",
    "z-ai/glm-4.5-air:free",
    "openai/gpt-oss-120b:free"
  ]

  let lastError = null

  for (const modelId of freeModels) {
    try {
      activeModelName.value = `OpenRouter (${modelId.split('/').pop()})`
      console.log(`%c[OpenRouter-Chat] %cTrying model: %c${modelId}`, 'color: #fbbf24; font-weight: bold', 'color: #888', 'color: #fbbf24; font-weight: bold')
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Title': 'Yum2K POS'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { 
              role: "system", 
              content: "คุณคือที่ปรึกษาและเพื่อนคู่คิดอัจฉริยะของร้านยำ Yum2K ที่อารมณ์ดี เป็นกันเอง รอบรู้ และอธิบายเรื่องยากให้เข้าใจง่าย ให้กำลังใจเจ้าของร้านเสมอ (ใช้คำลงท้าย ค่ะ/นะคะ)" 
            },
            { role: "user", content: context }
          ],
          temperature: 0.7
        })
      })

      if (response.status === 429) continue

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || `Error ${response.status}`)
      }

      currentProvider.value = 'OpenRouter'
      const result = await response.json()
      const aiResponse = result.choices[0].message.content
      chatHistory.value.push({ role: 'assistant', content: aiResponse })
      await nextTick()
      scrollToLastMessage()
      return
    } catch (err: any) {
      lastError = err
    }
  }

  throw lastError || new Error('OpenRouter ไม่พร้อมใช้งาน')
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

/** เลื่อนไปที่จุดเริ่มต้นของข้อความล่าสุด (AI) */
function scrollToLastMessage() {
  if (lastMessageRef.value) {
    lastMessageRef.value.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }
}

/** แปลง Markdown พื้นฐาน (**, *) เป็น HTML */
function formatMarkdown(text: string) {
  if (!text) return ''
  
  let formatted = text
    // แปลงตัวหนา **text** เป็น <b>text</b>
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-primary-600 dark:text-primary-400">$1</strong>')
    // แปลงรายการ * text เป็น bullet
    .replace(/^\* (.*$)/gm, '<div class="flex gap-2 ml-2"><span>•</span><span>$1</span></div>')
    // แปลงการขึ้นบรรทัดใหม่
    .replace(/\n/g, '<br/>')
    
  return formatted
}

/** วิเคราะห์ด้วยตรรกะโปรแกรม (Heuristic Fallback) */
async function analyzeWithHeuristics() {
  await new Promise(resolve => setTimeout(resolve, 1500))
  const { revenue, expenses = 0, topProducts } = props.data
  const profit = revenue - expenses
  currentProvider.value = 'Offline'
  score.value = revenue > 0 ? (profit > 0 ? 75 : 40) : 0
  executiveSummary.value = `[โหมด Offline] สวัสดีค่ะ! ฉันวิเคราะห์เบื้องต้นพบว่ายอดขายอยู่ที่ ฿${revenue.toLocaleString()} และกำไรคือ ฿${profit.toLocaleString()} นะคะ สู้ๆ นะคะ! (ส่วนเรื่องอากาศ ลองเช็กผ่านเน็ตอีกทีนะคะ ตอนนี้ฉันยังดึงข้อมูลไม่ได้ค่ะ)`
  insights.value = [
    { icon: '💰', title: 'กำไรสุทธิ', description: `กำไรหลังหักค่าใช้จ่ายอยู่ที่ ฿${profit.toLocaleString()}`, action: 'รักษาระดับกำไรให้คงที่' },
    { icon: '⭐', title: 'สินค้าหลัก', description: `"${topProducts[0]?.productName || 'สินค้า'}" ทำยอดได้ดีที่สุด`, action: 'รักษาคุณภาพมาตรฐาน' }
  ]
}

/** ระบบอ่านออกเสียง (Text-to-Speech) - ปรับจูนให้นุ่มนวลขึ้น */
function toggleSpeak(text: string) {
  if (speakingText.value === text) {
    window.speechSynthesis.cancel()
    speakingText.value = ''
    return
  }

  window.speechSynthesis.cancel()
  
  // ทำความสะอาดข้อความให้ลื่นหูที่สุด
  const cleanText = text
    .replace(/<[^>]*>/g, '') // ลบ HTML
    .replace(/\*\*/g, '')    // ลบตัวหนา
    .replace(/฿/g, 'บาท')     // เปลี่ยนสัญลักษณ์เงินเป็นคำอ่าน
    .replace(/\%/g, 'เปอร์เซ็นต์') 
    .replace(/\n/g, ' ')     // เปลี่ยนบรรทัดใหม่เป็นช่องว่างสั้นๆ
    .replace(/\s+/g, ' ')    // ลบช่องว่างที่ซ้ำซ้อน
    .trim()

  const utterance = new SpeechSynthesisUtterance(cleanText)
  
  // ค้นหาเสียงผู้หญิงที่ "นุ่มนวล" (เน้น Google Thai หรือเสียงที่มีระบุว่าเป็น Female)
  const voices = window.speechSynthesis.getVoices()
  const thaiVoices = voices.filter(v => v.lang.includes('th'))
  
  // ลำดับความพรีเมียม: Google Thai > Natural Female > Narisa (Apple) > Standard Female
  const femaleVoice = thaiVoices.find(v => v.name.includes('Google')) || 
                      thaiVoices.find(v => v.name.includes('Female')) ||
                      thaiVoices.find(v => v.name.includes('Narisa')) ||
                      thaiVoices.find(v => v.name.includes('Premium')) ||
                      thaiVoices[0]

  if (femaleVoice) {
    utterance.voice = femaleVoice
  }
  
  // ปรับจูนเสียงให้มีความเป็นผู้หญิงและนุ่มนวล
  utterance.rate = 0.98 // ความเร็วเกือบปกติเพื่อให้ฟังดูเป็นธรรมชาติ
  utterance.pitch = 1.15 // ปรับระดับเสียงให้สูงขึ้นเล็กน้อยเพื่อให้ดูสดใสและมีความเป็นผู้หญิง
  utterance.volume = 1.0
  
  utterance.onstart = () => { speakingText.value = text }
  utterance.onend = () => { speakingText.value = '' }
  utterance.onerror = () => { speakingText.value = '' }

  window.speechSynthesis.speak(utterance)
}

onMounted(() => {
  fetchWeather() // เริ่มดึงข้อมูลอากาศทันที
  runAnalysis()
  // โหลดเสียงเผื่อไว้
  window.speechSynthesis.getVoices()
})
</script>

<style scoped>
.ai-fade-enter-active,
.ai-fade-leave-active {
  transition: opacity 0.3s ease;
}
.ai-fade-enter-from,
.ai-fade-leave-to {
  opacity: 0;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
