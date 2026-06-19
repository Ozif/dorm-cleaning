<template>
  <div class="schedule-page">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="view-toggle">
        <button :class="{ active: view === 'week' }" @click="view = 'week'">周视图</button>
        <button :class="{ active: view === 'month' }" @click="view = 'month'">月视图</button>
      </div>
      <div class="nav">
        <button @click="prevPeriod" class="nav-btn">◀</button>
        <span class="period-label">{{ periodLabel }}</span>
        <button @click="nextPeriod" class="nav-btn">▶</button>
      </div>
      <button class="btn-generate" @click="showGenerate = true">生成排班</button>
    </div>

    <!-- 周视图 -->
    <div v-if="view === 'week'" class="week-grid">
      <div class="grid-header">
        <div class="header-member">成员</div>
        <div v-for="day in weekDays" :key="day.date" class="header-day">
          <div class="day-name">{{ day.day }}</div>
          <div class="day-date">{{ day.date }}</div>
        </div>
      </div>

      <div class="grid-body">
        <div v-for="member in members" :key="member.id" class="grid-row">
          <div class="row-member">{{ member.name }}</div>
          <div
            v-for="day in weekDays"
            :key="day.date"
            class="row-cell"
            :class="getCellClass(member.id, day.date)"
            @click="openAction(member, day)"
          >
            <span v-if="getSchedule(member.id, day.date) === 'done'" class="icon-done">✅</span>
            <span v-else-if="getSchedule(member.id, day.date) === 'missed'" class="icon-missed">❌</span>
            <span v-else-if="getSchedule(member.id, day.date) === 'assigned'" class="icon-assigned">●</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 月视图 -->
    <div v-else class="month-grid">
      <div class="month-header">
        <div v-for="d in ['周一','周二','周三','周四','周五','周六','周日']" :key="d" class="month-header-day">{{ d }}</div>
      </div>
      <div class="month-body">
        <div v-for="(day, i) in monthDays" :key="i" class="month-cell" :class="{ 'other-month': !day.currentMonth }" @click="day.currentMonth && openDayDetail(day)">
          <div class="month-date">{{ day.dayNum }}</div>
          <div v-for="s in day.schedules" :key="s.memberId" class="month-member" :class="s.status">
            {{ s.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- 操作弹窗 -->
    <div v-if="selectedDay" class="modal-overlay" @click.self="selectedDay = null">
      <div class="modal-card">
        <h4>{{ selectedDay.date }}</h4>
        <div v-if="selectedDay.members.length === 0" class="empty">暂无排班数据</div>
        <div v-for="m in selectedDay.members" :key="m.memberId" class="member-block">
          <p class="modal-member">{{ m.memberName }}</p>
          <div class="modal-actions">
            <button class="btn-action done" @click="markDone({memberId: m.memberId, date: selectedDay.date})">✅ 打卡完成</button>
            <button class="btn-action swap" @click="initiateSwap({memberId: m.memberId, date: selectedDay.date})">🔄 发起互换</button>
          </div>
        </div>
        <button class="btn-action cancel" @click="selectedDay = null" style="margin-top: 12px;">关闭</button>
      </div>
    </div>

    <!-- 互换弹窗 -->
    <div v-if="showSwapDialog" class="modal-overlay" @click.self="showSwapDialog = false">
      <div class="modal-card">
        <h4>发起互换</h4>
        <p>您的日期：{{ swapFromDate }}</p>
        <div class="form-group">
          <label>选择互换对象</label>
          <select v-model="swapTargetMemberId" class="form-select">
            <option value="0" disabled>请选择成员</option>
            <option v-for="m in otherMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="form-group" v-if="swapTargetMemberId">
          <label>选择对方日期</label>
          <select v-model="swapTargetScheduleId" class="form-select">
            <option value="0" disabled>请选择日期</option>
            <option v-for="s in targetSchedules" :key="s.id" :value="s.id">{{ s.scheduledDate }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-action done" :disabled="!swapTargetScheduleId" @click="confirmSwap">确认互换</button>
          <button class="btn-action cancel" @click="showSwapDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 生成排班弹窗 -->
    <div v-if="showGenerate" class="modal-overlay" @click.self="showGenerate = false">
      <div class="modal-card">
        <h4>生成排班</h4>
        <div class="form-group">
          <label>开始日期</label>
          <input v-model="generateStart" type="date" />
        </div>
        <div class="form-group">
          <label>生成天数</label>
          <input v-model.number="generateDays" type="number" min="1" max="90" />
        </div>
        <div class="modal-actions">
          <button class="btn-action done" @click="doGenerate">确认生成</button>
          <button class="btn-action cancel" @click="showGenerate = false">取消</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
const view = ref<'week' | 'month'>('week')
const showGenerate = ref(false)
const generateStart = ref('')
const generateDays = ref(7)
const selectedDay = ref<{date: string; members: Array<{memberId: number; memberName: string}>} | null>(null)
const showSwapDialog = ref(false)
const swapFromScheduleId = ref<number>(0)
const swapFromDate = ref('')
const swapFromMemberId = ref<number>(0)
const swapTargetMemberId = ref<number>(0)
const swapTargetScheduleId = ref<number>(0)
const targetSchedules = ref<Array<{id: number; scheduledDate: string; status: string}>>([])
const otherMembers = computed(() => members.value.filter(m => m.id !== swapFromMemberId.value))

const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

const members = ref<Array<{ id: number; name: string }>>([])
const scheduleMap = ref<Record<number, Record<string, string>>>({})
const markingDone = ref(false)

// 本周日期
const today = new Date()
const dayOfWeek = today.getDay() || 7
const weekStart = ref(new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek + 1))

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.value)
    d.setDate(weekStart.value.getDate() + i)
    days.push({
      date: d.toISOString().slice(0, 10),
      day: ['周一','周二','周三','周四','周五','周六','周日'][i],
      full: d.toISOString().slice(0, 10),
    })
  }
  return days
})

const weekStartStr = computed(() => weekDays.value[0]?.full || '')
const weekEndStr = computed(() => weekDays.value[6]?.full || '')

const periodLabel = computed(() => {
  if (view.value === 'week') {
    const start = weekDays.value[0]
    const end = weekDays.value[6]
    return `${start.full} ~ ${end.full}`
  }
  return `${weekStart.value.getFullYear()}年${weekStart.value.getMonth() + 1}月`
})

// 月视图数据
const monthDays = computed(() => {
  const year = weekStart.value.getFullYear()
  const month = weekStart.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const days = []
  
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ dayNum: d.getDate(), currentMonth: false, schedules: [] })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const scheds: Array<{ memberId: number; name: string; status: string }> = []
    for (const [memberIdStr, dates] of Object.entries(scheduleMap.value)) {
      const status = dates[dateStr]
      if (status) {
        const m = members.value.find(mm => mm.id === Number(memberIdStr))
        scheds.push({ memberId: Number(memberIdStr), name: m?.name || '未知', status })
      }
    }
    days.push({ dayNum: i, currentMonth: true, schedules: scheds, date: dateStr })
  }
  return days
})

async function loadData() {
  const [memberData, scheduleData] = await Promise.all([
    $fetch('/api/members'),
    $fetch('/api/schedule', { params: { start: weekStartStr.value, end: weekEndStr.value } }),
  ])
  members.value = memberData.map((m: any) => ({ id: m.id, name: m.name }))
  const map: Record<number, Record<string, string>> = {}
  for (const s of scheduleData as Array<{ memberId: number; scheduledDate: string; status: string }>) {
    if (!map[s.memberId]) map[s.memberId] = {}
    map[s.memberId][s.scheduledDate] = s.status
  }
  scheduleMap.value = map
}

onMounted(loadData)
watch(weekStart, loadData)

function getSchedule(memberId: number, date: string): string {
  return scheduleMap.value[memberId]?.[date] || ''
}

function getCellClass(memberId: number, date: string): string {
  const s = getSchedule(memberId, date)
  if (s === 'done') return 'cell-done'
  if (s === 'assigned' || s === 'pending') return 'cell-assigned'
  if (s === 'rest') return 'cell-rest'
  return ''
}

function openAction(member: {id: number; name: string}, day: {date: string}) {
  if (getSchedule(member.id, day.date) === 'rest') return
  selectedDay.value = { date: day.date, members: [{ memberId: member.id, memberName: member.name }] }
}

function prevPeriod() {
  if (view.value === 'week') weekStart.value.setDate(weekStart.value.getDate() - 7)
  else weekStart.value.setMonth(weekStart.value.getMonth() - 1)
  weekStart.value = new Date(weekStart.value)
}

function nextPeriod() {
  if (view.value === 'week') weekStart.value.setDate(weekStart.value.getDate() + 7)
  else weekStart.value.setMonth(weekStart.value.getMonth() + 1)
  weekStart.value = new Date(weekStart.value)
}

async function markDone(day: {memberId: number; date: string}) {
  if (markingDone.value) return
  markingDone.value = true
  try {
    const scheduleData: Array<{ id: number; memberId: number; scheduledDate: string }> = await $fetch('/api/schedule', { params: { start: day.date, end: day.date } })
    const sched = scheduleData.find(s => s.memberId === day.memberId)
    if (sched) {
      await $fetch('/api/schedule/complete', { method: 'POST', body: { scheduleId: sched.id } })
      await loadData()
    }
    selectedDay.value = null
  } finally {
    markingDone.value = false
  }
}

watch(swapTargetMemberId, async (id) => {
  if (!id) { targetSchedules.value = []; return }
  const data: Array<{id: number; memberId: number; scheduledDate: string; status: string}> = await $fetch('/api/schedule', { params: { start: weekStartStr.value, end: weekEndStr.value } })
  targetSchedules.value = data.filter(s => s.memberId === id && s.status === 'pending')
})

async function initiateSwap(day: {memberId: number; date: string}) {
  const scheduleData: Array<{ id: number; memberId: number; scheduledDate: string }> = await $fetch('/api/schedule', { params: { start: day.date, end: day.date } })
  const sched = scheduleData.find(s => s.memberId === day.memberId)
  if (!sched) return
  swapFromScheduleId.value = sched.id
  swapFromDate.value = day.date
  swapFromMemberId.value = day.memberId
  swapTargetMemberId.value = 0
  swapTargetScheduleId.value = 0
  targetSchedules.value = []
  selectedDay.value = null
  showSwapDialog.value = true
}

async function confirmSwap() {
  if (!swapTargetScheduleId.value) return
  try {
    await $fetch('/api/swap', {
      method: 'POST',
      body: {
        scheduleIdA: swapFromScheduleId.value,
        scheduleIdB: swapTargetScheduleId.value,
        fromMemberA: swapFromMemberId.value,
        toMemberB: swapTargetMemberId.value,
      }
    })
    showSwapDialog.value = false
    await loadData()
  } catch {
    showToast('互换请求发起失败', 'error')
  }
}

function openDayDetail(day: any) {
  if (!day.schedules || day.schedules.length === 0) return
  selectedDay.value = {
    date: day.date,
    members: day.schedules.map((s: any) => ({
      memberId: s.memberId,
      memberName: s.name || '未知',
    })),
  }
}

async function doGenerate() {
  try {
    await $fetch('/api/schedule/generate', { method: 'POST', body: { startDate: generateStart.value, days: generateDays.value } })
    showGenerate.value = false
    await loadData()
  } catch {
    showToast('生成排班失败', 'error')
  }
}
</script>

<style scoped>
.schedule-page { padding: 16px; max-width: 100%; overflow-x: hidden; }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; justify-content: space-between; }
.view-toggle { display: flex; gap: 4px; }
.view-toggle button { padding: 6px 14px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
.view-toggle button.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.nav { display: flex; align-items: center; gap: 8px; }
.nav-btn { padding: 4px 10px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
.period-label { font-size: 14px; font-weight: 600; color: #333; min-width: 140px; text-align: center; }
.btn-generate { padding: 8px 16px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; width: 100%; }

/* 周视图 */
.week-grid { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.grid-header { display: grid; grid-template-columns: 70px repeat(7, 1fr); background: #f8f9ff; border-bottom: 1px solid #eee; }
.header-member { padding: 10px 8px; font-size: 12px; color: #888; text-align: center; }
.header-day { padding: 10px 4px; text-align: center; }
.day-name { font-size: 12px; color: #666; }
.day-date { font-size: 11px; color: #999; margin-top: 2px; }
.grid-row { display: grid; grid-template-columns: 70px repeat(7, 1fr); border-bottom: 1px solid #f0f0f0; }
.grid-row:last-child { border-bottom: none; }
.row-member { padding: 12px 8px; font-size: 13px; color: #333; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.row-cell { padding: 12px 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; min-height: 40px; }
.row-cell:hover { background: #f0f0ff; }
.cell-assigned .icon-assigned { color: #4f46e5; font-size: 18px; }
.cell-done { background: #f0fdf4; }
.cell-done .icon-done { font-size: 16px; }
.cell-rest { background: #f9fafb; }

/* 月视图 */
.month-grid { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.month-header { display: grid; grid-template-columns: repeat(7, 1fr); background: #f8f9ff; border-bottom: 1px solid #eee; }
.month-header-day { padding: 10px; text-align: center; font-size: 12px; color: #888; }
.month-body { display: grid; grid-template-columns: repeat(7, 1fr); }
.month-cell { min-height: 80px; padding: 6px; border-bottom: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; cursor: pointer; }
.month-cell:nth-child(7n) { border-right: none; }
.month-cell.other-month { opacity: 0.3; }
.month-date { font-size: 12px; color: #666; margin-bottom: 4px; }
.month-member { font-size: 11px; padding: 2px 4px; border-radius: 4px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.month-member.assigned { background: #eef2ff; color: #4f46e5; }
.month-member.done { background: #dcfce7; color: #16a34a; }

/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: #fff; border-radius: 16px; padding: 24px; width: 85%; max-width: 320px; }
.modal-card h4 { margin: 0 0 4px; font-size: 16px; color: #333; }
.modal-member { font-size: 18px; font-weight: 600; color: #4f46e5; margin-bottom: 8px; }
.member-block { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.member-block:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.empty { text-align: center; padding: 12px; color: #999; font-size: 14px; }
.modal-actions { display: flex; flex-direction: column; gap: 8px; }
.btn-action { width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 15px; cursor: pointer; }
.btn-action.done { background: #4f46e5; color: #fff; }
.btn-action.swap { background: #fef3c7; color: #d97706; }
.btn-action.cancel { background: #f3f4f6; color: #666; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; color: #666; margin-bottom: 6px; }
.form-select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: #fff; }
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 8px; font-size: 14px; z-index: 2000; color: #fff; }
.toast.success { background: #16a34a; }
.toast.error { background: #dc2626; }
</style>
