<template>
  <div class="history-page">
    <h2>打扫记录</h2>

    <!-- 筛选 -->
    <div class="filters">
      <button :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
      <button :class="{ active: filter === 'done' }" @click="filter = 'done'">已完成</button>
      <button :class="{ active: filter === 'missed' }" @click="filter = 'missed'">未完成</button>
    </div>

    <!-- 记录列表 -->
    <div v-if="filteredRecords.length === 0" class="empty">
      <p>暂无记录</p>
    </div>
    <div v-for="r in filteredRecords" :key="r.id" class="record-card">
      <div class="record-left">
        <div class="record-date">{{ r.date }}</div>
        <div class="record-member">{{ r.member }}</div>
      </div>
      <div class="record-right">
        <span class="status" :class="r.status">
          {{ r.status === 'done' ? '✅ 完成' : '❌ 未完成' }}
        </span>
        <span v-if="r.status === 'done' && r.completedAt" class="time">{{ r.completedAt }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const filter = ref<'all' | 'done' | 'missed'>('all')

const records = ref([
  { id: 1, date: '06-18', member: '张三', status: 'done', completedAt: '20:15' },
  { id: 2, date: '06-17', member: '李四', status: 'done', completedAt: '19:30' },
  { id: 3, date: '06-16', member: '王五', status: 'missed', completedAt: null },
  { id: 4, date: '06-15', member: '张三', status: 'done', completedAt: '20:00' },
  { id: 5, date: '06-14', member: '李四', status: 'done', completedAt: '21:10' },
  { id: 6, date: '06-13', member: '王五', status: 'missed', completedAt: null },
  { id: 7, date: '06-12', member: '张三', status: 'done', completedAt: '19:45' },
  { id: 8, date: '06-11', member: '李四', status: 'missed', completedAt: null },
])

const filteredRecords = computed(() => {
  if (filter.value === 'all') return records.value
  return records.value.filter(r => r.status === filter.value)
})
</script>

<style scoped>
.history-page { padding: 16px; max-width: 600px; margin: 0 auto; }
h2 { font-size: 20px; color: #333; margin: 0 0 16px; }
.filters { display: flex; gap: 4px; margin-bottom: 16px; background: #fff; border-radius: 10px; padding: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.filters button { flex: 1; padding: 10px; border: none; border-radius: 8px; background: transparent; font-size: 14px; cursor: pointer; color: #666; }
.filters button.active { background: #4f46e5; color: #fff; font-weight: 600; }
.empty { text-align: center; padding: 48px 16px; color: #999; font-size: 14px; }
.record-card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center; }
.record-left { }
.record-date { font-size: 13px; color: #888; margin-bottom: 2px; }
.record-member { font-size: 15px; color: #333; font-weight: 500; }
.record-right { text-align: right; }
.status { font-size: 13px; font-weight: 500; }
.time { display: block; font-size: 11px; color: #999; margin-top: 2px; }
</style>
