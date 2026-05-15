// =============================================================================
// composables/useWeather.ts
// ดึงข้อมูลพยากรณ์อากาศวันนี้ + 7 วันข้างหน้า จาก Open-Meteo (ฟรี ไม่ต้อง API Key)
// - ใช้ GPS จริงก่อน → fallback ร้าน Mini Big C ซอยกุศลศิลป์ 2
// - Cache 30 นาทีเพื่อไม่ดึงซ้ำทุก render
// =============================================================================

export interface WeatherData {
  temp: number           // อุณหภูมิ °C
  feelsLike: number      // อุณหภูมิรู้สึกเหมือน °C
  humidity: number       // ความชื้น %
  windSpeed: number      // ความเร็วลม km/h
  precipitation: number  // ปริมาณน้ำฝน mm (ปัจจุบัน)
  weatherCode: number    // WMO weather code
  emoji: string          // อีโมจิสภาพอากาศ
  label: string          // ข้อความไทย
  isRain: boolean        // กำลังฝนตก
  isHot: boolean         // อากาศร้อน (>= 35°C)
  fetchedAt: number      // timestamp ที่ดึง
  usingFallback: boolean // ใช้ตำแหน่ง fallback หรือไม่
  forecast: ForecastDay[] // พยากรณ์ 8 วัน (วันนี้ + 7 วัน)
}

export interface ForecastDay {
  date: string    // YYYY-MM-DD
  dayLabel: string // "วันนี้" / "พรุ่งนี้" / "จ." เป็นต้น
  tempMax: number
  tempMin: number
  precipitation: number
  weatherCode: number
  emoji: string
  label: string
  isRain: boolean
}

// ===== ค่า Default Location: Mini Big C ซอยกุศลศิลป์ 2 =====
const DEFAULT_LAT = 13.6764545
const DEFAULT_LNG = 100.5984605
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 นาที

// ===== Singleton State =====
const weather = ref<WeatherData | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// ===== WMO Weather Code → emoji + label =====
export function mapWeatherCode(code: number): { emoji: string; label: string; isRain: boolean } {
  if (code === 0)                return { emoji: '☀️',  label: 'แจ่มใส',             isRain: false }
  if (code === 1)                return { emoji: '🌤️', label: 'แจ่มใสเป็นส่วนใหญ่', isRain: false }
  if (code === 2)                return { emoji: '⛅',  label: 'มีเมฆบางส่วน',       isRain: false }
  if (code === 3)                return { emoji: '☁️',  label: 'เมฆมาก',              isRain: false }
  if (code >= 45 && code <= 48) return { emoji: '🌫️', label: 'หมอก',                isRain: false }
  if (code >= 51 && code <= 55) return { emoji: '🌦️', label: 'ฝนปรอย',              isRain: true  }
  if (code >= 56 && code <= 57) return { emoji: '🌧️', label: 'ฝนปรอยน้ำแข็ง',     isRain: true  }
  if (code >= 61 && code <= 65) return { emoji: '🌧️', label: 'ฝนตก',                isRain: true  }
  if (code >= 71 && code <= 77) return { emoji: '❄️',  label: 'หิมะ',                isRain: false }
  if (code >= 80 && code <= 82) return { emoji: '🌧️', label: 'ฝนหนัก',              isRain: true  }
  if (code >= 85 && code <= 86) return { emoji: '🌨️', label: 'หิมะหนัก',            isRain: false }
  if (code >= 95 && code <= 99) return { emoji: '⛈️',  label: 'พายุฝนฟ้าคะนอง',    isRain: true  }
  return { emoji: '🌡️', label: 'ไม่ทราบ', isRain: false }
}

// ===== Thai day short label =====
const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'วันนี้'
  if (index === 1) return 'พรุ่งนี้'
  const d = new Date(dateStr)
  return THAI_DAY_SHORT[d.getDay()] ?? dateStr
}

/** ขอ GPS จาก Browser (timeout 5 วินาที) */
function getCurrentPosition(): Promise<{ lat: number; lng: number; fallback: boolean }> {
  return new Promise((resolve) => {
    if (!import.meta.client || !navigator.geolocation) {
      resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, fallback: true })
      return
    }

    const timer = setTimeout(() => {
      resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, fallback: true })
    }, 5000)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, fallback: false })
      },
      () => {
        clearTimeout(timer)
        resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, fallback: true })
      },
      { timeout: 5000, maximumAge: 10 * 60 * 1000 }
    )
  })
}

/** ดึงข้อมูลอากาศจาก Open-Meteo (current + 8 วันของ daily) */
async function fetchWeatherData() {
  // ถ้ามี cache ยังไม่หมดอายุ ใช้ cache เดิม
  if (weather.value && Date.now() - weather.value.fetchedAt < CACHE_TTL_MS) return

  if (isLoading.value) return
  isLoading.value = true
  error.value = null

  try {
    const { lat, lng, fallback } = await getCurrentPosition()

    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', lat.toString())
    url.searchParams.set('longitude', lng.toString())
    // current weather
    url.searchParams.set('current', [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(','))
    // daily forecast 8 วัน (วันนี้ + 7)
    url.searchParams.set('daily', [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
    ].join(','))
    url.searchParams.set('timezone', 'Asia/Bangkok')
    url.searchParams.set('forecast_days', '8')

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`)

    const data = await res.json()
    const c = data.current
    const d = data.daily

    // ===== Current =====
    const code: number = c.weather_code ?? 0
    const temp: number = Math.round(c.temperature_2m ?? 0)
    const { emoji, label, isRain } = mapWeatherCode(code)

    // ===== Daily Forecast =====
    const forecast: ForecastDay[] = (d.time as string[]).map((dateStr: string, i: number) => {
      const wCode: number = d.weather_code[i] ?? 0
      const { emoji: fEmoji, label: fLabel, isRain: fRain } = mapWeatherCode(wCode)
      return {
        date: dateStr,
        dayLabel: getDayLabel(dateStr, i),
        tempMax: Math.round(d.temperature_2m_max[i] ?? 0),
        tempMin: Math.round(d.temperature_2m_min[i] ?? 0),
        precipitation: d.precipitation_sum[i] ?? 0,
        weatherCode: wCode,
        emoji: fEmoji,
        label: fLabel,
        isRain: fRain,
      }
    })

    weather.value = {
      temp,
      feelsLike: Math.round(c.apparent_temperature ?? temp),
      humidity: Math.round(c.relative_humidity_2m ?? 0),
      windSpeed: Math.round(c.wind_speed_10m ?? 0),
      precipitation: c.precipitation ?? 0,
      weatherCode: code,
      emoji,
      label,
      isRain,
      isHot: temp >= 35,
      fetchedAt: Date.now(),
      usingFallback: fallback,
      forecast,
    }
  } catch (err: any) {
    console.warn('[Weather] ดึงข้อมูลไม่สำเร็จ:', err?.message)
    error.value = 'ไม่สามารถดึงข้อมูลอากาศได้'
  } finally {
    isLoading.value = false
  }
}

export function useWeather() {
  return { weather, isLoading, error, fetchWeatherData }
}
