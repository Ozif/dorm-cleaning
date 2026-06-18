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
  </div>
</template>

<script setup lang="ts">
const tab = ref<'pending' | 'history'>('pending')

const pendingSwaps = ref([
  {
    id: 1,
    fromName: '李四',
    toName: '张三',
    dateA: '06-23',
    dateB: '06-25',
    canApprove: true,
  },
  {
    id: 2,
    fromName: '王五',
    toName: '李四',
    dateA: '06-24',
    dateB: '06-26',
    canApprove: false,
  },
])

const swapHistory = ref([
  {
    id: 3,
    fromName: '张三',
    toName: '李四',
    dateA: '06-20',
    dateB: '06-21',
    status: 'approved',
  },
  {
    id: 4,
    fromName: '王五',
    toName: '张三',
    dateA: '06-18',
    dateB: '06-19',
    status: 'rejected',
  },
])

function approveSwap(id: number) {
  alert(`批准互换 #${id}`)
}
function rejectSwap(id: number) {
  alert(`拒绝互换 #${id}`)
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
</style>
