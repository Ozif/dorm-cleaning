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
    <div v-for="r in paginatedRecords" :key="r.id" class="record-card">
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

    <!-- 分页控制 -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="currentPage === 1" @click="currentPage--" class="page-btn">上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button :disabled="currentPage === totalPages" @click="currentPage++" class="page-btn">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const filter = ref<'all' | 'done' | 'missed'>('all')

interface Record {
  id: number
  date: string
  member: string
  status: 'done' | 'missed'
  completedAt: string | null
}

const records = ref<Record[]>([])

onMounted(async () => {
  const now = new Date()
  const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
  const end = now.toISOString().slice(0, 10)
  const data: Array<{ id: number; scheduledDate: string; memberName: string; status: string; completedAt: string | null }> = await $fetch('/api/schedule', { params: { start, end } })
  records.value = data
    .filter(s => s.status === 'done' || s.status === 'missed')
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .map(s => ({
      id: s.id,
      date: s.scheduledDate,
      member: s.memberName,
      status: s.status as 'done' | 'missed',
      completedAt: s.completedAt ? s.completedAt.slice(11, 16) : null,
    }))
})

const filteredRecords = computed(() => {
  if (filter.value === 'all') return records.value
  return records.value.filter(r => r.status === filter.value)
})

// 分页
const currentPage = ref(1)
const pageSize = 10
const totalPages = computed(() => Math.ceil(filteredRecords.value.length / pageSize) || 1)

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredRecords.value.slice(start, end)
})

watch(filter, () => {
  currentPage.value = 1
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

/* 分页 */
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
.page-btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; color: #666; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #666; font-weight: 500; }
</style>
