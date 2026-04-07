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

export function useReports() {
  
  /**
   * สร้างสรุปยอดขายรายวัน (สำหรับ Range วันที่กำหนด หรือวันนี้)
   */
  async function getSummary(startDate: Date, endDate: Date): Promise<DailySummary> {
    const orders = await db.orders
      .where('createdAt')
      .between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status === 'completed')
      .toArray()

    let revenue = 0
    let cost = 0
    let profit = 0
    
    for (const order of orders) {
      revenue += order.totalAmount
      cost += order.totalCost
      profit += order.profitAmount
    }

    return {
      revenue,
      cost,
      profit,
      orderCount: orders.length
    }
  }

  /**
   * หารายการสินค้าที่ขายดีที่สุดในช่วงเวลา
   */
  async function getTopProducts(startDate: Date, endDate: Date): Promise<TopProductMetric[]> {
    const orders = await db.orders
      .where('createdAt')
      .between(startDate, endDate)
      .filter(o => !o.isDeleted && o.status === 'completed')
      .toArray()

    const productMap = new Map<number, TopProductMetric>()

    for (const order of orders) {
      if (!order.items) continue
      for (const item of order.items) {
        const id = item.productId
        const existing = productMap.get(id) || {
          productId: id,
          productName: item.productName,
          quantitySold: 0,
          totalRevenue: 0,
          totalProfit: 0
        }
        
        const itemProfit = item.totalPrice - (item.costPrice * item.quantity)

        existing.quantitySold += item.quantity
        existing.totalRevenue += item.totalPrice
        existing.totalProfit += itemProfit

        productMap.set(id, existing)
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold) // เรียงตามชิ้นที่ขาย
  }

  /**
   * ดึงออร์เดอร์ล่าสุด 5 รายการ
   */
  async function getRecentOrders(limit: number = 5): Promise<Order[]> {
    return await db.orders
      .filter(o => !o.isDeleted)
      .reverse()
      .limit(limit)
      .toArray()
  }

  /**
   * ข้อมูลรายได้ย้อนหลังรายวัน (สำหรับกราฟเส้น)
   */
  async function getDailyRevenueSnapshot(days: number = 14): Promise<Array<{ date: string, revenue: number, profit: number }>> {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    const orders = await db.orders
      .where('createdAt')
      .between(start, end)
      .filter(o => !o.isDeleted && o.status === 'completed')
      .toArray()

    const dailyMap = new Map<string, { revenue: number, profit: number }>()

    for (let i = 0; i <= days; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        const key = d.toLocaleDateString('en-CA')
        dailyMap.set(key, { revenue: 0, profit: 0 })
    }

    orders.forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString('en-CA')
      if (dailyMap.has(key)) {
          const val = dailyMap.get(key)!
          val.revenue += o.totalAmount
          val.profit += o.profitAmount
      }
    })

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        profit: data.profit
    }))
  }

  /**
   * สัดส่วนยอดขายตามหมวดหมู่ (สำหรับกราฟวงกลม)
   */
  async function getCategorySalesDistribution(startDate: Date, endDate: Date): Promise<Array<{ categoryName: string, value: number }>> {
    const orders = await db.orders
        .where('createdAt')
        .between(startDate, endDate)
        .filter(o => !o.isDeleted && o.status === 'completed')
        .toArray()

    const catMap = new Map<string, number>()
    const [categories, products] = await Promise.all([
      db.categories.toArray(),
      db.products.toArray()
    ])
    
    // สร้าง Map สำหรับแปลง ID เป็นชื่อ และ ProductID เป็น CategoryID
    const catIdToName = new Map(categories.map(c => [c.id!, c.name]))
    const productIdToCatId = new Map(products.map(p => [p.id!, p.categoryId]))

    orders.forEach(o => {
        if (!o.items) return
        o.items.forEach(item => {
            // 1. ลองหาจาก item.categoryId (ชุดใหม่) 
            // 2. ถ้าไม่มี ลองหาจาก productIdToCatId (ชุดเก่า)
            const catId = item.categoryId || productIdToCatId.get(item.productId)
            const name = catIdToName.get(catId!) || 'อื่นๆ'
            
            const current = catMap.get(name) || 0
            catMap.set(name, current + item.totalPrice)
        })
    })

    return Array.from(catMap.entries())
        .map(([categoryName, value]) => ({ categoryName, value }))
        .sort((a, b) => b.value - a.value)
  }

  return {
    getSummary,
    getTopProducts,
    getRecentOrders,
    getDailyRevenueSnapshot,
    getCategorySalesDistribution
  }
}
