<template>
  <div class="missed-panel">
    <h2>漏扫管理</h2>
    <p class="subtitle">查看和管理所有漏扫记录</p>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 空状态 -->
    <div v-else-if="missedList.length === 0" class="empty">
      暂无漏扫记录
    </div>

    <!-- 漏扫列表 -->
    <div v-else class="missed-list">
      <div class="missed-header">
        <span class="col-date">日期</span>
        <span class="col-name">成员</span>
        <span class="col-status">状态</span>
        <span class="col-action">操作</span>
      </div>
      <div
        v-for="item in missedList"
        :key="item.id"
        class="missed-item"
        :class="{ cleared: item.status === 'cleared' }"
      >
        <span class="col-date">{{ item.missedDate }}</span>
        <span class="col-name">{{ item.memberName || '未知' }}</span>
        <span class="col-status">
          <span class="badge" :class="item.status === 'missed' ? 'badge-danger' : 'badge-success'">
            {{ item.status === 'missed' ? '漏扫' : '已签收' }}
          </span>
        </span>
        <span class="col-action">
          <button
            v-if="item.status === 'missed'"
            class="btn btn-sm btn-primary"
            :disabled="signingOff === item.id"
            @click="signoff(item)"
          >
            {{ signingOff === item.id ? '处理中...' : '✅ 签收' }}
          </button>
          <span v-else class="cleared-info">
            已由 {{ item.clearedByName || '管理员' }} 签收
          </span>
        </span>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" class="toast" :class="messageType">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface MissedItem {
  id: number
  scheduleId: number
  memberId: number
  memberName: string | null
  missedDate: string
  status: string
  clearedBy: number | null
  clearedByName: string | null
  clearedAt: string | null
}

const missedList = ref<MissedItem[]>([])
const loading = ref(true)
const signingOff = ref<number | null>(null)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

function showMsg(msg: string, type: 'success' | 'error' = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

async function fetchMissed() {
  loading.value = true
  try {
    // 直接从 schedules + missedLogs 联合查询
    const data = await $fetch<MissedItem[]>('/api/schedule/missed')
    missedList.value = data
  } catch (err: any) {
    // 如果 API 不存在，先尝试本地构造
    missedList.value = []
  } finally {
    loading.value = false
  }
}

async function signoff(item: MissedItem) {
  signingOff.value = item.id
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/admin/signoff', {
      method: 'POST',
      body: { scheduleId: item.scheduleId },
    })
    showMsg(res.message || '签收成功', 'success')
    // 更新本地状态
    item.status = 'cleared'
  } catch (err: any) {
    showMsg('签收失败: ' + (err.message || '未知错误'), 'error')
  } finally {
    signingOff.value = null
  }
}

onMounted(() => {
  fetchMissed()
})
</script>

<style scoped>
.missed-panel {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  font-size: 22px;
  margin-bottom: 4px;
  color: #1f2937;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;
}

.loading, .empty {
  text-align: center;
  padding: 48px 16px;
  color: #9ca3af;
  font-size: 15px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.missed-list {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  overflow: hidden;
}

.missed-header {
  display: flex;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.missed-item {
  display: flex;
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  font-size: 14px;
  transition: background 0.15s;
}

.missed-item:hover {
  background: #f9fafb;
}

.missed-item.cleared {
  opacity: 0.6;
}

.col-date { flex: 0 0 120px; color: #374151; }
.col-name { flex: 1; color: #374151; font-weight: 500; }
.col-status { flex: 0 0 80px; }
.col-action { flex: 0 0 160px; text-align: right; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-danger {
  background: #fef2f2;
  color: #dc2626;
}

.badge-success {
  background: #f0fdf4;
  color: #16a34a;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.cleared-info {
  font-size: 12px;
  color: #9ca3af;
}

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

.toast.success {
  background: #16a34a;
  color: #fff;
}

.toast.error {
  background: #ef4444;
  color: #fff;
}
</style>
