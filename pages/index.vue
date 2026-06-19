<template>
  <div class="dashboard">
    <!-- 今日打扫 -->
    <section class="card today-card">
      <div class="today-label">今日打扫</div>
      <div v-if="todayMember" class="today-member">{{ todayMember }}</div>
      <div v-else class="today-member empty-today">暂无排班</div>
      <div class="today-date">{{ today }}</div>
    </section>

    <!-- 本周排班 -->
    <section class="card">
      <h3>本周排班</h3>
      <div class="week-grid">
        <div v-for="(day, i) in weekSchedule" :key="i" class="day-item">
          <div class="day-name">{{ day.name }}</div>
          <div class="day-member">{{ day.member }}</div>
        </div>
      </div>
    </section>

    <!-- 最近记录 -->
    <section class="card">
      <h3>最近记录</h3>
      <div v-if="recentRecords.length === 0" class="empty">暂无记录</div>
      <div v-for="(r, i) in recentRecords" :key="i" class="record-item">
        <span class="record-date">{{ r.date }}</span>
        <span class="record-name">{{ r.name }}</span>
        <span class="status" :class="r.done ? 'done' : 'missed'">
          {{ r.done ? '✅ 完成' : '❌ 未完成' }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
const todayStr = new Date().toISOString().slice(0, 10)

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const todayMember = ref('')
const weekSchedule = ref<Array<{ name: string; member: string }>>([])
const recentRecords = ref<Array<{ date: string; name: string; done: boolean }>>([])

onMounted(async () => {
  // 计算本周起止日期
  const now = new Date()
  const dow = now.getDay() || 7
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const startStr = weekStart.toISOString().slice(0, 10)
  const endStr = weekEnd.toISOString().slice(0, 10)

  // 取更早的日期用于最近记录
  const pastStart = new Date(now)
  pastStart.setDate(pastStart.getDate() - 14)
  const pastStartStr = pastStart.toISOString().slice(0, 10)

  const [scheduleData] = await Promise.all([
    $fetch('/api/schedule', { params: { start: pastStartStr, end: endStr } }),
  ])

  // 今日打扫
  const todayEntries = (scheduleData as Array<{ memberName: string; scheduledDate: string }>).filter(s => s.scheduledDate === todayStr)
  todayMember.value = todayEntries.length > 0 ? todayEntries[0].memberName : ''

  // 本周排班
  const weekSched: Array<{ name: string; member: string }> = weekdays.map((name) => ({ name, member: '' }))
  for (const s of scheduleData as Array<{ memberName: string; scheduledDate: string }>) {
    if (s.scheduledDate >= startStr && s.scheduledDate <= endStr) {
      const dayIdx = new Date(s.scheduledDate).getDay() || 7
      if (dayIdx >= 1 && dayIdx <= 7) {
        weekSched[dayIdx - 1].member = s.memberName
      }
    }
  }
  weekSchedule.value = weekSched

  // 最近记录（取最近完成/漏扫）
  const allRecords = scheduleData as Array<{ scheduledDate: string; memberName: string; status: string }>
  const recents = allRecords
    .filter(s => s.scheduledDate < todayStr && (s.status === 'done' || s.status === 'missed'))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, 5)
    .map(s => ({
      date: s.scheduledDate.slice(5),
      name: s.memberName,
      done: s.status === 'done',
    }))
  recentRecords.value = recents
})
</script>

<style scoped>
.dashboard { padding: 16px; max-width: 600px; margin: 0 auto; }
.card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
h3 { margin: 0 0 16px; font-size: 16px; color: #333; }
.empty { text-align: center; color: #999; padding: 16px; font-size: 14px; }

.today-card { text-align: center; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; }
.today-label { font-size: 13px; opacity: 0.85; margin-bottom: 4px; }
.today-member { font-size: 28px; font-weight: 700; }
.today-member.empty-today { font-size: 16px; opacity: 0.7; }
.today-date { font-size: 13px; opacity: 0.7; margin-top: 4px; }

.week-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; }
.day-item { text-align: center; padding: 8px; background: #f8f9ff; border-radius: 8px; }
.day-name { font-size: 12px; color: #888; margin-bottom: 4px; }
.day-member { font-size: 13px; color: #333; font-weight: 500; }

.record-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.record-item:last-child { border-bottom: none; }
.record-date { color: #888; font-size: 13px; }
.record-name { color: #333; font-weight: 500; }
.status.done { color: #16a34a; }
.status.missed { color: #dc2626; }
</style>
