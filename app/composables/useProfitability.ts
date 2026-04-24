// =============================================================================
// composables/useProfitability.ts
// Composable สำหรับคำนวณกำไรและวิเคราะห์ผลประกอบการ
// รองรับการคำนวณกำไร 2 แบบ:
// 1. แบบ Product Basis (ยอดขาย - ต้นทุนสินค้า)
// 2. แบบ Cash Basis (ยอดขาย - รายจ่ายหน้างาน)
// =============================================================================

import { db } from '~/db'
import type { DailySummary, Expense } from '~/types'

export function useProfitability() {
  /**
   * คำนวณสรุปผลประกอบการในช่วงเวลาที่กำหนด
   * @param startDate - วันที่เริ่มต้น (YYYY-MM-DD)
   * @param endDate - วันที่สิ้นสุด (YYYY-MM-DD)
   */
  async function getSummary(startDate: string, endDate: string): Promise<DailySummary> {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // 1. ดึงข้อมูลออร์เดอร์ในช่วงเวลา
    const orders = await db.orders
      .where('createdAt')
      .between(start, end, true, true)
      .toArray()

    // กรองออร์เดอร์ที่ไม่ได้ถูกลบและสถานะ completed/refunded
    const activeOrders = orders.filter(o => !o.isDeleted && (o.status === 'completed' || o.status === 'refunded'))

    let totalRevenue = 0
    let totalCost = 0
    let totalItemsSold = 0
    const paymentBreakdown = {
      cash: 0,
      promptpay: 0,
      card: 0,
      other: 0
    }

    activeOrders.forEach(order => {
      // ถ้ายกเลิก/คืนเงิน ให้ลบยอด (หรือจัดการตาม Logic ร้าน)
      const multiplier = order.status === 'refunded' ? -1 : 1
      
      totalRevenue += order.totalAmount * multiplier
      totalCost += (order.totalCost || 0) * multiplier
      
      // นับจำนวนสินค้า
      order.items.forEach(item => {
        totalItemsSold += item.quantity * multiplier
      })

      // แยกตามวิธีชำระเงิน (เฉพาะที่จ่ายจริง)
      if (order.status === 'completed') {
        const method = order.paymentMethod as keyof typeof paymentBreakdown
        if (paymentBreakdown[method] !== undefined) {
          paymentBreakdown[method] += order.totalAmount
        } else {
          paymentBreakdown.other += order.totalAmount
        }
      }
    })

    // 2. ดึงข้อมูลรายจ่ายในช่วงเวลา
    const expenses = await db.expenses
      .where('expenseDate')
      .between(startDate, endDate, true, true)
      .toArray()

    const activeExpenses = expenses.filter(e => !e.isDeleted)
    const totalExpenses = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0)

    // 3. คำนวณกำไรทั้ง 2 แบบ
    // แบบที่ 1: ยอดขาย - ต้นทุนสินค้า (Product Profit)
    const totalProfit = totalRevenue - totalCost
    
    // แบบที่ 2: ยอดขาย - รายจ่ายหน้างาน (Cash Flow Profit)
    // หมายเหตุ: ใน DailySummary เราใช้ netProfit เก็บ (ยอดขาย - ต้นทุนสินค้า - รายจ่าย)
    const netProfit = totalRevenue - totalCost - totalExpenses

    return {
      date: startDate === endDate ? startDate : `${startDate} to ${endDate}`,
      totalOrders: activeOrders.length,
      totalRevenue,
      totalCost,
      totalProfit,      // กำไรแบบที่ 1 (Product Basis)
      totalExpenses,    // ยอดรวมรายจ่าย
      netProfit,        // กำไรสุทธิ (หักหมดทุกอย่าง)
      totalItemsSold,
      paymentBreakdown
    }
  }

  /**
   * เพิ่มรายจ่ายใหม่
   */
  async function addExpense(expenseData: Omit<Expense, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'isDeleted'>) {
    const { v4: uuidv4 } = await import('uuid')
    const now = new Date()
    
    const newExpense: Omit<Expense, 'id'> = {
      ...expenseData,
      uuid: uuidv4(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    }

    return await db.expenses.add(newExpense as Expense)
  }

  /**
   * แก้ไขรายจ่ายเดิม
   */
  async function updateExpense(id: number, expenseData: Partial<Expense>) {
    return await db.expenses.update(id, {
      ...expenseData,
      updatedAt: new Date(),
      syncStatus: 'pending' // สำคัญ: ต้องให้ Sync ใหม่เมื่อมีการแก้ไข
    })
  }

  return {
    getSummary,
    addExpense,
    updateExpense
  }
}
