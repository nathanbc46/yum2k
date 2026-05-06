import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'

// Minimal DB for testing
class TestDB extends Dexie {
  products!: Dexie.Table<any, number>
  constructor() {
    super('TestDB_' + Math.random())
    this.version(1).stores({ products: '++id, uuid' })
  }
}

async function checkStock(db: TestDB, product: any, quantity: number): Promise<boolean> {
  if (!product.trackInventory) return true
  if (!product.inventoryMappings?.length) {
    return product.stockQuantity >= quantity
  }
  const ids = product.inventoryMappings.map((m: any) => m.sourceProductId)
  const sources = await db.products.where('id').anyOf(ids).toArray()
  const sourceMap = new Map(sources.map((p: any) => [p.id, p]))
  for (const mapping of product.inventoryMappings) {
    const src = sourceMap.get(mapping.sourceProductId)
    if (!src || !src.trackInventory) continue
    if (src.stockQuantity < mapping.quantity * quantity) return false
  }
  return true
}

describe('checkStock', () => {
  let db: TestDB

  beforeEach(async () => {
    db = new TestDB()
    await db.open()
  })

  it('returns true when trackInventory is false', async () => {
    const product = { trackInventory: false, stockQuantity: 0 }
    expect(await checkStock(db, product, 5)).toBe(true)
  })

  it('returns true when stock is sufficient', async () => {
    const product = { trackInventory: true, stockQuantity: 10, inventoryMappings: [] }
    expect(await checkStock(db, product, 5)).toBe(true)
  })

  it('returns false when stock is insufficient', async () => {
    const product = { trackInventory: true, stockQuantity: 3, inventoryMappings: [] }
    expect(await checkStock(db, product, 5)).toBe(false)
  })

  it('returns true when stock equals quantity (exact)', async () => {
    const product = { trackInventory: true, stockQuantity: 5, inventoryMappings: [] }
    expect(await checkStock(db, product, 5)).toBe(true)
  })

  it('checks bundle mapping against source products', async () => {
    const srcId = await db.products.add({ uuid: 'src-1', trackInventory: true, stockQuantity: 20 })
    const bundleProduct = {
      trackInventory: true,
      stockQuantity: 99,
      inventoryMappings: [{ sourceProductId: srcId, quantity: 3 }],
    }
    // Need 3*2=6, have 20 → true
    expect(await checkStock(db, bundleProduct, 2)).toBe(true)
    // Need 3*8=24, have 20 → false
    expect(await checkStock(db, bundleProduct, 8)).toBe(false)
  })
})
