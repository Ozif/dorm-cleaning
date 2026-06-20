<template>
  <div class="members-page">
    <section class="card">
      <h3>添加成员</h3>
      <div class="add-form">
        <input v-model="newName" placeholder="姓名" />
        <input v-model="newEmail" type="email" placeholder="邮箱" />
        <button class="btn" @click="addMember">添加</button>
      </div>
    </section>

    <section class="card">
      <h3>成员列表</h3>
      <div v-if="members.length === 0" class="empty">暂无成员</div>
      <div v-for="m in members" :key="m.id" class="member-card">
        <div class="member-info">
          <div class="member-name">{{ m.name }}</div>
          <div class="member-email">{{ m.email }}</div>
          <span class="badge" :class="m.emailVerified ? 'verified' : 'pending'">
            {{ m.emailVerified ? '已验证' : '未验证' }}
          </span>
        </div>
        <div class="member-weight">
          <label>权重</label>
          <input v-model.number="m.weight" type="range" min="0.5" max="3.0" step="0.5" @change="updateWeight(m)" />
          <span class="weight-val">{{ m.weight }}</span>
        </div>
        <button class="btn-sm danger" @click="openRemoveConfirm(m)">移除</button>
      </div>
    </section>

    <!-- Confirm dialog -->
    <div v-if="showConfirm" class="confirm-overlay" @click.self="showConfirm = false">
      <div class="confirm-dialog">
        <p>确定要移除成员 {{ pendingRemoveName || '该成员' }} 吗？</p>
        <div class="confirm-actions">
          <button class="btn-sm" @click="showConfirm = false">取消</button>
          <button class="btn-sm danger" @click="confirmRemove">确定移除</button>
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
const newName = ref('')
const newEmail = ref('')
const members = ref<Array<{ id: number; name: string; email: string; weight: number; emailVerified: boolean }>>([])
const showConfirm = ref(false)
const pendingRemoveMemberId = ref<number | null>(null)
const pendingRemoveName = ref('')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

async function loadMembers() {
  const data = await $fetch('/api/members')
  members.value = data
}

onMounted(loadMembers)

function openRemoveConfirm(member: { id: number; name: string }) {
  pendingRemoveMemberId.value = member.id
  pendingRemoveName.value = member.name
  showConfirm.value = true
}

async function addMember() {
  if (!newName.value || !newEmail.value) return
  try {
    await $fetch('/api/members', { method: 'POST', body: { name: newName.value, email: newEmail.value } })
    newName.value = ''
    newEmail.value = ''
    await loadMembers()
    showToast('成员添加成功 ✅', 'success')
  } catch {
    showToast('添加成员失败', 'error')
  }
}

async function confirmRemove() {
  showConfirm.value = false
  if (!pendingRemoveMemberId.value) return
  try {
    await $fetch('/api/members', { method: 'DELETE', params: { memberId: pendingRemoveMemberId.value } })
    await loadMembers()
    showToast('成员已移除 ✅', 'success')
  } catch {
    showToast('移除成员失败', 'error')
  } finally {
    pendingRemoveMemberId.value = null
    pendingRemoveName.value = ''
  }
}

async function updateWeight(m: { id: number; weight: number }) {
  try {
    await $fetch('/api/members', { method: 'PUT', body: { memberId: m.id, weight: m.weight } })
    showToast('权重已更新 ✅', 'success')
  } catch {
    showToast('更新权重失败', 'error')
  }
}
</script>

<style scoped>
.members-page { padding: 16px; max-width: 600px; margin: 0 auto; }
.card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
h3 { margin: 0 0 16px; font-size: 16px; color: #333; }
.add-form { display: flex; gap: 8px; flex-wrap: wrap; }
.add-form input { flex: 1; min-width: 120px; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.empty { text-align: center; color: #999; padding: 24px; font-size: 14px; }
.member-card { padding: 12px 0; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.member-card:last-child { border-bottom: none; }
.member-info { flex: 1; min-width: 150px; }
.member-name { font-weight: 600; color: #333; font-size: 14px; }
.member-email { font-size: 12px; color: #888; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.badge.verified { background: #dcfce7; color: #16a34a; }
.badge.pending { background: #fef9c3; color: #ca8a04; }
.member-weight { display: flex; align-items: center; gap: 8px; }
.member-weight label { font-size: 12px; color: #666; }
.member-weight input[type=range] { width: 80px; }
.weight-val { font-size: 14px; font-weight: 600; color: #4f46e5; min-width: 30px; text-align: center; }
.btn { width: 100%; padding: 10px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
.btn-sm { padding: 6px 12px; border-radius: 6px; border: 1px solid #ddd; background: #fff; cursor: pointer; font-size: 13px; }
.btn-sm.danger { color: #dc2626; border-color: #dc2626; }
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.confirm-dialog {
  background: #fff; border-radius: 12px; padding: 24px;
  min-width: 280px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.confirm-dialog p { margin: 0 0 16px; font-size: 15px; color: #333; text-align: center; }
.confirm-actions { display: flex; gap: 8px; justify-content: center; }
.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 8px; font-size: 14px; z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.toast.success { background: #16a34a; color: #fff; }
.toast.error { background: #ef4444; color: #fff; }
</style>
