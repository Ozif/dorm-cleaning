<template>
  <div class="config-page">
    <!-- 打扫频率设置 -->
    <section class="card">
      <h3>打扫频率</h3>
      <div class="form-row">
        <label>频率类型</label>
        <select v-model="frequencyType">
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </div>
      <div class="form-row">
        <label>每周期打扫次数</label>
        <input v-model.number="frequencyCount" type="number" min="1" max="30" />
      </div>
      <button class="btn" @click="saveConfig">保存配置</button>
    </section>

    <!-- 任务列表管理 -->
    <section class="card">
      <h3>打扫任务列表</h3>
      <ul class="task-list">
        <li v-for="(task, i) in tasks" :key="i" class="task-item">
          <span>{{ task.taskName }}</span>
          <button class="btn-sm danger" @click="removeTask(i)">删除</button>
        </li>
      </ul>
      <div class="add-task">
        <input v-model="newTask" placeholder="输入任务名称" @keyup.enter="addTask" />
        <button class="btn-sm" @click="addTask">添加</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const frequencyType = ref<'weekly' | 'monthly'>('weekly')
const frequencyCount = ref(3)
const tasks = ref<Array<{ id: number; taskName: string }>>([])
const newTask = ref('')

onMounted(async () => {
  const [config, taskList] = await Promise.all([
    $fetch('/api/dorm/config'),
    $fetch('/api/dorm/tasks'),
  ])
  frequencyType.value = config.frequencyType
  frequencyCount.value = config.frequencyCount
  tasks.value = taskList
})

async function addTask() {
  if (newTask.value.trim()) {
    await $fetch('/api/dorm/tasks', { method: 'POST', body: { taskName: newTask.value.trim() } })
    newTask.value = ''
    tasks.value = await $fetch('/api/dorm/tasks')
  }
}
async function removeTask(i: number) {
  await $fetch('/api/dorm/tasks/delete', { method: 'POST', body: { taskId: tasks.value[i].id } })
  tasks.value = await $fetch('/api/dorm/tasks')
}
async function saveConfig() {
  await $fetch('/api/dorm/config', { method: 'PUT', body: { frequencyType: frequencyType.value, frequencyCount: frequencyCount.value } })
  alert('配置已保存 ✅')
}
</script>

<style scoped>
.config-page { padding: 16px; max-width: 600px; margin: 0 auto; }
.card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
h3 { margin: 0 0 16px; font-size: 16px; color: #333; }
.form-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.form-row label { font-size: 14px; color: #666; }
.form-row select, .form-row input { width: 60%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.task-list { list-style: none; padding: 0; margin: 0 0 12px; }
.task-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.add-task { display: flex; gap: 8px; }
.add-task input { flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.btn { width: 100%; padding: 10px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
.btn-sm { padding: 6px 12px; border-radius: 6px; border: 1px solid #ddd; background: #fff; cursor: pointer; font-size: 13px; }
.btn-sm.danger { color: #dc2626; border-color: #dc2626; }
</style>
