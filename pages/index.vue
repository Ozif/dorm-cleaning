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

const todayMember = ref('张三')

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const weekSchedule = ref(weekdays.map((name, i) => ({
  name,
  member: ['张三', '李四', '王五', '张三', '李四', '', '休息'][i] || '待排班'
})))

const recentRecords = ref([
  { date: '06-18', name: '张三', done: true },
  { date: '06-17', name: '李四', done: true },
  { date: '06-16', name: '王五', done: false },
  { date: '06-15', name: '张三', done: true },
  { date: '06-14', name: '李四', done: true },
])
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
