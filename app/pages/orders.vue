<template>
  <div class="h-full flex flex-col bg-surface-950 text-surface-50 min-h-0 overflow-hidden">
    <!-- Header -->
    <header class="p-4 border-b border-surface-800 flex justify-between items-center shrink-0 bg-surface-900/50 backdrop-blur-sm sticky top-0 z-10">
      <NuxtLink to="/" class="btn-touch bg-surface-800 hover:bg-surface-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors">
        <span>⬅️</span>
        <span>กลับหน้าขาย (POS)</span>
      </NuxtLink>
      <h1 class="font-bold text-xl flex items-center gap-3">
        <span>📜</span>
        <span>ประวัติการขาย (Order History)</span>
      </h1>
      <div class="flex gap-2">
        <!-- ปุ่ม Manual Sync -->
        <button 
          @click="handleManualSync"
          :disabled="!isOnline || isSyncing || (pendingCount === 0 && pendingStockAuditCount === 0)"
          class="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg transition-all text-xs font-bold shadow-lg shadow-primary-900/20"
          :class="(!isOnline || (pendingCount === 0 && pendingStockAuditCount === 0 && !isSyncing)) ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-primary-500 active:scale-95 cursor-pointer'"
          title="ส่งข้อมูลที่ค้างอยู่ขึ้น Server"
        >
          <span>{{ !isOnline ? 'รอออนไลน์ 📵' : (isSyncing ? 'กำลังซิงค์...' : (pendingCount === 0 && pendingStockAuditCount === 0 ? 'ข้อมูลเป็นปัจจุบันแล้ว' : 'ซิงค์ข้อมูลตอนนี้')) }}</span>
          <span :class="{ 'animate-spin': isSyncing }">🔄</span>
        </button>

        <button 
          @click="loadOrders()" 
          class="p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
          title="Refresh"
        >
          🔄
        </button>

        <!-- ปุ่มดึงข้อมูลจาก Cloud -->
        <button 
          @click="handleFetchCloud"
          :disabled="!isOnline || isFetchingRemote"
          class="flex items-center gap-2 px-4 py-2 bg-amber-500 text-surface-950 rounded-lg transition-all text-xs font-bold shadow-lg shadow-amber-900/20"
          :class="(!isOnline || isFetchingRemote) ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-amber-400 active:scale-95 cursor-pointer'"
          title="ดึงประวัติการขายจาก Cloud ลงเครื่อง"
        >
          <span class="flex items-center gap-2">
            <span>{{ isFetchingRemote ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Cloud' }}</span>
            <span v-if="!isFetchingRemote">☁️</span>
          </span>
          <span v-if="isFetchingRemote" class="w-3 h-3 border-2 border-surface-950/30 border-t-surface-950 rounded-full animate-spin"></span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto p-4 md:p-8">
      <div class="max-w-6xl mx-auto space-y-6">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center p-20 space-y-4">
          <div class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-surface-500">กำลังโหลดคำสั่งซื้อ...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="orders.length === 0" class="flex flex-col items-center justify-center p-20 space-y-4 text-surface-500">
          <span class="text-6xl opacity-20">📭</span>
          <p>ยังไม่มีประวัติการขายในระบบของคุณ</p>
          <NuxtLink to="/" class="text-primary-400 hover:underline">เริ่มการขายใหม่</NuxtLink>
        </div>

        <!-- Orders Table -->
        <div v-else class="space-y-4">
          <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm border-collapse">
                <thead class="bg-surface-950 text-surface-500 uppercase text-[10px] font-bold tracking-widest border-b border-surface-800">
                  <tr>
                    <th class="px-6 py-4">วันที่/เวลา</th>
                    <th class="px-6 py-4">เลขออร์เดอร์</th>
                    <th class="px-6 py-4">ยอดขายสุทธิ</th>
                    <th class="px-6 py-4">ช่องทาง / สถานะ</th>
                    <th class="px-6 py-4">การ Sync</th>
                    <th class="px-6 py-4 text-right">คำสั่ง</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-800">
                  <tr 
                    v-for="order in orders" 
                    :key="order.id" 
                    class="hover:bg-surface-800/30 transition-colors group"
                    :class="{ 'opacity-50 grayscale': order.status === 'cancelled' }"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="font-medium">{{ formatDisplayDate(order.createdAt).date }}</div>
                      <div class="text-[10px] text-surface-500">{{ formatDisplayDate(order.createdAt).time }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-xs bg-surface-950 px-2 py-1 rounded border border-surface-800" :class="{ 'line-through': order.status === 'cancelled' }">
                          {{ order.orderNumber }}
                        </span>
                        <span 
                          v-if="order.status === 'cancelled'"
                          class="bg-danger/10 text-danger text-[9px] px-1.5 py-0.5 rounded border border-danger/20 font-bold uppercase"
                        >
                          ยกเลิกแล้ว
                        </span>
                        <span 
                          v-else
                          class="bg-success/10 text-success text-[9px] px-1.5 py-0.5 rounded border border-success/20 font-bold uppercase"
                        >
                          สำเร็จ
                        </span>
                      </div>
                      <div v-if="order.note" class="text-[10px] text-surface-500 mt-1 italic line-clamp-1">
                        📝 {{ order.note }}
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="font-bold text-primary-400" :class="{ 'line-through': order.status === 'cancelled' }">
                        ฿{{ order.totalAmount.toLocaleString() }}
                      </div>
                      <div class="text-[10px] text-surface-500">{{ order.items.length }} รายการ</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-col gap-2">
                        <!-- Payment Method -->
                        <div class="flex items-center gap-2">
                          <span 
                            class="px-2 py-0.5 rounded text-[10px] font-bold border"
                            :class="[
                              order.paymentMethod === 'cash' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                              order.paymentMethod === 'promptpay' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              'bg-surface-800 text-surface-400 border-surface-700'
                            ]"
                          >
                            {{ 
                              order.paymentMethod === 'cash' ? '💵 เงินสด' : 
                              order.paymentMethod === 'promptpay' ? '📱 พร้อมเพย์' : 
                              order.paymentMethod === 'card' ? '💳 บัตร' : '🌀 อื่นๆ' 
                            }}
                          </span>
                        </div>

                        <!-- Delivery Status -->
                        <div v-if="order.deliveryRef" class="flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          <span class="text-orange-400 text-[10px] font-bold">
                            RIDER: {{ order.deliveryRef }}
                          </span>
                        </div>
                        <div v-else class="text-surface-500 text-[10px] flex items-center gap-1">
                          <span>🚶</span>
                          <span>หน้าร้าน</span>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div v-if="order.syncStatus === 'synced'" class="flex items-center gap-2 text-green-400 text-xs font-medium">
                        <span class="flex items-center justify-center w-5 h-5 rounded-full bg-green-400/10 text-[10px]">✔️</span>
                        <span>บนคลาวด์</span>
                      </div>
                      <div v-else class="flex items-center gap-2 text-yellow-400 text-xs font-medium">
                        <span class="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400/10 text-[10px]">⏳</span>
                        <span>ออฟไลน์</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex justify-end gap-2">
                        <button 
                          @click="reprint(order)" 
                          class="btn-touch px-3 py-1 bg-surface-800 text-surface-300 rounded-lg hover:bg-surface-700 transition-all text-xs font-bold border border-surface-700"
                        >
                          พิมพ์
                        </button>
                        <button 
                          v-if="order.status !== 'cancelled'"
                          @click="confirmCancelOrder(order)" 
                          class="btn-touch px-3 py-1 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all text-xs font-bold border border-danger/20"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Load More Button -->
          <div v-if="hasMore" class="flex justify-center pb-8">
            <button 
              @click="loadMore"
              :disabled="isLoadingMore"
              class="btn-touch px-8 py-2 bg-surface-900 border border-surface-800 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-all text-sm font-bold disabled:opacity-50"
            >
              <span v-if="isLoadingMore">กำลังโหลด...</span>
              <span v-else>🏠 โหลดข้อมูลเพิ่มเติม</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import type { Order } from '~/types'
import { usePosStore } from '~/stores/pos'
import { useInventory } from '~/composables/useInventory'
import { useSync } from '~/composables/useSync'
import { useToast } from '~/composables/useToast'

const orders = ref<Order[]>([])
const isLoading = ref(true)
const { isOnline, isSyncing, syncPendingOrders, fetchRemoteOrders, pendingCount, pendingStockAuditCount, refreshPendingCount } = useSync()
const toast = useToast()
const isFetchingRemote = ref(false)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const page = ref(0)
const PAGE_SIZE = 20

const posStore = usePosStore()
const { restoreStock } = useInventory()

const loadOrders = async (reset = true) => {
  if (reset) {
    isLoading.value = true
    page.value = 0
    orders.value = []
    hasMore.value = true
  } else {
    isLoadingMore.value = true
  }

  try {
    // โหลดออเดอร์เรียงจากใหม่ไปเก่า
    const newOrders = await db.orders
      .orderBy('createdAt')
      .reverse()
      .offset(page.value * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray()

    if (newOrders.length < PAGE_SIZE) {
      hasMore.value = false
    }

    orders.value = [...orders.value, ...newOrders]
  } catch (e) {
    console.error('Failed to load orders:', e)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const loadMore = () => {
  page.value++
  loadOrders(false)
}

const handleManualSync = async () => {
  if (!isOnline.value || isSyncing.value) return
  
  try {
    const res = await syncPendingOrders(true)
    
    // สร้างข้อความแจ้งเตือนละเอียด
    const lines = ['📤 สรุปการซิงค์ข้อมูล:']
    
    if (res.orders.total > 0) {
      lines.push(`✅ ออร์เดอร์: สำเร็จ ${res.orders.success}/${res.orders.total}`)
      if (res.orders.failed > 0) lines.push(`❌ ล้มเหลว ${res.orders.failed} ใบ`)
    } else {
      lines.push('ℹ️ ไม่มีออร์เดอร์ใหม่ที่ต้องซิงค์')
    }

    if (res.auditLogs.total > 0) {
      lines.push(`📦 สต็อก: สำเร็จ ${res.auditLogs.success}/${res.auditLogs.total}`)
    }

    const allErrors = [...res.orders.errors, ...res.auditLogs.errors]
    if (allErrors.length > 0) {
      lines.push('\n⚠️ ข้อผิดพลาด:')
      allErrors.slice(0, 2).forEach(e => lines.push(`• ${e}`))
    }

    toast.success(lines.join('\n'), allErrors.length > 0 ? 10000 : 5000)
    
    // อัปเดตรายการในหน้าจอ
    await loadOrders(true)
  } catch (error: any) {
    toast.error(`การซิงค์ล้มเหลว: ${error.message}`)
  }
}

const handleFetchCloud = async () => {
  if (!isOnline.value || isFetchingRemote.value) return
  
  isFetchingRemote.value = true
  try {
    const count = await fetchRemoteOrders(100) // ดึง 100 รายการล่าสุด (รวมข้อมูลพนักงาน/สินค้า)
    if (count > 0) {
      toast.success(`ดึงข้อมูลสำเร็จ!\n• นำเข้าออร์เดอร์ใหม่ ${count} รายการ\n• อัปเดตข้อมูลสินค้าและพนักงานเรียบร้อย`)
      await loadOrders(true) // รีโหลดหน้าจอ
    } else {
      toast.info('ข้อมูลออร์เดอร์เป็นปัจจุบันแล้ว (อัปเดตข้อมูลหลักเรียบร้อย)')
    }
  } catch (error: any) {
    toast.error(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}`)
  } finally {
    isFetchingRemote.value = false
  }
}

const confirmCancelOrder = async (order: Order) => {
  const confirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำสั่งซื้อ ${order.orderNumber}?\n(ระบบจะทำการคืนสต็อกสินค้าโดยอัตโนมัติ)`)
  if (!confirmed) return

  try {
    console.log(`⏳ กำลังยกเลิกออเดอร์: ${order.orderNumber}...`)
    
    // 1. คืนสต็อก
    await restoreStock(order.items)

    // 2. อัปเดตสถานะออเดอร์ในฐานข้อมูล
    await db.orders.update(order.id!, {
      status: 'cancelled',
      syncStatus: 'pending', // เตรียมส่งขึ้น Server เพื่อยกเลิก
      syncRetryCount: 0      // รีเซ็ตจำนวนครั้งที่ลองเพื่อให้ระบบซิงค์ทันที
    })

    // 3. อัปเดต UI (Reactivity)
    const idx = orders.value.findIndex(o => o.id === order.id)
    if (idx !== -1) {
      // ใช้การแทนที่ทั้ง Object เพื่อให้ Vue ตรวจพบการเปลี่ยนแปลงที่ nested property แน่นอน
      // ใช้ตัวแปร order ที่ส่งเข้ามาเพื่อหลีกเลี่ยงปัญหา Type undefined จากการเข้าถึง array ด้วย index
      orders.value[idx] = { ...order, status: 'cancelled' }
    }

    console.log(`✅ ยกเลิกออเดอร์ ${order.orderNumber} สำเร็จ`)
    toast.success('ยกเลิกออเดอร์และคืนสต็อกเรียบร้อยแล้ว')
  } catch (e: any) {
    console.error('❌ ไม่สามารถยกเลิกออเดอร์ได้:', e)
    toast.error(`ไม่สามารถยกเลิกได้: ${e.message}`)
  }
}

const formatDisplayDate = (date: Date | string) => {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()

  const dateStr = isToday 
    ? 'วันนี้' 
    : d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  
  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  return { date: dateStr, time: timeStr }
}

const formatDate = (date: Date | string) => {
  const { date: dStr, time: tStr } = formatDisplayDate(date)
  return `${dStr} ${tStr}`
}

const reprint = (order: Order) => {
  posStore.setLastOrder(order)
  setTimeout(() => {
    window.print()
  }, 200) // รอให้ Receipt Render ก่อน
}

onMounted(() => {
  loadOrders()
  refreshPendingCount() // ตรวจสอบจำนวนรายการที่ต้องซิงค์เมื่อเข้าหน้านี้
})

// รีเฟรชข้อมูลในหน้าจออัตโนมัติเมื่อการ Sync เสร็จสิ้น
watch(isSyncing, (newValue, oldValue) => {
  if (oldValue === true && newValue === false) {
    loadOrders(true) // โหลดใหม่ทั้งหมดเพื่ออัปเดตสถานะ Sync ล่าสุด
  }
})
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--color-surface-800);
  border-radius: 10px;
}
</style>
