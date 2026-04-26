// =============================================================================
// composables/useReports.ts
// Composable สำหรับดึงและคำนวณข้อมูลแดชบอร์ด (Reports & Analytics)
// =============================================================================

import { db } from '~/db'
import type { Order } from '~/types'

export interface DailySummary {
  revenue: number
  cost: number
  profit: number
  orderCount: number
}

export interface TopProductMetric {
  productId: number
  productName: string
  quantitySold: number
  totalRevenue: number
  totalProfit: number
}

/** แถวข้อมูลสำหรับ Product Heatmap (สินค้า × วัน หรือ × ชั่วโมง) */
export interface ProductHeatmapRow {
  productName: string
  totalQty: number
  data: Record<number, number>  // key = dayIndex (0=Mon) หรือ hour
}

/** ข้อมูล Weekly Trend (4 สัปดาห์) */
export interface WeeklyTrendData {
  weeks: string[]
  series: { name: string; data: number[] }[]
}

/** ความเร็วในการขายของสินค้าแต่ละรายการ */
export interface VelocityMetric {
  productName: string
  totalQty: number
  totalRevenue: number
  daysActive: number
  totalDays: number
  avgQtyPerActiveDay: number
  velocityRate: number
  badge: 'hot' | 'good' | 'slow' | 'dead'
}

export function useReports() {

  /**
   * สร้างสรุปยอดขายรายวัน (สำหรับ Range วันที่กำหนด หรือวันนี้)
   */
  async function getSummary(startDate: Date, endDate: Date): Promise<DailySummary> {
    const orders = await db.orders
      .where('createdAt')
      .between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    let revenue = 0, cost = 0, profit = 0
    for (const order of orders) {
      revenue += order.totalAmount
      cost += order.totalCost
      profit += order.profitAmount
    }
    return { revenue, cost, profit, orderCount: orders.length }
  }

  /**
   * หารายการสินค้าที่ขายดีที่สุดในช่วงเวลา
   */
  async function getTopProducts(startDate: Date, endDate: Date, limit = 0): Promise<TopProductMetric[]> {
    const orders = await db.orders
      .where('createdAt')
      .between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    const productMap = new Map<string, TopProductMetric>()

    for (const order of orders) {
      if (!order.items) continue
      for (const item of order.items) {
        const key = item.productUuid ? `uuid_${item.productUuid}` : `name_${item.productName}`
        const existing = productMap.get(key) || {
          productId: item.productId || 0,
          productName: item.productName,
          quantitySold: 0,
          totalRevenue: 0,
          totalProfit: 0
        }
        existing.quantitySold += item.quantity
        existing.totalRevenue += item.totalPrice
        existing.totalProfit += item.totalPrice - (item.costPrice * item.quantity)
        productMap.set(key, existing)
      }
    }

    const sorted = Array.from(productMap.values()).sort((a, b) => b.quantitySold - a.quantitySold)
    return limit > 0 ? sorted.slice(0, limit) : sorted
  }

  /**
   * ดึงออร์เดอร์ล่าสุด N รายการ
   */
  async function getRecentOrders(limit: number = 5): Promise<Order[]> {
    return await db.orders
      .orderBy('createdAt')
      .reverse()
      .filter(o => !o.isDeleted)
      .limit(limit)
      .toArray()
  }

  /**
   * ข้อมูลรายได้ย้อนหลังรายวัน (สำหรับกราฟเส้น)
   */
  async function getDailyRevenueSnapshot(daysOrStart: number | Date = 14, maybeEnd?: Date): Promise<Array<{ date: string; revenue: number; profit: number }>> {
    let start: Date
    let end: Date
    let days: number

    if (daysOrStart instanceof Date && maybeEnd instanceof Date) {
      start = new Date(daysOrStart)
      start.setHours(0, 0, 0, 0)
      end = new Date(maybeEnd)
      end.setHours(23, 59, 59, 999)
      days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    } else {
      days = daysOrStart as number
      end = new Date()
      start = new Date()
      start.setDate(end.getDate() - days)
      start.setHours(0, 0, 0, 0)
    }

    const orders = await db.orders
      .where('createdAt').between(start, end)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    const dailyMap = new Map<string, { revenue: number; profit: number }>()
    for (let i = 0; i <= days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      dailyMap.set(d.toLocaleDateString('en-CA'), { revenue: 0, profit: 0 })
    }
    for (const o of orders) {
      const key = new Date(o.createdAt).toLocaleDateString('en-CA')
      const val = dailyMap.get(key)
      if (val) { val.revenue += o.totalAmount; val.profit += o.profitAmount }
    }
    return Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }))
  }

  /**
   * สัดส่วนยอดขายตามหมวดหมู่ (สำหรับกราฟวงกลม)
   */
  async function getCategorySalesDistribution(startDate: Date, endDate: Date): Promise<Array<{ categoryName: string; value: number }>> {
    const orders = await db.orders
      .where('createdAt').between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    const [categories, products] = await Promise.all([db.categories.toArray(), db.products.toArray()])
    const catIdToName = new Map(categories.map(c => [c.id!, c.name]))
    const productIdToCatId = new Map(products.map(p => [p.id!, p.categoryId]))
    const catMap = new Map<string, number>()

    for (const o of orders) {
      if (!o.items) continue
      for (const item of o.items) {
        let categoryName = 'อื่นๆ'
        if (item.categoryUuid) {
          const cat = categories.find(c => c.uuid === item.categoryUuid)
          if (cat) categoryName = cat.name
        } else {
          const catId = item.categoryId || productIdToCatId.get(item.productId)
          categoryName = catIdToName.get(catId!) || 'อื่นๆ'
        }
        catMap.set(categoryName, (catMap.get(categoryName) ?? 0) + item.totalPrice)
      }
    }

    return Array.from(catMap.entries())
      .map(([categoryName, value]) => ({ categoryName, value }))
      .sort((a, b) => b.value - a.value)
  }

  // ---------------------------------------------------------------------------
  // Product Intelligence: Heatmap & Trend
  // ---------------------------------------------------------------------------

  /**
   * Heatmap สินค้า × วันในสัปดาห์
   * คืนค่า Top N สินค้าพร้อมจำนวนชิ้นในแต่ละวัน (0=จันทร์, 6=อาทิตย์)
   */
  async function getProductDayHeatmap(startDate: Date, endDate: Date, limit = 15): Promise<ProductHeatmapRow[]> {
    const orders = await db.orders
      .where('createdAt').between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    // Map: productKey → { name, dayQty, total }
    const productMap = new Map<string, { name: string; dayQty: Record<number, number>; total: number }>()

    for (const order of orders) {
      if (!order.items) continue
      const jsDay = new Date(order.createdAt).getDay()  // 0=Sun
      const dow = jsDay === 0 ? 6 : jsDay - 1            // แปลงเป็น Mon=0...Sun=6

      for (const item of order.items) {
        const key = item.productUuid || `name_${item.productName}`
        if (!productMap.has(key)) productMap.set(key, { name: item.productName, dayQty: {}, total: 0 })
        const row = productMap.get(key)!
        row.dayQty[dow] = (row.dayQty[dow] ?? 0) + item.quantity
        row.total += item.quantity
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(p => ({ productName: p.name, totalQty: p.total, data: p.dayQty }))
  }

  /**
   * Heatmap สินค้า × ชั่วโมง
   * คืนค่า Top N สินค้าพร้อมจำนวนชิ้นในแต่ละชั่วโมง
   */
  async function getProductHourHeatmap(startDate: Date, endDate: Date, limit = 15): Promise<ProductHeatmapRow[]> {
    const orders = await db.orders
      .where('createdAt').between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    const productMap = new Map<string, { name: string; hourQty: Record<number, number>; total: number }>()

    for (const order of orders) {
      if (!order.items) continue
      const hour = new Date(order.createdAt).getHours()

      for (const item of order.items) {
        const key = item.productUuid || `name_${item.productName}`
        if (!productMap.has(key)) productMap.set(key, { name: item.productName, hourQty: {}, total: 0 })
        const row = productMap.get(key)!
        row.hourQty[hour] = (row.hourQty[hour] ?? 0) + item.quantity
        row.total += item.quantity
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(p => ({ productName: p.name, totalQty: p.total, data: p.hourQty }))
  }

  /**
   * Weekly Trend: ยอดขายสินค้า Top 6 รายสัปดาห์ ย้อนหลัง N สัปดาห์
   */
  async function getWeeklyTrend(weeks = 4): Promise<WeeklyTrendData> {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(end.getDate() - weeks * 7)
    start.setHours(0, 0, 0, 0)

    const orders = await db.orders
      .where('createdAt').between(start, end)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    // สร้าง Week boundary สำหรับ labels
    const weekBoundaries: { start: Date; end: Date; label: string }[] = []
    for (let w = weeks - 1; w >= 0; w--) {
      const wEnd = new Date()
      wEnd.setDate(end.getDate() - w * 7)
      const wStart = new Date(wEnd)
      wStart.setDate(wEnd.getDate() - 6)
      weekBoundaries.push({
        start: wStart,
        end: wEnd,
        label: `${wStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`
      })
    }

    // Map product → qty per week
    const productWeekly = new Map<string, { name: string; weekData: number[] }>()

    for (const order of orders) {
      if (!order.items) continue
      const orderTime = new Date(order.createdAt).getTime()

      // หา week index
      const wIdx = weekBoundaries.findIndex(wb => orderTime >= wb.start.getTime() && orderTime <= wb.end.getTime())
      if (wIdx < 0) continue

      for (const item of order.items) {
        const key = item.productUuid || `name_${item.productName}`
        if (!productWeekly.has(key)) {
          productWeekly.set(key, { name: item.productName, weekData: new Array(weeks).fill(0) })
        }
        const row = productWeekly.get(key)!
        row.weekData[wIdx] = (row.weekData[wIdx] ?? 0) + item.quantity
      }
    }

    // เอา Top 6 by total
    const top6 = Array.from(productWeekly.values())
      .map(p => ({ ...p, total: p.weekData.reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)

    return {
      weeks: weekBoundaries.map(wb => wb.label),
      series: top6.map(p => ({ name: p.name, data: p.weekData }))
    }
  }

  /**
   * Velocity: วิเคราะห์ความถี่การขายของสินค้าแต่ละรายการ
   * badge: 🔥 hot (>60% วัน), 👍 good (30-60%), ⚠️ slow (10-30%), 💤 dead (<10%)
   */
  async function getProductVelocity(startDate: Date, endDate: Date): Promise<VelocityMetric[]> {
    const orders = await db.orders
      .where('createdAt').between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

    const productMap = new Map<string, {
      name: string; totalQty: number; totalRevenue: number; activeDays: Set<string>
    }>()

    for (const order of orders) {
      if (!order.items) continue
      const dayKey = new Date(order.createdAt).toLocaleDateString('en-CA')

      for (const item of order.items) {
        const key = item.productUuid || `name_${item.productName}`
        if (!productMap.has(key)) {
          productMap.set(key, { name: item.productName, totalQty: 0, totalRevenue: 0, activeDays: new Set() })
        }
        const row = productMap.get(key)!
        row.totalQty += item.quantity
        row.totalRevenue += item.totalPrice
        row.activeDays.add(dayKey)
      }
    }

    return Array.from(productMap.values())
      .map(p => {
        const daysActive = p.activeDays.size
        const velocityRate = daysActive / totalDays
        const avgQtyPerActiveDay = daysActive > 0 ? p.totalQty / daysActive : 0
        const badge: VelocityMetric['badge'] =
          velocityRate > 0.6 ? 'hot' :
          velocityRate > 0.3 ? 'good' :
          velocityRate > 0.1 ? 'slow' : 'dead'
        return { productName: p.name, totalQty: p.totalQty, totalRevenue: p.totalRevenue,
          daysActive, totalDays, avgQtyPerActiveDay, velocityRate, badge }
      })
      .sort((a, b) => b.velocityRate - a.velocityRate)
  }

  /**
   * ฟังก์ชันซ่อมแซมข้อมูล: แปลง createdAt/updatedAt จาก String กลับเป็น Date
   */
  async function repairOrderDates() {
    const orders = await db.orders.toArray()
    let repairedCount = 0
    for (const order of orders) {
      let needsUpdate = false
      if (typeof order.createdAt === 'string') { order.createdAt = new Date(order.createdAt); needsUpdate = true }
      if (typeof order.updatedAt === 'string') { order.updatedAt = new Date(order.updatedAt); needsUpdate = true }
      if (needsUpdate) { await db.orders.put(order); repairedCount++ }
    }
    if (repairedCount > 0) console.log(`✅ ซ่อมแซมรูปแบบวันที่ใน Order สำเร็จ ${repairedCount} รายการ`)
  }

  return {
    getSummary,
    getTopProducts,
    getRecentOrders,
    getDailyRevenueSnapshot,
    getCategorySalesDistribution,
    getProductDayHeatmap,
    getProductHourHeatmap,
    getWeeklyTrend,
    getProductVelocity,
    repairOrderDates
  }
}
