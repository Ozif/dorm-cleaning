<template>
  <div class="register-page">
    <div class="register-card">
      <h2>宿舍注册申请</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>宿舍名称</label>
          <input v-model="dormName" type="text" placeholder="请输入宿舍名称" required />
        </div>
        <div class="form-group">
          <label>申请人姓名</label>
          <input v-model="applicantName" type="text" placeholder="请输入你的姓名" required />
        </div>
        <div class="form-group">
          <label>申请人邮箱</label>
          <input v-model="applicantEmail" type="email" placeholder="请输入QQ邮箱" required />
        </div>
        <button type="submit" :disabled="submitting" class="submit-btn">
          {{ submitting ? '提交中...' : '提交申请' }}
        </button>
        <p v-if="submitted" class="success-msg">✅ 已提交申请，请等待邮件通知</p>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
      <p class="login-link">已有账号？<NuxtLink to="/login">去登录</NuxtLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
const dormName = ref('')
const applicantName = ref('')
const applicantEmail = ref('')
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

async function handleSubmit() {
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/register', {
      method: 'POST',
      body: { dorm_name: dormName.value, applicant_name: applicantName.value, applicant_email: applicantEmail.value }
    })
    if (res.success) submitted.value = true
  } catch (e: any) {
    error.value = e.data?.message || '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.register-page { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
.register-card { background: #fff; padding: 32px 24px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); width: 100%; max-width: 400px; }
h2 { text-align: center; margin-bottom: 24px; font-size: 22px; color: #333; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #666; }
.form-group input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; }
.submit-btn { width: 100%; padding: 12px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
.submit-btn:disabled { background: #a5a5a5; }
.success-msg { color: #16a34a; text-align: center; margin-top: 12px; }
.error-msg { color: #dc2626; text-align: center; margin-top: 12px; }
.login-link { text-align: center; margin-top: 16px; font-size: 14px; color: #666; }
.login-link a { color: #4f46e5; text-decoration: none; }
</style>
