<template>
  <!-- ซ่อนทันทีถ้าโหลดไม่สำเร็จหรือ offline -->
  <Transition name="weather-fade">
    <div v-if="weather" class="relative">
      <!-- ===== Badge หลัก (กดเพื่อเปิด/ปิด tooltip) ===== -->
      <button
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all select-none"
        :class="badgeClass"
        title="พยากรณ์อากาศวันนี้"
        @click.stop="showDetail = !showDetail"
      >
        <span v-if="isLoading" class="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        <span v-else class="text-base leading-none">{{ weather.emoji }}</span>
        <span>{{ weather.temp }}°C</span>
        <span class="opacity-70 hidden sm:inline">{{ weather.label }}</span>
      </button>

      <!-- ===== Tooltip รายละเอียด ===== -->
      <Transition name="detail-pop">
        <div
          v-if="showDetail"
          class="absolute left-0 top-full mt-2 z-[210] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl text-[11px] overflow-hidden"
          :class="showForecast ? 'w-72' : 'w-56'"
          @click.stop
        >

          <!-- ===== ส่วน Current (เสมอ) ===== -->
          <div class="p-3 space-y-2">
            <!-- หัวข้อ current -->
            <div class="flex items-center gap-2 pb-2 border-b border-surface-800">
              <span class="text-2xl">{{ weather.emoji }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <div class="font-black text-surface-50 text-sm">{{ weather.label }}</div>
                  <span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 uppercase tracking-wide">ขณะนี้</span>
                </div>
                <div class="text-surface-400">{{ weather.temp }}°C · รู้สึกเหมือน {{ weather.feelsLike }}°C</div>
              </div>
            </div>

            <!-- รายละเอียด current -->
            <div class="grid grid-cols-2 gap-1.5">
              <div class="flex items-center gap-1.5 bg-surface-800/60 rounded-lg px-2 py-1.5">
                <span>💧</span>
                <div>
                  <div class="text-surface-400 text-[9px] uppercase">ความชื้น</div>
                  <div class="font-bold text-surface-50">{{ weather.humidity }}%</div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 bg-surface-800/60 rounded-lg px-2 py-1.5">
                <span>💨</span>
                <div>
                  <div class="text-surface-400 text-[9px] uppercase">ลม</div>
                  <div class="font-bold text-surface-50">{{ weather.windSpeed }} km/h</div>
                </div>
              </div>
              <div v-if="weather.isRain" class="col-span-2 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1.5">
                <span>🌧️</span>
                <div>
                  <div class="text-blue-400 text-[9px] uppercase">ปริมาณฝน</div>
                  <div class="font-bold text-blue-300">{{ weather.precipitation }} mm</div>
                </div>
              </div>
            </div>

            <!-- คำแนะนำร้านยำ -->
            <div class="text-[10px] text-surface-500 border-t border-surface-800 pt-2">
              <span v-if="weather.isRain">🍜 วันนี้ฝนตก ยำร้อนๆ ขายดีแน่นอนค่ะ!</span>
              <span v-else-if="weather.isHot">🌶️ อากาศร้อน น้ำเย็นและยำเปรี้ยวขายดีวันนี้!</span>
              <span v-else>✅ อากาศดี ลูกค้าออกมาเที่ยวเยอะค่ะ</span>
            </div>

            <!-- ปุ่มดูเพิ่มเติม -->
            <button
              class="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all"
              :class="showForecast
                ? 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                : 'bg-surface-800/60 text-surface-400 border-surface-700/50 hover:bg-surface-800 hover:text-surface-200'"
              @click.stop="showForecast = !showForecast"
            >
              <span>{{ showForecast ? '▲ ซ่อน' : '▼ ดูพยากรณ์ 7 วัน' }}</span>
            </button>
          </div>

          <!-- ===== ส่วน 7-Day Forecast (toggle) ===== -->
          <Transition name="forecast-slide">
            <div v-if="showForecast" class="border-t border-surface-800">
              <!-- header -->
              <div class="px-3 pt-2 pb-1 flex items-center justify-between">
                <span class="text-[9px] font-bold text-surface-500 uppercase tracking-widest">พยากรณ์ 8 วัน</span>
                <span class="text-[8px] text-surface-600">(คาดการณ์ทั้งวัน)</span>
              </div>

              <!-- รายการแต่ละวัน -->
              <div class="divide-y divide-surface-800/60">
                <div
                  v-for="(day, i) in weather.forecast"
                  :key="day.date"
                  class="flex items-center gap-2 px-3 py-2 transition-colors"
                  :class="[
                    i === 0 ? 'bg-primary-500/5' : 'hover:bg-surface-800/30',
                  ]"
                >
                  <!-- วัน -->
                  <div class="w-10 shrink-0">
                    <div
                      class="text-[10px] font-bold"
                      :class="i === 0 ? 'text-primary-400' : 'text-surface-300'"
                    >{{ day.dayLabel }}</div>
                    <div class="text-[8px] text-surface-600">{{ formatDate(day.date) }}</div>
                  </div>

                  <!-- emoji -->
                  <span class="text-lg shrink-0">{{ day.emoji }}</span>

                  <!-- label อากาศ -->
                  <div class="flex-1 min-w-0">
                    <div
                      class="text-[10px] font-medium truncate"
                      :class="day.isRain ? 'text-blue-400' : 'text-surface-300'"
                    >{{ day.label }}</div>
                    <div v-if="day.precipitation > 0" class="text-[9px] text-blue-400/70">
                      🌧️ {{ day.precipitation }} mm
                    </div>
                  </div>

                  <!-- อุณหภูมิ max/min -->
                  <div class="text-right shrink-0">
                    <span class="font-black text-surface-50 text-[11px]">{{ day.tempMax }}°</span>
                    <span class="text-surface-500 text-[10px] ml-1">{{ day.tempMin }}°</span>
                  </div>
                </div>
              </div>

              <!-- แหล่งข้อมูล -->
              <div class="px-3 py-2 text-[9px] text-surface-600 flex items-center gap-1 border-t border-surface-800">
                <span>📍</span>
                <span>{{ weather.usingFallback ? 'ซอยกุศลศิลป์ 2 (ค่าเริ่มต้น)' : 'ตำแหน่งของคุณ' }}</span>
                <span class="ml-auto opacity-50">Open-Meteo</span>
              </div>
            </div>
          </Transition>

          <!-- แหล่งข้อมูล (เมื่อ forecast ปิด) -->
          <div v-if="!showForecast" class="px-3 pb-2 text-[9px] text-surface-600 flex items-center gap-1">
            <span>📍</span>
            <span>{{ weather.usingFallback ? 'ซอยกุศลศิลป์ 2 (ค่าเริ่มต้น)' : 'ตำแหน่งของคุณ' }}</span>
          </div>
        </div>
      </Transition>

      <!-- Overlay ปิด Tooltip — ใช้ Teleport ออกไป body เพื่อหลีกเลี่ยง event bubbling -->
      <Teleport to="body">
        <div
          v-if="showDetail"
          class="fixed inset-0 z-[200]"
          @click="showDetail = false; showForecast = false"
        />
      </Teleport>
    </div>

    <!-- Loading state ก่อนที่จะมีข้อมูล -->
    <div v-else-if="isLoading" class="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] border border-surface-700/40 text-surface-500">
      <span class="w-3 h-3 border-2 border-surface-600/40 border-t-surface-500 rounded-full animate-spin" />
      <span>กำลังโหลด...</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useWeather } from '~/composables/useWeather'
import { useSync } from '~/composables/useSync'

const { weather, isLoading, fetchWeatherData } = useWeather()
const { isOnline } = useSync()
const showDetail = ref(false)
const showForecast = ref(false)

// Badge color ตามสภาพอากาศ
const badgeClass = computed(() => {
  if (!weather.value) return ''
  if (weather.value.isRain) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
  }
  if (weather.value.isHot) {
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
  }
  return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
})

/** แปลง YYYY-MM-DD → "15/5" */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// ดึงข้อมูลเมื่อ online
onMounted(async () => {
  if (isOnline.value) {
    await fetchWeatherData()
  }
})

// ดึงใหม่เมื่อ online กลับมา
watch(isOnline, async (online) => {
  if (online && !weather.value) {
    await fetchWeatherData()
  }
})
</script>

<style scoped>
.weather-fade-enter-active,
.weather-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.weather-fade-enter-from,
.weather-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.detail-pop-enter-active,
.detail-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.detail-pop-enter-from,
.detail-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

.forecast-slide-enter-active,
.forecast-slide-leave-active {
  transition: opacity 0.25s ease, max-height 0.3s ease;
  overflow: hidden;
  max-height: 400px;
}
.forecast-slide-enter-from,
.forecast-slide-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
