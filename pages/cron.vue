<template>
  <div class="cron-panel">
    <h2>定时任务控制面板</h2>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-indicator" :class="{ running: cronStatus.running, stopped: !cronStatus.running }">
        {{ cronStatus.running ? '● 运行中' : '● 已停止' }}
      </div>
      <div class="actions">
        <button v-if="!cronStatus.running" class="btn btn-primary" @click="startCron" :disabled="loading">
          ▶ 启动
        </button>
        <button v-if="cronStatus.running" class="btn btn-danger" @click="stopCron" :disabled="loading">
          ⏹ 停止
        </button>
        <button class="btn btn-outline" @click="refreshStatus" :disabled="loading">
          🔄 刷新
        </button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <h3>任务列表</h3>
      <table class="task-table" v-if="cronStatus.tasks && cronStatus.tasks.length > 0">
        <thead>
          <tr>
            <th>任务名称</th>
            <th>调度时间</th>
            <th>上次运行</th>
            <th>上次结果</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in cronStatus.tasks" :key="task.name">
            <td>{{ task.name }}</td>
            <td><code>{{ task.schedule }}</code></td>
            <td>{{ task.lastRun ? new Date(task.lastRun).toLocaleString('zh-CN') : '尚未运行' }}</td>
            <td class="result-cell">{{ task.lastResult || '-' }}</td>
            <td>
              <button
                class="btn btn-sm btn-outline"
                :disabled="loading || !cronStatus.running"
                @click="triggerTask(task.name)"
              >
                ▶ 手动触发
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无任务数据</div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" class="toast" :class="messageType">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface TaskInfo {
  name: string
  schedule: string
  lastRun: string | null
  lastResult: string | null
}

interface CronStatus {
  running: boolean
  tasks: TaskInfo[]
}

const taskIdMap: Record<string, string> = {
  '首次提醒': 'reminder-first',
  '第 1 次催办': 'followup-1',
  '第 2 次催办': 'followup-2',
  '第 3 次催办': 'followup-3',
  '标记漏扫': 'mark-missed',
}

const cronStatus = ref<CronStatus>({ running: false, tasks: [] })
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

function showMsg(msg: string, type: 'success' | 'error' = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => { message.value = '' }, 4000)
}

async function fetchStatus() {
  loading.value = true
  try {
    const data = await $fetch<CronStatus>('/api/cron/status')
    cronStatus.value = data
  } catch (err: any) {
    showMsg('获取状态失败: ' + (err.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

async function startCron() {
  loading.value = true
  try {
    const data = await $fetch<{ success: boolean; message: string }>('/api/cron/start', { method: 'POST' })
    showMsg(data.message, 'success')
    await fetchStatus()
  } catch (err: any) {
    showMsg('启动失败: ' + (err.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

async function stopCron() {
  loading.value = true
  try {
    const data = await $fetch<{ success: boolean; message: string }>('/api/cron/stop', { method: 'POST' })
    showMsg(data.message, 'success')
    await fetchStatus()
  } catch (err: any) {
    showMsg('停止失败: ' + (err.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

async function triggerTask(name: string) {
  loading.value = true
  try {
    const taskId = taskIdMap[name] || name
    const data = await $fetch<{ success: boolean; result: string }>('/api/cron/trigger', {
      method: 'POST',
      body: { taskId },
    })
    showMsg(data.result, 'success')
    await fetchStatus()
  } catch (err: any) {
    showMsg('触发失败: ' + (err.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

function refreshStatus() {
  fetchStatus()
}

// 初始加载
onMounted(() => {
  fetchStatus()
})
</script>

<style scoped>
.cron-panel {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  font-size: 22px;
  margin-bottom: 20px;
  color: #1f2937;
}

h3 {
  font-size: 16px;
  margin: 0 0 12px;
  color: #374151;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.status-indicator {
  font-size: 16px;
  font-weight: 600;
}

.status-indicator.running {
  color: #16a34a;
}

.status-indicator.stopped {
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
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

.btn-danger {
  background: #ef4444;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-outline {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-outline:hover:not(:disabled) {
  background: #f3f4f6;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.tasks-section {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.task-table th {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 2px solid #e5e7eb;
  color: #6b7280;
  font-weight: 600;
  font-size: 13px;
}

.task-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
}

.task-table code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
}

.result-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 32px;
  font-size: 14px;
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
