<template>
  <div class="h-full flex flex-col bg-surface-950 text-surface-50 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-900/50">
      <div class="flex items-center gap-4">
        <button 
          @click="posStore.setViewMode('pos')"
          class="p-3 bg-surface-800 hover:bg-surface-700 rounded-xl transition-all active:scale-90 border border-surface-700 flex items-center gap-2 text-surface-400 hover:text-white"
        >
          <ArrowLeft :size="20" />
          <span class="text-sm font-bold">กลับหน้าขาย</span>
        </button>
        <div class="h-8 w-px bg-surface-800 mx-2"></div>
        <h2 class="text-2xl font-black flex items-center gap-3">
          <span class="text-primary-500"><Utensils :size="28" /></span>
          <span>จอสั่งงานห้องเครื่อง (KDS)</span>
          <span v-if="posStore.kitchenFilter === 'ready'" class="text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-full uppercase tracking-tighter">
            เฉพาะรอเสิร์ฟ
          </span>
        </h2>
        <div class="flex items-center gap-2 px-3 py-1 bg-surface-800 rounded-full border border-surface-700">
          <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span class="text-[10px] font-bold tracking-widest uppercase">Real-time Kitchen Sync</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right mr-4">
          <div class="text-[10px] text-surface-500 font-bold uppercase tracking-widest">ออร์เดอร์ที่ค้างอยู่</div>
          <div class="text-xl font-black text-primary-400">{{ pendingOrders.length }} รายการ</div>
        </div>
        <button 
          @click="loadOrders" 
          class="p-3 bg-surface-800 hover:bg-surface-700 rounded-xl transition-all active:scale-90 border border-surface-700"
          title="Refresh"
        >
          <RefreshCw :size="20" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Kitchen Orders Grid -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden p-6">
      <div v-if="pendingOrders.length === 0" class="h-full flex flex-col items-center justify-center text-surface-600 gap-6">
        <div class="w-32 h-32 bg-surface-900 rounded-full flex items-center justify-center border-4 border-surface-800 shadow-inner">
          <ChefHat :size="64" class="opacity-20" />
        </div>
        <div class="text-center">
          <h3 class="text-2xl font-bold text-surface-400">ยังไม่มีออร์เดอร์ใหม่</h3>
          <p class="text-surface-600 mt-2 font-medium italic">"ความพยายามอยู่ที่ไหน ยำอยู่ที่นั่น..."</p>
        </div>
      </div>

      <div v-else class="flex gap-6 h-full items-start">
        <div 
          v-for="order in pendingOrders" 
          :key="order.id"
          class="w-[350px] shrink-0 bg-surface-900 border-2 rounded-[2rem] flex flex-col overflow-hidden transition-all shadow-2xl animate-in fade-in slide-in-from-right-10"
          :class="[
            order.kitchenStatus === 'preparing' ? 'border-amber-500/50 shadow-amber-900/10' : 
            order.kitchenStatus === 'ready' ? 'border-green-500/50 shadow-green-900/10' : 
            'border-surface-800'
          ]"
        >
          <!-- Order Header -->
          <div class="p-5 border-b border-surface-800 bg-surface-950/40 relative overflow-hidden">
             <!-- Status Badge -->
             <div 
              class="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest border-l border-b"
              :class="[
                order.kitchenStatus === 'preparing' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                order.kitchenStatus === 'ready' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                'bg-surface-800 text-surface-400 border-surface-700'
              ]"
            >
              {{ 
                order.kitchenStatus === 'pending' ? 'รอเตรียม' : 
                order.kitchenStatus === 'preparing' ? 'กำลังปรุง' : 
                'ปรุงเสร็จแล้ว' 
              }}
            </div>

            <div class="flex flex-col gap-1">
              <div class="text-2xl font-black tracking-tight text-surface-50">#{{ order.orderNumber.split('-').pop() }}</div>
              <div class="flex items-center gap-2 text-surface-500 text-xs font-bold">
                <Clock :size="12" />
                <span>{{ getTimeElapsed(order.createdAt) }}</span>
                <span v-if="order.deliveryRef" class="ml-2 px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[10px] border border-orange-500/20">🛵 {{ order.deliveryRef }}</span>
              </div>
            </div>
          </div>

          <!-- Items List -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            <div v-for="(item, idx) in order.items" :key="idx" class="flex flex-col gap-1.5">
              <div class="flex justify-between items-start gap-4">
                <div class="flex gap-3 items-start">
                  <div class="w-7 h-7 flex items-center justify-center bg-surface-800 text-primary-400 rounded-lg text-sm font-black border border-surface-700">
                    {{ item.quantity }}
                  </div>
                  <div class="flex-1">
                    <div class="text-sm font-bold leading-tight text-surface-100">{{ item.productName }}</div>
                    <!-- Addons -->
                    <div v-if="item.addons && item.addons.length" class="flex flex-wrap gap-1 mt-1.5">
                      <span v-for="addon in item.addons" :key="addon.id" class="text-[10px] bg-primary-500/5 text-primary-400/80 px-1.5 py-0.5 rounded border border-primary-500/10 font-medium">
                        + {{ addon.name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="order.note" class="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <div class="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest mb-1">หมายเหตุพิเศษ:</div>
              <div class="text-xs text-amber-400 italic">"{{ order.note }}"</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="p-5 bg-surface-950/40 border-t border-surface-800 grid grid-cols-1 gap-3">
            <button 
              v-if="order.kitchenStatus === 'pending'"
              @click="updateStatus(order, 'preparing')"
              class="w-full py-4 bg-amber-500 hover:bg-amber-400 text-surface-950 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
            >
              <Flame :size="20" />
              <span>เริ่มปรุงอาหาร</span>
            </button>
            
            <button 
              v-if="order.kitchenStatus === 'preparing'"
              @click="updateStatus(order, 'ready')"
              class="w-full py-4 bg-green-500 hover:bg-green-400 text-surface-950 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
            >
              <CheckCircle :size="20" />
              <span>ปรุงเสร็จแล้ว</span>
            </button>

            <button 
              v-if="order.kitchenStatus === 'ready'"
              @click="updateStatus(order, 'served')"
              class="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary-900/20"
            >
              <Check :size="20" />
              <span>เสิร์ฟเรียบร้อย</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import { liveQuery } from 'dexie'
import type { Order, KitchenStatus } from '~/types'
import { usePosStore } from '~/stores/pos'
import { 
  Utensils, 
  Clock, 
  CheckCircle, 
  Check, 
  Flame, 
  RefreshCw, 
  ChefHat,
  ArrowLeft
} from 'lucide-vue-next'

const posStore = usePosStore()
const pendingOrders = ref<Order[]>([])
const isLoading = ref(true)
const now = ref(new Date())

// ---------------------------------------------------------------------------
// Real-time Sync with Dexie liveQuery
// ---------------------------------------------------------------------------
let subscription: any = null

onMounted(() => {
  // ใช้ liveQuery เพื่อติดตามการเปลี่ยนแปลงใน DB แบบ Real-time
  const observable = liveQuery(async () => {
    // กำหนดเงื่อนไขสถานะที่จะดึงตาม Filter ใน Store
    const targetStatuses = posStore.kitchenFilter === 'ready' 
      ? ['ready'] 
      : ['pending', 'preparing', 'ready']

    const orders = await db.orders
      .where('kitchenStatus')
      .anyOf(targetStatuses)
      .and(o => !o.isDeleted)
      .toArray()
    
    // เรียงตามสถานะ (กำลังทำ > รอทำ > เสร็จแล้ว) และเวลาที่สั่ง
    return orders.sort((a, b) => {
      const statusOrder = { 'preparing': 0, 'pending': 1, 'ready': 2 }
      const sA = statusOrder[a.kitchenStatus as keyof typeof statusOrder] ?? 99
      const sB = statusOrder[b.kitchenStatus as keyof typeof statusOrder] ?? 99
      
      if (sA !== sB) return sA - sB
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })

  subscription = observable.subscribe({
    next: (val) => {
      pendingOrders.value = val
      isLoading.value = false
    },
    error: (err) => {
      console.error('KDS LiveQuery Error:', err)
      isLoading.value = false
    }
  })
})

// อัปเดตเวลาทุกนาทีเพื่อให้เวลาที่ผ่านไป (Elapsed Time) เที่ยงตรง
let timer: any = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 10000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (subscription) subscription.unsubscribe()
})

async function loadOrders() {
  // ไม่ต้องใช้แล้วเพราะ liveQuery ทำงานแทน แต่เก็บไว้เผื่อปุ่ม Refresh แมนนวล
  isLoading.value = true
  setTimeout(() => isLoading.value = false, 500)
}

async function updateStatus(order: Order, newStatus: KitchenStatus) {
  try {
    await db.orders.update(order.id!, { 
      kitchenStatus: newStatus,
      updatedAt: new Date(),
      syncStatus: 'pending' // เพื่อให้ซิงค์ขึ้น Cloud ด้วย
    })
    
    // หมายเหตุ: ไม่ต้องอัปเดต pendingOrders.value ด้วยตัวเอง
    // เพราะ liveQuery ที่ประกาศไว้ใน onMounted จะตรวจพบการเปลี่ยนแปลงใน DB
    // และทำการอัปเดต UI ให้เราโดยอัตโนมัติแบบ Real-time อยู่แล้วครับ
  } catch (error) {
    alert('ไม่สามารถอัปเดตสถานะได้')
  }
}

function getTimeElapsed(createdAt: Date) {
  const diff = now.value.getTime() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'เมื่อสักครู่'
  return `${minutes} นาทีที่แล้ว`
}

// คอยดูการเปลี่ยนแปลงใน DB (เผื่อมีการสั่งจากหน้าขาย)
// ในสถานการณ์จริงอาจใช้ Dexie liveQuery หรือ Watcher
watch(() => db.orders, () => {
  loadOrders()
}, { deep: true })
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
