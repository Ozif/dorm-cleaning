<template>
  <div class="login-page">
    <div class="login-card">
      <h2>管理员登录</h2>
      <p class="desc">输入宿舍管理员的邮箱，获取验证码登录</p>

      <form @submit.prevent="handleSendCode" v-if="!codeSent">
        <div class="form-group">
          <label>邮箱地址</label>
          <input
            v-model="email"
            type="email"
            placeholder="请输入管理员邮箱"
            :disabled="sending"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="sending || cooldown > 0">
          {{ sending ? '发送中...' : cooldown > 0 ? `${cooldown}s 后重试` : '获取验证码' }}
        </button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>

      <form @submit.prevent="handleLogin" v-else>
        <div class="form-group">
          <label>验证码（6位）</label>
          <input
            v-model="code"
            type="text"
            maxlength="6"
            placeholder="输入验证码"
            inputmode="numeric"
            pattern="\d{6}"
            :disabled="loggingIn"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loggingIn || code.length !== 6">
          {{ loggingIn ? '登录中...' : '登录' }}
        </button>
        <p v-if="loginError" class="error-msg">{{ loginError }}</p>
        <p class="back-link">
          <a href="#" @click.prevent="resetForm">重新输入邮箱</a>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const code = ref('')
const codeSent = ref(false)
const sending = ref(false)
const loggingIn = ref(false)
const error = ref('')
const loginError = ref('')
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = 60
  cooldownTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) {
      if (cooldownTimer) clearInterval(cooldownTimer)
    }
  }, 1000)
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

async function handleSendCode() {
  if (!email.value) return
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/send-code', {
      method: 'POST',
      body: { email: email.value }
    })
    codeSent.value = true
    startCooldown()
  } catch (e: any) {
    error.value = e.data?.message || '发送失败，请稍后重试'
  } finally {
    sending.value = false
  }
}

async function handleLogin() {
  if (code.value.length !== 6) return
  loggingIn.value = true
  loginError.value = ''
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, code: code.value }
    })
    // 登录成功，跳转到首页
    await navigateTo('/')
  } catch (e: any) {
    loginError.value = e.data?.message || '验证码错误或已过期'
  } finally {
    loggingIn.value = false
  }
}

function resetForm() {
  codeSent.value = false
  code.value = ''
  error.value = ''
  loginError.value = ''
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.login-card {
  background: #fff;
  padding: 32px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 400px;
}
h2 {
  text-align: center;
  margin-bottom: 8px;
  font-size: 22px;
  color: #333;
}
.desc {
  text-align: center;
  color: #888;
  font-size: 14px;
  margin-bottom: 24px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
}
.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  box-sizing: border-box;
}
.form-group input:disabled {
  background: #f5f5f5;
}
.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}
.btn-primary {
  background: #4f46e5;
  color: #fff;
}
.btn-primary:disabled {
  background: #a5a5a5;
}
.error-msg {
  color: #dc2626;
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
}
.back-link {
  text-align: center;
  margin-top: 12px;
}
.back-link a {
  color: #4f46e5;
  font-size: 14px;
}
</style>
