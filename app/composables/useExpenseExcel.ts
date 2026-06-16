import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import { db } from '~/db'
import { useAuthStore } from '~/stores/auth'
import type { Expense } from '~/types'

export interface ExpenseImportPreviewItem {
  status: 'new' | 'update' | 'invalid'
  expense: Partial<Expense> & { id?: number; categoryName?: string }
  error?: string
}

export interface ImportItemResult {
  item: ExpenseImportPreviewItem
  success: boolean
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
  // คอลัมน์ทั้งหมดของ Excel (ลำดับสำคัญ — ต้องตรงกับ import)
  const COLUMNS = [
    { label: 'UUID',              key: 'uuid',        width: 38 },
    { label: 'วันที่ (YYYY-MM-DD)', key: 'expenseDate', width: 18 },
    { label: 'หมวดหมู่',           key: 'category',    width: 20 },
    { label: 'คำอธิบาย',           key: 'description', width: 40 },
    { label: 'Vendor (ร้านค้า)',   key: 'vendor',      width: 22 },
    { label: 'หน่วย',              key: 'unit',        width: 14 },
    { label: 'จำนวน',              key: 'quantity',    width: 12 },
    { label: 'จำนวนเงิน',          key: 'amount',      width: 14 },
  ] as const

  // ดึงชื่อหมวดหมู่จาก expense (รองรับทั้งระบบใหม่ categoryId และระบบเก่า category)
  function resolveCategoryName(
    e: Expense,
    catIdToName: Map<number, string>
  ): string {
    if (e.categoryId) return catIdToName.get(e.categoryId) ?? 'อื่นๆ'
    if (e.category) return CATEGORY_NAMES_LEGACY[e.category] ?? 'อื่นๆ'
    return 'อื่นๆ'
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  async function exportExpenses() {
    const expenses = await db.expenses.filter(e => !e.isDeleted).toArray()
    expenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())

    const categories = await db.expenseCategories.toArray()
    const catIdToName = new Map(categories.map(c => [c.id!, c.name]))

    const data = expenses.map(e => ({
      [COLUMNS[0].label]: e.uuid ?? '',
      [COLUMNS[1].label]: e.expenseDate ?? '',
      [COLUMNS[2].label]: resolveCategoryName(e, catIdToName),
      [COLUMNS[3].label]: e.description ?? '',
      [COLUMNS[4].label]: e.vendor ?? '',
      [COLUMNS[5].label]: e.unit ?? '',
      [COLUMNS[6].label]: e.quantity ?? '',
      [COLUMNS[7].label]: e.amount ?? 0,
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet['!cols'] = COLUMNS.map(col => ({ wch: col.width }))

    // ตั้งรูปแบบตัวเลขสำหรับคอลัมน์จำนวนเงิน
    const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')
    const amountColIdx = 7 // index ของคอลัมน์ 'จำนวนเงิน' (0-based)
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c: amountColIdx })
      if (worksheet[cellAddr]) worksheet[cellAddr].t = 'n'
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses')
    XLSX.writeFile(workbook, `Yum2K_Expenses_${new Date().toISOString().substring(0, 10)}.xlsx`)
  }

  // ---------------------------------------------------------------------------
  // Template
  // ---------------------------------------------------------------------------
  function downloadTemplate() {
    const today = new Date().toISOString().substring(0, 10)
    const data = [
      {
        [COLUMNS[0].label]: '',
        [COLUMNS[1].label]: today,
        [COLUMNS[2].label]: 'วัตถุดิบ',
        [COLUMNS[3].label]: 'ซื้อหมูสับ 5 กก.',
        [COLUMNS[4].label]: 'ตลาดสด',
        [COLUMNS[5].label]: 'กิโลกรัม',
        [COLUMNS[6].label]: 5,
        [COLUMNS[7].label]: 500,
      },
      {
        [COLUMNS[0].label]: '',
        [COLUMNS[1].label]: today,
        [COLUMNS[2].label]: 'ค่าน้ำ/ไฟ/แก๊ส',
        [COLUMNS[3].label]: 'ค่าไฟเดือนนี้',
        [COLUMNS[4].label]: 'การไฟฟ้า',
        [COLUMNS[5].label]: '',
        [COLUMNS[6].label]: '',
        [COLUMNS[7].label]: 1500,
      },
      {
        [COLUMNS[0].label]: '',
        [COLUMNS[1].label]: today,
        [COLUMNS[2].label]: 'วัตถุดิบ',
        [COLUMNS[3].label]: 'น้ำมันพืช',
        [COLUMNS[4].label]: 'แม็คโคร',
        [COLUMNS[5].label]: 'ขวด',
        [COLUMNS[6].label]: 1,
        [COLUMNS[7].label]: 280,
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet['!cols'] = COLUMNS.map(col => ({ wch: col.width }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, 'Yum2K_Expense_Template.xlsx')
  }

  // ---------------------------------------------------------------------------
  // Import — Prepare (parse + validate ก่อนแสดง preview)
  // ---------------------------------------------------------------------------
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
          const categories = await db.expenseCategories.filter(c => !c.isDeleted).toArray()

          for (const row of jsonData as any[]) {
            // --- UUID ---
            const uuid = row[COLUMNS[0].label]?.toString().trim() || undefined

            // --- วันที่ ---
            let expenseDate: string
            const rawDate = row[COLUMNS[1].label]
            if (typeof rawDate === 'number') {
              // Excel serial date
              const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000))
              expenseDate = d.toISOString().substring(0, 10)
            } else if (rawDate) {
              const str = rawDate.toString().trim()
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/
              if (dateRegex.test(str)) {
                expenseDate = str
              } else {
                const d = new Date(str)
                expenseDate = isNaN(d.getTime())
                  ? new Date().toISOString().substring(0, 10)
                  : d.toISOString().substring(0, 10)
              }
            } else {
              expenseDate = new Date().toISOString().substring(0, 10)
            }

            // --- หมวดหมู่ ---
            const categoryName = row[COLUMNS[2].label]?.toString().trim() || 'อื่นๆ'
            const targetCat = categories.find(c => c.name === categoryName)
            const categoryData = targetCat
              ? { categoryId: targetCat.id, categoryUuid: targetCat.uuid }
              : { categoryName } // สร้างใหม่ตอน execute

            // --- คำอธิบาย (required) ---
            const description = row[COLUMNS[3].label]?.toString().trim()
            if (!description) {
              previewItems.push({ status: 'invalid', expense: {}, error: 'ไม่มีคำอธิบาย' })
              continue
            }

            // --- Vendor ---
            const vendor = row[COLUMNS[4].label]?.toString().trim() || undefined

            // --- หน่วย ---
            const unit = row[COLUMNS[5].label]?.toString().trim() || undefined

            // --- จำนวน ---
            const rawQty = row[COLUMNS[6].label]
            const quantity = rawQty !== undefined && rawQty !== '' ? parseFloat(rawQty) || undefined : undefined

            // --- จำนวนเงิน (required > 0) ---
            const amount = parseFloat(row[COLUMNS[7].label]) || 0
            if (amount <= 0) {
              previewItems.push({ status: 'invalid', expense: { description }, error: 'จำนวนเงินต้องมากกว่า 0' })
              continue
            }

            const expenseData: any = {
              uuid,
              expenseDate,
              ...categoryData,
              description,
              vendor,
              unit,
              quantity,
              amount,
              recordedBy: currentUser?.displayName || 'Unknown',
              staffId: currentUser?.id || 0,
              staffUuid: currentUser?.uuid || ''
            }

            // ตรวจสอบว่าเป็น update หรือ new
            let existingId: number | undefined
            if (uuid) {
              const existing = await db.expenses.where('uuid').equals(uuid).first()
              if (existing) existingId = existing.id
            }

            previewItems.push({
              status: existingId ? 'update' : 'new',
              expense: { ...expenseData, id: existingId }
            })
          }

          resolve(previewItems)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
      reader.readAsArrayBuffer(file)
    })
  }

  // ---------------------------------------------------------------------------
  // Import — Execute (บันทึกจริงลง DB)
  // ---------------------------------------------------------------------------
  async function executeImport(items: ExpenseImportPreviewItem[]): Promise<{ success: number; failed: number; results: ImportItemResult[] }> {
    const summary = { success: 0, failed: 0 }
    const results: ImportItemResult[] = []

    for (const item of items) {
      if (item.status === 'invalid') {
        summary.failed++
        results.push({ item, success: false, error: item.error || 'ข้อมูลไม่ถูกต้อง' })
        continue
      }

      try {
        const expenseData: any = { ...item.expense }
        const expenseUuid = expenseData.uuid || uuidv4()

        // จัดการหมวดหมู่ก่อนบันทึก
        let categoryId = expenseData.categoryId
        let categoryUuid = expenseData.categoryUuid

        if (!categoryId && expenseData.categoryName) {
          const name = expenseData.categoryName
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

        const finalData = {
          expenseDate: expenseData.expenseDate,
          categoryId,
          categoryUuid,
          description: expenseData.description,
          vendor: expenseData.vendor ?? undefined,
          unit: expenseData.unit ?? undefined,
          quantity: expenseData.quantity ?? undefined,
          amount: expenseData.amount,
          recordedBy: expenseData.recordedBy,
          staffId: expenseData.staffId,
          staffUuid: expenseData.staffUuid,
          isDeleted: false,
          syncStatus: 'pending' as const,
          updatedAt: new Date()
        }

        if (item.status === 'update' && item.expense.id) {
          await db.expenses.update(item.expense.id, finalData)
        } else {
          await db.expenses.add({
            ...finalData,
            uuid: expenseUuid,
            createdAt: new Date()
          } as Expense)
        }

        summary.success++
        results.push({ item, success: true })
      } catch (err: any) {
        console.error(`❌ Import Failed [${item.expense.description}]:`, err)
        summary.failed++
        results.push({ item, success: false, error: err?.message || 'เกิดข้อผิดพลาดในการบันทึก' })
      }
    }

    return { ...summary, results }
  }

  return {
    exportExpenses,
    downloadTemplate,
    prepareImportData,
    executeImport
  }
}
