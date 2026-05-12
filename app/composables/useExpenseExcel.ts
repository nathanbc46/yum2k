import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import { useAuthStore } from '~/stores/auth'
import type { Expense, ExpenseCategory } from '~/types'

export interface ExpenseImportPreviewItem {
  status: 'new' | 'update' | 'invalid'
  expense: Partial<Expense> & { id?: number }
  error?: string
}

const CATEGORY_NAMES_LEGACY: Record<string, string> = {
  ingredient: 'วัตถุดิบ',
  utility: 'ค่าน้ำ/ไฟ/แก๊ส',
  wage: 'ค่าจ้างพนักงาน',
  rent: 'ค่าเช่าที่',
  supplies: 'วัสดุสิ้นเปลือง',
  other: 'อื่นๆ'
}

export function useExpenseExcel() {
  const COLUMNS = [
    { label: 'UUID', key: 'uuid' },
    { label: 'วันที่ (YYYY-MM-DD)', key: 'expenseDate' },
    { label: 'หมวดหมู่', key: 'category' },
    { label: 'คำอธิบาย', key: 'description' },
    { label: 'จำนวนเงิน', key: 'amount' }
  ]

  async function exportExpenses() {
    const expenses = await db.expenses.filter(e => !e.isDeleted).toArray()
    
    // เรียงวันที่ใหม่สุดขึ้นก่อน
    expenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())

    const categories = await db.expenseCategories.toArray()
    const catIdToName = new Map(categories.map(c => [c.id, c.name]))

    const data = expenses.map(e => {
      const row: any = {}
      COLUMNS.forEach(col => {
        if (col.key === 'category') {
          let name = 'อื่นๆ'
          if (e.categoryId) {
            name = catIdToName.get(e.categoryId) || 'อื่นๆ'
          } else if (e.category) {
            name = CATEGORY_NAMES_LEGACY[e.category] || 'อื่นๆ'
          }
          row[col.label] = name
        } else {
          row[col.label] = (e as any)[col.key] ?? ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses')
    worksheet['!cols'] = COLUMNS.map(col => ({ wch: col.key === 'description' ? 40 : 20 }))
    XLSX.writeFile(workbook, `Yum2K_Expenses_${new Date().toISOString().substring(0, 10)}.xlsx`)
  }

  function downloadTemplate() {
    const today = new Date().toISOString().substring(0, 10)
    const data = [
      {
        [COLUMNS[0]!.label]: '',
        [COLUMNS[1]!.label]: today,
        [COLUMNS[2]!.label]: 'วัตถุดิบ',
        [COLUMNS[3]!.label]: 'ซื้อหมูสับ 5 กก.',
        [COLUMNS[4]!.label]: 500
      },
      {
        [COLUMNS[0]!.label]: '',
        [COLUMNS[1]!.label]: today,
        [COLUMNS[2]!.label]: 'ค่าน้ำ/ไฟ/แก๊ส',
        [COLUMNS[3]!.label]: 'ค่าไฟเดือนนี้',
        [COLUMNS[4]!.label]: 1500
      }
    ]
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, 'Yum2K_Expense_Template.xlsx')
  }

  async function prepareImportData(file: File): Promise<ExpenseImportPreviewItem[]> {
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
          const previewItems: ExpenseImportPreviewItem[] = []
          const authStore = useAuthStore()
          const currentUser = authStore.currentUser
          
          for (const row of jsonData as any[]) {
            const uuid = row[COLUMNS[0]!.label]?.toString().trim()
            let expenseDate = row[COLUMNS[1]!.label]?.toString().trim()
            
            // Validate and parse date (Excel might send serial number)
            if (typeof row[COLUMNS[1]!.label] === 'number') {
              const date = new Date(Math.round((row[COLUMNS[1]!.label] - 25569) * 86400 * 1000))
              expenseDate = date.toISOString().substring(0, 10)
            } else if (!expenseDate) {
              expenseDate = new Date().toISOString().substring(0, 10)
            } else {
              // Basic validation for YYYY-MM-DD
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/
              if (!dateRegex.test(expenseDate)) {
                // Try to parse it and convert to YYYY-MM-DD
                const d = new Date(expenseDate)
                if (!isNaN(d.getTime())) {
                  expenseDate = d.toISOString().substring(0, 10)
                } else {
                  expenseDate = new Date().toISOString().substring(0, 10)
                }
              }
            }

            const categoryName = row[COLUMNS[2]!.label]?.toString().trim() || 'อื่นๆ'
            
            // ค้นหาหมวดหมู่ที่มีอยู่
            const categories = await db.expenseCategories.toArray()
            let targetCat = categories.find(c => c.name === categoryName)
            
            // ถ้าไม่พบ ให้เตรียมข้อมูลเพื่อไปสร้างใหม่ตอน execute
            const categoryData = targetCat ? {
              categoryId: targetCat.id,
              categoryUuid: targetCat.uuid
            } : {
              categoryName // ฝากชื่อไว้เพื่อไปสร้างใหม่
            }
            const description = row[COLUMNS[3]!.label]?.toString().trim()
            
            if (!description) {
              previewItems.push({ status: 'invalid', expense: {}, error: 'ไม่มีคำอธิบาย' })
              continue
            }

            const amount = parseFloat(row[COLUMNS[4]!.label]) || 0
            if (amount <= 0) {
              previewItems.push({ status: 'invalid', expense: { description }, error: 'จำนวนเงินต้องมากกว่า 0' })
              continue
            }

            const recordedBy = currentUser?.displayName || 'Unknown'

            const expenseData: any = {
              uuid: uuid || undefined,
              expenseDate,
              ...(categoryData as any),
              description,
              amount,
              recordedBy,
              staffId: currentUser?.id || 0,
              staffUuid: currentUser?.uuid || ''
            }

            let existingId: number | undefined
            if (uuid) {
              const e = await db.expenses.where('uuid').equals(uuid).first()
              if (e) existingId = e.id
            }

            previewItems.push({
              status: existingId ? 'update' : 'new',
              expense: { ...expenseData, id: existingId }
            })
          }
          resolve(previewItems)
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
      reader.readAsArrayBuffer(file)
    })
  }

  async function executeImport(items: ExpenseImportPreviewItem[]): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 }
    
    for (const item of items) {
      if (item.status === 'invalid') {
        results.failed++
        continue
      }

      try {
        const expenseData = JSON.parse(JSON.stringify(item.expense))
        const finalData = {
          ...expenseData,
          updatedAt: new Date(),
          isDeleted: false,
          syncStatus: 'pending' // เพื่อให้ background sync นำขึ้น Supabase
        }

        const expenseUuid = item.expense.uuid || uuidv4()

        // จัดการเรื่องหมวดหมู่ก่อนบันทึก
        let categoryId = item.expense.categoryId
        let categoryUuid = item.expense.categoryUuid

        if (!categoryId && (item.expense as any).categoryName) {
          const name = (item.expense as any).categoryName
          // เช็คอีกครั้งว่ามีใครสร้างไปยัง (เผื่อในไฟล์เดียวกันมีชื่อซ้ำ)
          let cat = await db.expenseCategories.where('name').equals(name).first()
          if (!cat) {
            const newCatUuid = uuidv4()
            const newCatId = await db.expenseCategories.add({
              uuid: newCatUuid,
              name,
              color: '#6366f1',
              sortOrder: (await db.expenseCategories.count()) + 1,
              isActive: true,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date()
            } as any)
            categoryId = newCatId
            categoryUuid = newCatUuid
          } else {
            categoryId = cat.id
            categoryUuid = cat.uuid
          }
        }

        if (item.status === 'update' && item.expense.id) {
          await db.expenses.put({ 
            ...finalData, 
            id: item.expense.id,
            categoryId,
            categoryUuid
          })
        } else {
          delete (finalData as any).id
          delete (finalData as any).categoryName
          
          await db.expenses.add({
            ...finalData,
            uuid: expenseUuid,
            categoryId,
            categoryUuid,
            createdAt: finalData.createdAt ? new Date(finalData.createdAt) : new Date()
          } as Expense)
        }
        results.success++
      } catch (err: any) {
        console.error(`❌ Import Failed for Expense [${item.expense.description}]:`, err)
        results.failed++
      }
    }
    
    return results
  }

  return {
    exportExpenses,
    downloadTemplate,
    prepareImportData,
    executeImport
  }
}
