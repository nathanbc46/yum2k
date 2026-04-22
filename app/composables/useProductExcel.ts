import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import type { Product, Category, InventoryMappingType } from '~/types'

export interface ImportPreviewItem {
  status: 'new' | 'update' | 'invalid'
  product: Partial<Product> & { id?: number }
  categoryName: string
  error?: string
}

export function useProductExcel() {
  const COLUMNS = [
    { label: 'UUID', key: 'uuid' },
    { label: 'รหัสสินค้า (SKU)', key: 'sku' },
    { label: 'ชื่อสินค้า', key: 'name' },
    { label: 'หมวดหมู่', key: 'categoryName' },
    { label: 'ราคาขาย', key: 'salePrice' },
    { label: 'ราคาต้นทุน', key: 'costPrice' },
    { label: 'สต็อกคงเหลือ', key: 'stockQuantity' },
    { label: 'แจ้งเตือนสต็อกต่ำ', key: 'alertThreshold' },
    { label: 'ติดตามสต็อก (ใช่/ไม่ใช่)', key: 'trackInventoryLabel' },
    { label: 'สถานะ (เปิดขาย/ซ่อน)', key: 'isActiveLabel' },
    { label: 'ลำดับ', key: 'sortOrder' },
    { label: 'คำอธิบาย', key: 'description' },
    { label: 'URL รูปภาพ', key: 'imageUrl' },
    { label: 'ประเภท (ปกติ/ชุดใหญ่/โปรโมชัน)', key: 'mappingTypeLabel' },
    { label: 'Addons_JSON', key: 'addonGroups' },
    { label: 'InventoryMapping_JSON', key: 'inventoryMappings' },
  ]

  function safeJsonStringify(val: any) {
    if (!val) return ''
    return JSON.stringify(val)
  }

  function safeJsonParse(val: any) {
    if (!val || typeof val !== 'string') return undefined
    try {
      return JSON.parse(val)
    } catch (e) {
      return undefined
    }
  }

  async function exportProducts() {
    const products = await db.products.filter(p => !p.isDeleted).toArray()
    const categories = await db.categories.toArray()
    const categoryMap = new Map(categories.map(c => [c.id, c.name]))

    const data = products.map(p => {
      const row: any = {}
      COLUMNS.forEach(col => {
        if (col.key === 'categoryName') {
          row[col.label] = categoryMap.get(p.categoryId) || 'ไม่มีหมวดหมู่'
        } else if (col.key === 'trackInventoryLabel') {
          row[col.label] = p.trackInventory ? 'ใช่' : 'ไม่ใช่'
        } else if (col.key === 'isActiveLabel') {
          row[col.label] = p.isActive ? 'เปิดขาย' : 'ซ่อน'
        } else if (col.key === 'mappingTypeLabel') {
          row[col.label] = p.mappingType === 'bundle' ? 'ชุดใหญ่' 
                        : p.mappingType === 'promotion' ? 'โปรโมชัน' 
                        : 'ปกติ'
        } else if (['addonGroups', 'inventoryMappings'].includes(col.key)) {
          row[col.label] = safeJsonStringify((p as any)[col.key])
        } else {
          row[col.label] = (p as any)[col.key] ?? ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
    worksheet['!cols'] = COLUMNS.map(() => ({ wch: 15 }))
    XLSX.writeFile(workbook, `Yum2K_Products_${new Date().toISOString().substring(0, 10)}.xlsx`)
  }

  function downloadTemplate() {
    const data = [
      {
        [COLUMNS[0]!.label]: '',
        [COLUMNS[1]!.label]: 'YUM-0001',
        [COLUMNS[2]!.label]: 'ชื่อตัวอย่างสินค้า',
        [COLUMNS[3]!.label]: 'ประเภทยำ',
        [COLUMNS[4]!.label]: 120,
        [COLUMNS[5]!.label]: 72,
        [COLUMNS[6]!.label]: 50,
        [COLUMNS[7]!.label]: 5,
        [COLUMNS[8]!.label]: 'ใช่',
        [COLUMNS[9]!.label]: 'เปิดขาย',
        [COLUMNS[10]!.label]: 1,
        [COLUMNS[11]!.label]: 'คำอธิบายสั้นๆ',
        [COLUMNS[12]!.label]: '',
        [COLUMNS[13]!.label]: 'ปกติ',
        [COLUMNS[14]!.label]: `[{"name": "ระดับความเผ็ด", "options": [{"name": "ไม่เผ็ด", "price": 0}, {"name": "เผ็ดจัด", "price": 0}]}, {"name": "เครื่องเคียง", "options": [{"name": "ไขต้ม", "price": 10}, {"name": "ไข่ดาว", "price": 15}]}]`,
        [COLUMNS[15]!.label]: '[{"sourceProductId": 1, "quantity": 1}]',
      }
    ]
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, 'Yum2K_Product_Template.xlsx')
  }

  async function prepareImportData(file: File): Promise<ImportPreviewItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          if (!sheetName) throw new Error('ไม่พบข้อมูลแผ่นงาน')
          
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet!)
          const previewItems: ImportPreviewItem[] = []
          
          // โหลดสินค้าทั้งหมดมาทำ Map สำหรับค้นหาชื่อ (กรณี Inventory Mapping)
          const allProductsInDb = await db.products.toArray()
          const productMap = new Map(allProductsInDb.map(p => [p.id, p.name]))
          
          for (const row of jsonData as any[]) {
            const name = row[COLUMNS[2]!.label]?.toString().trim()
            const categoryName = row[COLUMNS[3]!.label]?.toString().trim() || 'ทั่วไป'
            const uuid = row[COLUMNS[0]!.label]?.toString().trim()
            const sku = row[COLUMNS[1]!.label]?.toString().trim()

            if (!name) {
              previewItems.push({ status: 'invalid', product: {}, categoryName, error: 'ไม่มีชื่อสินค้า' })
              continue
            }

            const salePrice = parseFloat(row[COLUMNS[4]!.label]) || 0
            const costPrice = parseFloat(row[COLUMNS[5]!.label]) || Math.round(salePrice * 0.6)
            const mappingTypeLabel = row[COLUMNS[13]!.label]?.toString()
            const mappingType: InventoryMappingType | undefined = 
              mappingTypeLabel === 'ชุดใหญ่' ? 'bundle' :
              mappingTypeLabel === 'โปรโมชัน' ? 'promotion' : undefined

            const productData: any = {
              name,
              sku: sku || undefined,
              uuid: uuid || undefined,
              salePrice,
              costPrice,
              stockQuantity: parseInt(row[COLUMNS[6]!.label]) || 0,
              alertThreshold: parseInt(row[COLUMNS[7]!.label]) || 10,
              trackInventory: row[COLUMNS[8]!.label]?.toString() === 'ใช่',
              isActive: row[COLUMNS[9]!.label]?.toString() === 'เปิดขาย',
              sortOrder: parseInt(row[COLUMNS[10]!.label]) || 0,
              description: row[COLUMNS[11]!.label]?.toString() || undefined,
              imageUrl: row[COLUMNS[12]!.label]?.toString() || undefined,
              mappingType,
              addonGroups: safeJsonParse(row[COLUMNS[14]!.label]),
              inventoryMappings: safeJsonParse(row[COLUMNS[15]!.label]),
            }

            // แทรกชื่อสินค้าลงใน Inventory Mappings สำหรับแสดงผลใน Preview
            if (productData.inventoryMappings?.length) {
              productData.inventoryMappings = productData.inventoryMappings.map((m: any) => ({
                ...m,
                sourceProductName: productMap.get(m.sourceProductId) || 'ไม่พบสินค้า'
              }))
            }

            // ค้นหาสินค้าเดิม
            let existingId: number | undefined
            if (uuid) {
              const p = await db.products.where('uuid').equals(uuid).first()
              if (p) existingId = p.id
            }
            if (!existingId && sku) {
              const p = await db.products.where('sku').equals(sku).first()
              if (p) existingId = p.id
            }

            previewItems.push({
              status: existingId ? 'update' : 'new',
              product: { ...productData, id: existingId },
              categoryName
            })
          }
          resolve(previewItems)
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
      reader.readAsArrayBuffer(file)
    })
  }

  async function executeImport(items: ImportPreviewItem[]): Promise<{ success: number; failed: number }> {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new Error('ไม่สามารถนำเข้าข้อมูลสินค้าได้ขณะออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ต')
    }

    const supabase = useSupabaseClient<any>()
    const results = { success: 0, failed: 0 }
    let allCategories = await db.categories.toArray()

    const getCategoryIdByName = async (name: string): Promise<number> => {
      let cat = allCategories.find(c => c.name.trim() === name.trim())
      if (!cat) {
        const newCat: Omit<Category, 'id'> = {
          uuid: uuidv4(),
          name: name.trim(),
          isActive: true,
          sortOrder: allCategories.length + 1,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // Push Category to Cloud
        const { error: catErr } = await supabase.from('categories').upsert({
          uuid: newCat.uuid,
          name: newCat.name,
          is_active: newCat.isActive,
          sort_order: newCat.sortOrder,
          is_deleted: newCat.isDeleted,
          created_at: newCat.createdAt.toISOString(),
          updated_at: newCat.updatedAt.toISOString()
        }, { onConflict: 'uuid' })

        if (catErr) throw new Error(`สร้างหมวดหมู่ใหม่บนคลาวด์ล้มเหลว: ${catErr.message}`)

        const id = await db.categories.add(newCat as Category)
        cat = { ...newCat, id: id as number }
        allCategories.push(cat)
      }
      return cat.id!
    }

    for (const item of items) {
      if (item.status === 'invalid') {
        results.failed++
        continue
      }

      try {
        const categoryId = await getCategoryIdByName(item.categoryName)
        
        // แปลง Reactive Proxy เป็น Plain Object เพื่อป้องกัน DataCloneError ใน IndexedDB
        const productData = JSON.parse(JSON.stringify(item.product))
        delete (productData as any).sourceProductName // ลบฟิลด์แสดงผลใน Preview ออก

        const finalData = {
          ...productData,
          categoryId,
          updatedAt: new Date(),
          isDeleted: false
        }

        const productUuid = item.product.uuid || uuidv4()

        // Push Product to Cloud
        let mappingsForCloud = null
        if (finalData.mappingType && finalData.inventoryMappings?.length) {
          mappingsForCloud = []
          for (const m of finalData.inventoryMappings) {
            const srcProd = await db.products.get(m.sourceProductId)
            if (srcProd && srcProd.uuid) {
              mappingsForCloud.push({ source_product_uuid: srcProd.uuid, quantity: m.quantity })
            }
          }
        }

        const catRow = await db.categories.get(categoryId)
        const payload = {
          uuid: productUuid,
          category_uuid: catRow?.uuid || null,
          sku: finalData.sku || null,
          name: finalData.name,
          description: finalData.description || null,
          image_url: finalData.imageUrl || null,
          sale_price: finalData.salePrice,
          cost_price: finalData.costPrice,
          stock_quantity: finalData.stockQuantity,
          alert_threshold: finalData.alertThreshold,
          track_inventory: finalData.trackInventory,
          mapping_type: finalData.mappingType || null,
          inventory_mappings: mappingsForCloud,
          addon_groups: finalData.addonGroups || null,
          is_active: finalData.isActive,
          sort_order: finalData.sortOrder,
          total_sold: finalData.totalSold || 0,
          is_deleted: finalData.isDeleted,
          updated_at: finalData.updatedAt.toISOString(),
        }

        const { error: prodErr } = await supabase.from('products').upsert(payload, { onConflict: 'uuid' })
        if (prodErr) throw new Error(`บันทึกสินค้าลงคลาวด์ล้มเหลว: ${prodErr.message}`)

        if (item.status === 'update' && item.product.id) {
          await db.products.put({ ...finalData, id: item.product.id })
        } else {
          // ลบ id ออกหากมีเผื่อเป็นกรณีที่สถานะสับสน เพื่อให้ Dexie สร้างให้ใหม่
          delete (finalData as any).id 
          
          await db.products.add({
            ...finalData,
            uuid: productUuid,
            createdAt: finalData.createdAt ? new Date(finalData.createdAt) : new Date()
          } as Product)
        }
        results.success++
      } catch (err: any) {
        console.error(`❌ Import Failed for [${item.product.name}]:`, err)
        results.failed++
      }
    }
    return results
  }

  return {
    exportProducts,
    downloadTemplate,
    prepareImportData,
    executeImport
  }
}
