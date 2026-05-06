import { describe, it, expect } from 'vitest'

// Pure calculation functions mirroring useCart logic
function calcSubtotal(items: Array<{ totalPrice: number }>) {
  return items.reduce((sum, item) => sum + item.totalPrice, 0)
}

function calcAfterDiscount(subtotal: number, discount: number) {
  return subtotal - discount
}

function calcTax(afterDiscount: number, taxRate: number) {
  return Math.round(afterDiscount * (taxRate / 100) * 100) / 100
}

function calcTotal(afterDiscount: number, taxAmount: number) {
  return afterDiscount + taxAmount
}

describe('Cart Calculations', () => {
  const items = [
    { totalPrice: 80 },
    { totalPrice: 80 },
    { totalPrice: 60 },
  ]

  it('calculates subtotal correctly', () => {
    expect(calcSubtotal(items)).toBe(220)
  })

  it('applies discount correctly', () => {
    expect(calcAfterDiscount(220, 20)).toBe(200)
  })

  it('calculates 7% tax correctly', () => {
    expect(calcTax(200, 7)).toBe(14)
  })

  it('calculates total with tax', () => {
    expect(calcTotal(200, 14)).toBe(214)
  })

  it('handles zero discount', () => {
    expect(calcAfterDiscount(220, 0)).toBe(220)
  })

  it('handles zero tax rate', () => {
    expect(calcTax(220, 0)).toBe(0)
  })

  it('rounds tax to 2 decimal places', () => {
    // 333 * 7% = 23.31
    expect(calcTax(333, 7)).toBe(23.31)
  })
})
