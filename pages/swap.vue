<template>
  <div class="swap-page">
    <div class="tabs">
      <button :class="{ active: tab === 'pending' }" @click="tab = 'pending'">待处理</button>
      <button :class="{ active: tab === 'history' }" @click="tab = 'history'">历史</button>
    </div>

    <!-- 待处理 -->
    <div v-if="tab === 'pending'">
      <div v-if="pendingSwaps.length === 0" class="empty">
        <p>暂无待处理的互换请求</p>
      </div>
      <div v-for="swap in pendingSwaps" :key="swap.id" class="swap-card">
        <div class="swap-info">
          <p class="swap-from">{{ swap.fromName }} 👉 请求与 {{ swap.toName }} 互换</p>
          <p class="swap-dates">
            {{ swap.dateA }} ↔ {{ swap.dateB }}
          </p>
        </div>
        <div class="swap-actions" v-if="swap.canApprove">
          <button class="btn-approve" @click="approveSwap(swap.id)">✅ 批准</button>
          <button class="btn-reject" @click="rejectSwap(swap.id)">❌ 拒绝</button>
        </div>
        <div v-else class="swap-pending-badge">⏳ 等待对方确认</div>
      </div>
    </div>

    <!-- 历史 -->
    <div v-else>
      <div v-if="swapHistory.length === 0" class="empty">
        <p>暂无互换记录</p>
      </div>
      <div v-for="swap in swapHistory" :key="swap.id" class="swap-card history">
        <div class="swap-info">
          <p class="swap-from">{{ swap.fromName }} ↔ {{ swap.toName }}</p>
          <p class="swap-dates">{{ swap.dateA }} ↔ {{ swap.dateB }}</p>
        </div>
        <span class="status-badge" :class="swap.status">
          {{ swap.status === 'approved' ? '✅ 已批准' : '❌ 已拒绝' }}
        </span>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
const tab = ref<'pending' | 'history'>('pending')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

interface SwapItem {
  id: number
  fromName: string
  toName: string
  dateA: string
  dateB: string
  canApprove?: boolean
  status?: string
}

const pendingSwaps = ref<SwapItem[]>([])
const swapHistory = ref<SwapItem[]>([])

onMounted(async () => {
  const now = new Date()
  const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
  const end = now.toISOString().slice(0, 10)
  const [swapData, memberData, scheduleData] = await Promise.all([
    $fetch('/api/swap'),
    $fetch('/api/members'),
    $fetch('/api/schedule', { params: { start, end } }),
  ])

  const memberMap = new Map((memberData as Array<{ id: number; name: string }>).map(m => [m.id, m.name]))
  const scheduleMap = new Map((scheduleData as Array<{ id: number; scheduledDate: string }>).map(s => [s.id, s.scheduledDate]))

  const allItems: SwapItem[] = (swapData as Array<{
    id: number
    fromMemberA: number
    toMemberB: number
    scheduleIdA: number
    scheduleIdB: number
    status: string
    canApprove?: boolean
  }>).map(s => ({
    id: s.id,
    fromName: memberMap.get(s.fromMemberA) || '未知',
    toName: memberMap.get(s.toMemberB) || '未知',
    dateA: scheduleMap.get(s.scheduleIdA) || '',
    dateB: scheduleMap.get(s.scheduleIdB) || '',
    canApprove: s.canApprove,
    status: s.status,
  }))

  pendingSwaps.value = allItems.filter(s => s.status === 'pending')
  swapHistory.value = allItems.filter(s => s.status !== 'pending')
}

async function approveSwap(id: number) {
  try {
    await $fetch('/api/swap', { method: 'PUT', body: { swapId: id, action: 'approve' } })
    showToast('已批准互换 ✅', 'success')
    tab.value = 'history'
    // Refresh data
    const now = new Date()
    const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
    const end = now.toISOString().slice(0, 10)
    const swapData = await $fetch('/api/swap')
    const memberData = await $fetch('/api/members')
    const scheduleData = await $fetch('/api/schedule', { params: { start, end } })
    const memberMap = new Map((memberData as Array<{ id: number; name: string }>).map(m => [m.id, m.name]))
    const scheduleMap = new Map((scheduleData as Array<{ id: number; scheduledDate: string }>).map(s => [s.id, s.scheduledDate]))
    const allItems: SwapItem[] = (swapData as Array<any>).map(s => ({
      id: s.id,
      fromName: memberMap.get(s.fromMemberA) || '未知',
      toName: memberMap.get(s.toMemberB) || '未知',
      dateA: scheduleMap.get(s.scheduleIdA) || '',
      dateB: scheduleMap.get(s.scheduleIdB) || '',
      canApprove: s.canApprove,
      status: s.status,
    }))
    pendingSwaps.value = allItems.filter(s => s.status === 'pending')
    swapHistory.value = allItems.filter(s => s.status !== 'pending')
  } catch {
    showToast('批准失败，请重试', 'error')
  }
}

async function rejectSwap(id: number) {
  try {
    await $fetch('/api/swap', { method: 'PUT', body: { swapId: id, action: 'reject' } })
    showToast('已拒绝互换', 'success')
    pendingSwaps.value = pendingSwaps.value.filter(s => s.id !== id)
  } catch {
    showToast('拒绝失败，请重试', 'error')
  }
}
</script>

<style scoped>
.swap-page { padding: 16px; max-width: 600px; margin: 0 auto; }
.tabs { display: flex; gap: 0; margin-bottom: 16px; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.tabs button { flex: 1; padding: 12px; border: none; background: #fff; font-size: 15px; cursor: pointer; color: #666; }
.tabs button.active { background: #4f46e5; color: #fff; font-weight: 600; }
.empty { text-align: center; padding: 48px 16px; color: #999; font-size: 14px; }
.swap-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.swap-card.history { display: flex; justify-content: space-between; align-items: center; }
.swap-info { margin-bottom: 8px; }
.swap-card.history .swap-info { margin-bottom: 0; }
.swap-from { margin: 0 0 4px; font-size: 15px; color: #333; }
.swap-dates { margin: 0; font-size: 13px; color: #888; }
.swap-actions { display: flex; gap: 8px; }
.btn-approve { flex: 1; padding: 10px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-reject { flex: 1; padding: 10px; background: #f3f4f6; color: #666; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; cursor: pointer; }
.swap-pending-badge { text-align: center; color: #d97706; font-size: 14px; }
.status-badge { font-size: 13px; font-weight: 500; }
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.toast.success { background: #16a34a; color: #fff; }
.toast.error { background: #ef4444; color: #fff; }
</style>
