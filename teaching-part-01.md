// 📝 插入数据
const result = await db.insert(members).values({
  dormId: 1,
  name: '张三',
  email: 'zhangsan@qq.com',
  weight: '1.0',
})
// result[0].insertId 可以拿到新记录的自增 ID

// 📝 更新数据
await db.update(members)
  .set({ weight: '2.0' })
  .where(eq(members.id, 1))

// 📝 删除数据
await db.delete(members)
  .where(eq(members.id, 1))
```

### 9.5 数据库连接

项目中每个 API 文件都是独立创建连接（这是需要改进的地方）：

```typescript
// 每个 API 文件都有这一段样板代码
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dorm_cleaning',
})
const db = drizzle(connection)

// ... 业务逻辑 ...

// 记得用完关闭连接
await connection.end()
```

**为什么说这样不好？** 每次请求都新建一个数据库连接，就像每次去超市都办一张新会员卡——完全没必要。应该用一个"连接池"（一张卡反复用）。

```typescript
// 更好的做法：连接池
const pool = mysql.createPool({...})
const db = drizzle(pool)
// 不需要手动 end()，连接池会自动管理
```

---

## 10. 认证系统全流程

这是项目中最复杂的部分，我来逐层拆解。

### 10.1 登录流程

```
用户输入邮箱
    ↓
POST /api/auth/send-code
    ↓ 生成6位随机码 → 存到数据库 members.login_code 字段
    ↓ 发送邮件
用户收到验证码
    ↓
POST /api/auth/login  { email, code }
    ↓ 验证码是否匹配？否→抛401
    ↓ 验证码是否过期？（10分钟）是→抛401
    ↓ 验证通过 → 清除验证码（一次性使用）
    ↓
生成 Session Token（AES 加密用户信息）
    ↓
设置 httpOnly Cookie（浏览器自动保存）
    ↓
返回 { success: true }
    ↓
后续请求自动携带 Cookie → 服务器解密 → 知道是谁
```

### 10.2 Session 加密（server/utils/crypto.ts）

```typescript
// 加密（登录成功时调用）
async function seal(data: Record<string, any>): Promise<string> {
  const json = JSON.stringify(data)
  // 用 AES-256-CBC 加密
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(json, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// 解密（后续请求时调用）
async function unseal(token: string): Promise<Record<string, any>> {
  const [ivHex, encrypted] = token.split(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return JSON.parse(decrypted)
}
```

**AES-256-CBC 简单理解**：
- AES = 一种加密算法（好比一个密码本）
- 256 = 密钥长度 256 位（很长，很难破解）
- CBC = 加密模式（把明文分成块，每块加密时依赖前一块）
- 需要两个东西：**密钥**（key，自己保管）+ **初始向量**（iv，每次加密随机生成）

### 10.3 httpOnly Cookie

```typescript
setCookie(event, 'dorm_session', sessionToken, {
  httpOnly: true,    // ⭐ JS 无法读取！防止 XSS 攻击窃取
  secure: process.env.NODE_ENV === 'production',  // HTTPS 才发送
  sameSite: 'lax',   // 防止 CSRF 攻击
  maxAge: 60 * 60 * 24 * 7,  // 7天过期
  path: '/',
})
```

**httpOnly 为什么重要？**  
如果黑客通过 XSS 攻击（比如在评论区注入 `<script>document.cookie</script>`），  
- ❌ 普通 Cookie → 被读取，账号被盗  
- ✅ httpOnly Cookie → JS 无法读取，安全！

### 10.4 requireAuth 中间件

```typescript
// server/utils/auth.ts
export async function requireAuth(event) {
  // 从 Cookie 中读取 session token
  const token = getCookie(event, 'dorm_session')
  if (!token) {
    throw createError({ statusCode: 401, message: '未登录' })
  }

  // 解密 token
  const session = await unseal(token)
  if (!session || !session.memberId) {
    throw createError({ statusCode: 401, message: '登录已过期' })
  }

  return session  // 返回用户信息 { memberId, dormId, email, name, isAdmin }
}
```

**使用方式**：在每个需要登录的 API 开头调用：

```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)  // ⭐ 一行搞定认证
  // 没抛异常 → 用户已登录，可以继续
  // user.memberId  → 用户ID
  // user.dormId    → 宿舍ID
  // user.isAdmin   → 是否是管理员
})
```

---

## 11. 中间件机制

Nuxt 有三种中间件，不要搞混！

### 11.1 服务端中间件（server/middleware/）

```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  // 所有 API 请求都会经过这里
  console.log(`[${new Date().toISOString()}] ${event.method} ${event.path}`)
})
```

这种中间件会对**每个 API 请求**执行。可以用来做：
- 请求日志
- 全局认证检查
- CORS 设置
- 请求频率统计

不过本项目中没有用全局中间件做认证，而是每个 API 手动调 `requireAuth`。

### 11.2 页面中间件（pages/middleware/）

在页面文件夹中放中间件，控制页面访问权限：

```typescript
// middleware/auth.ts（在 pages 目录下）
export default defineNuxtRouteMiddleware((to, from) => {
  const token = useCookie('dorm_session')
  if (!token.value) {
    return navigateTo('/login')  // 没登录 → 跳转到登录页
  }
})
```

在页面中使用：
```typescript
definePageMeta({
  middleware: 'auth'  // 进入这个页面时先检查登录
})
```

### 11.3 全局中间件

在 `middleware/` 目录（项目根目录）下：

```typescript
// middleware/auth.global.ts
// .global.ts 后缀表示"所有页面路由都会经过这里"
```

---

## 12. Nitro 插件 + 定时任务

### 12.1 Nitro 插件是什么？

**Nitro** 是 Nuxt 的后端引擎。Nitro 插件在**服务器启动时**自动运行一次。

```typescript
// server/plugins/cron.ts
import { cronService } from '~/server/services/cron'

export default defineNitroPlugin(() => {
  console.log('[Cron Plugin] Server started')
  // 在这里可以做一些服务器启动时的初始化工作
  // ⚠️ 注意：本项目没有自动启动定时任务
  // 用户需要手动点"启动"按钮
})
```

### 12.2 node-cron 定时任务

项目使用 `node-cron` 库来定时执行任务：

```typescript
// server/services/cron.ts（简化的伪代码）
import cron from 'node-cron'

class CronService {
  tasks: Map<string, cron.ScheduledTask> = new Map()

  registerAll() {
    // 每天 20:00 发送首次提醒
    this.register('reminder-first', '0 20 * * *', async () => {
      await this.checkAndSendReminder()
    })

    // 每天 21:00 催办
    this.register('followup-1', '0 21 * * *', async () => {
      await this.checkAndSendFollowUp()
    })

    // 每天 00:00 标记未完成
    this.register('mark-missed', '0 0 * * *', async () => {
      await this.markMissed()
    })
  }

  stopAll() {
    for (const [, task] of this.tasks) {
      task.stop()
    }
  }
}
```

**Cron 表达式速查**：

```
 ┌────────── 秒（0-59）
 │ ┌──────── 分（0-59）
 │ │ ┌────── 时（0-23）
 │ │ │ ┌──── 日（1-31）
 │ │ │ │ ┌── 月（1-12）
 │ │ │ │ │ ┌ 星期（0-7，0和7都是周日）
 │ │ │ │ │ │
 0 20 * * * *   → 每天 20:00
 0 0 0 * * *    → 每天 00:00
 */30 * * * *    → 每30分钟
```

### 12.3 定时任务封装

项目将定时任务分成了两层：
- **`server/services/cron.ts`**（大服务）→ CronService 类，管理多个定时任务的注册/停止/状态
- **`server/utils/cron.ts`**（小桥接）→ 简单导出 `cronService` 实例，方便其他文件引用

这是一种常见的设计模式：**服务层 + 桥接层**，让代码组织更清晰。

---

## 13. 邮件服务（nodemailer）

### 13.1 基本使用

```typescript
// server/utils/email.ts
import nodemailer from 'nodemailer'

// 创建邮件发送器（连接 QQ 邮箱 SMTP 服务器）
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',        // QQ 邮箱的 SMTP 服务器
  port: 465,                   // SSL 加密端口
  secure: true,                // 使用 SSL
  auth: {
    user: 'your@qq.com',       // QQ 邮箱
    pass: 'SMTP授权码',         // ⚠️ 不是 QQ 密码！
  }
})

// 发送邮件
await transporter.sendMail({
  from: '"DormCleaning" <your@qq.com>',
  to: 'member@qq.com',
  subject: '今天轮到你打扫啦 🧹',
  text: '今天是你打扫卫生的日子，请及时完成！',
})
```

### 13.2 SMTP 授权码是什么？

QQ 邮箱的密码不能直接用来发邮件，需要生成一个**专用授权码**：
```
QQ邮箱 → 设置 → 账户 → POP3/IMAP/SMTP服务 → 开启 → 生成授权码
```

这个授权码和你的 QQ 密码不同，可以单独重置，更安全。

### 13.3 本项目中的邮件发送流程

```
管理员点击"发送验证码"
    ↓
1. 生成 6 位随机数字
2. 存入数据库（login_code 字段 + 过期时间）
3. 调用 emailService.sendVerificationCode(email, code)
    ↓
Nodemailer 通过 SMTP 发送邮件
    ↓
QQ 邮箱服务器 → 投递到用户收件箱
```

### 13.4 邮件日志

每次发送邮件后，系统会记录到 `email_logs` 表：

```typescript
await db.insert(emailLogs).values({
  dormId,
  memberId,
  email: memberEmail,
  emailType: 'remind',       // 邮件类型
  subject: '今天轮到你打扫啦',
  status: 'success',         // 发送状态
  sentAt: new Date(),
})
```

这样管理员可以查看邮件发送历史，确认通知是否正常送达。

---

## 14. 排班算法详解

### 14.1 核心目标

宿舍有 N 个成员，每周/每月要打扫 M 次，系统要自动分配：
1. ✅ **按比例分配** — 权重高的人多值日
2. ✅ **避免连续** — 同一个人不连续值日两天
3. ✅ **轮转公平** — 长期来看大家轮流

### 14.2 算法流程

```typescript
// server/services/scheduler.ts
function generateSchedule(memberList, startDate, days) {
  // 第1步：计算总权重
  const totalWeight = memberList
    .map(m => parseFloat(m.weight))
    .reduce((a, b) => a + b, 0)

  // 第2步：按比例分配每个人应该值日几天
  const assignments = memberList.map(m => {
    const share = days * (parseFloat(m.weight) / totalWeight)
    return {
      memberId: m.id,
      count: Math.round(share),        // 四舍五入取整
    }
  })
  // 第3步：调整整数误差（保证总天数一致）

  // 第4步：用 round-robin 轮转方式分配到具体日期
  // 比如：周一张三，周二李四，周三王五，周四张三...
  // 同时检查不连续值班

  // 第5步：返回按日期排序的排班列表
  return scheduleList
}
```

**举例**：
```
宿舍3人：张三(1.0), 李四(2.0), 王五(0.5)
每周打扫 7 次，总权重 = 3.5

理论分配：
  张三：7 × (1.0/3.5) = 2 天
  李四：7 × (2.0/3.5) = 4 天  
  王五：7 × (0.5/3.5) = 1 天

实际排班结果：
  周一：李四（权重高，先排）
  周二：张三
  周三：李四（不连续检查通过）
  周四：王五
  周五：李四
  周六：张三
  周日：李四
```

### 14.3 互换验证

```typescript
// 互换前检查会不会导致某人连续值日
function validateSwap(schedA, schedB, allSchedules): { valid: boolean, reason?: string } {
  // 检查互换后 A 的前一天和/or 后一天是否变成同一个人
  // 是 → 拒绝互换（不能连续值班两天）
  // 否 → 允许互换
}
```

---

## 15. 限流器实现

### 15.1 为什么需要限流？

防止坏人暴力刷验证码（比如每秒发 1000 次请求）：

```
❌ 没有限流：
  攻击者 1 秒发 1000 次 → 邮箱收到 1000 封验证码 → 服务器压力大

✅ 有限流：
  攻击者 1 秒发 1000 次 → 系统只允许第 1 次 → 剩下 999 次返回"太频繁"
```

### 15.2 本项目限流规则

| 规则 | 说明 |
|------|------|
| 同一邮箱 60 秒内只能发 1 次 | 防止同一人频繁请求 |
| 同一邮箱每小时最多 5 次 | 防止枚举式轰炸 |

### 15.3 代码实现

```typescript
// server/utils/rateLimit.ts
class RateLimiter {
  // 内存中存储请求记录 { email: [timestamp1, timestamp2, ...] }
  private records: Map<string, number[]> = new Map()

  /**
   * 检查是否允许发送
   * @returns { allowed: boolean, retryAfter?: number }
   */
  check(key: string, options: { windowMs: number, maxRequests: number }) {
    const now = Date.now()
    const timestamps = this.records.get(key) || []

    // 清理过期的记录
    const recent = timestamps.filter(t => now - t < options.windowMs)

    if (recent.length >= options.maxRequests) {
      // 超过限制
      const oldest = recent[0]
      return {
        allowed: false,
        retryAfter: Math.ceil((oldest + options.windowMs - now) / 1000),
      }
    }

    // 允许，记录本次请求
    recent.push(now)
    this.records.set(key, recent)
    return { allowed: true }
  }
}
```

### 15.4 ⚠️ 内存限流的局限

项目使用内存（Map）存储限流记录。这样做的问题是：**服务器重启后，所有限流记录清空**。

更适合生产环境的方式：用 Redis 存储限流记录（重启不丢失）。

---

## 16. AES 加密 + Session

### 16.1 完整加解密流程

```
登录时（加密）：
  sessionData = { memberId: 1, dormId: 1, email: "...", name: "..." }
    ↓
  JSON.stringify(sessionData) → {"memberId":1,...}
    ↓
  crypto.createCipheriv('aes-256-cbc', key, iv)
    ↓
  iv.toString('hex') + ':' + encrypted.toString('hex')
    ↓
  存储到 Cookie：dorm_session = "abc123...:def456..."

请求时（解密）：
  从 Cookie 读取 "abc123...:def456..."
    ↓
  按 ':' 分割 → ivHex 和 encrypted
    ↓
  crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
    ↓
  JSON.parse(decrypted) → { memberId: 1, dormId: 1, ... }
```

### 16.2 为什么要用 AES 而不是 JWT？

| 特性 | AES 加密 Cookie | JWT |
|------|:--------------:|:---:|
| 数据存储位置 | Cookie 中 | Cookie 中 |
| 是否可读取 | 加密后不可读 | Base64 编码后可解码查看 |
| 是否需要服务端密钥 | ✅ 需要 | ✅ 需要 |
| 是否可撤销 | 可以（删 Cookie） | 需要黑名单 |
| 实现复杂度 | 简单 | 稍复杂 |

本项目选择自实现 AES 加密，好处是教学意义强、依赖少。生产环境建议用 `nuxt-auth-utils` 或 `iron-session` 等成熟方案。

---

## 17. 从文件到数据库 — 完整数据流

以"管理员登录"为例，完整追踪一次数据流：

```
第1步：用户打开 /login 页面
───────────────────────────────────
  pages/login.vue 被 Nuxt 路由加载
  ↓
  <template> 渲染表单（邮箱输入框 + 发送验证码按钮）

第2步：用户输入邮箱，点击"发送验证码"
───────────────────────────────────
  @click="sendCode"
  ↓
  $fetch('/api/auth/send-code', {
    method: 'POST',
    body: { email: 'admin@qq.com' }
  })
  ↓
  HTTP 请求到达 Nuxt 服务器

第3步：服务器处理请求
───────────────────────────────────
  server/api/auth/send-code.post.ts
  ↓
  defineEventHandler 接收请求
    → 读取 body.email
    → 检查频率限制
    → 生成 6 位随机码 "482916"
    → 连接数据库
    → UPDATE members SET 
        login_code = '482916',
        login_code_expires = '2026-06-19 13:10:00'
      WHERE email = 'admin@qq.com'
    → 关闭数据库连接
    → 调用 emailService.sendVerificationCode('admin@qq.com', '482916')
    → Nodemailer 发送邮件
    → 返回 { success: true }

第4步：用户收到邮件，输入验证码
───────────────────────────────────
  $fetch('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@qq.com', code: '482916' }
  })

第5步：服务器验证登录
───────────────────────────────────
  查询数据库 members 表
  → 找到邮箱为 admin@qq.com 的记录
  → 比较 login_code 是否等于 482916
  → 检查 login_code_expires 是否未过期
  ↓
  如果都正确：
    → 清除 login_code（一次性使用）
    → 用 AES 加密 session 数据
    → 设置 httpOnly Cookie
    → 返回 { success: true, session: {...} }
  ↓
  如果验证码错误：
    → 返回 { statusCode: 401, message: '验证码错误' }
    → 前端显示错误提示

第6步：登录成功，跳转首页
───────────────────────────────────
  浏览器保存了 Cookie（自动携带）
  → 后续所有请求都会自动带 session
  → navigateTo('/') 跳转到仪表盘
```

### 这个流程涉及的所有知识点

| 步骤 | 涉及的知识点 |
|:----:|-------------|
| ① | Nuxt 文件路由 → 页面加载 |
| ② | Vue `@click`、`v-model`、`ref`、`$fetch` |
| ③ | Server Routes、Drizzle ORM、nodemailer、频率限制 |
| ④ | 前端错误处理、倒计时 |
| ⑤ | AES 加解密、Session、httpOnly Cookie |
| ⑥ | Cookie 自动携带、路由跳转 |

---

## 🎯 课后总结

### 你学完了这些知识点：

**Vue 3 基础**
- ✅ `ref` 响应式变量
- ✅ `computed` 计算属性
- ✅ `v-for` 循环渲染
- ✅ `v-if`/`v-else` 条件渲染
- ✅ `@click` 事件绑定
- ✅ `v-model` 双向绑定
- ✅ `:class` 动态样式

**Nuxt 3 核心**
- ✅ 文件路由（前端 pages/ + 后端 server/api/）
- ✅ `useFetch` vs `$fetch` 数据请求
- ✅ `definePageMeta` 页面配置
- ✅ `NuxtLayout` + `NuxtPage` 布局系统
- ✅ `nuxt.config.ts` 配置
- ✅ `useRuntimeConfig` 运行时配置

**后端开发**
- ✅ `defineEventHandler` API 开发
- ✅ `getQuery` / `readBody` / `getRouterParam`
- ✅ `getCookie` / `setCookie`
- ✅ `createError` 统一错误处理
- ✅ `requireAuth` 认证中间件

**数据库**
- ✅ Drizzle ORM 表定义
- ✅ SELECT / INSERT / UPDATE / DELETE
- ✅ WHERE 条件（eq, and, or, gte, lte, inArray）
- ✅ ORDER BY、LIMIT、LEFT JOIN

**工具与安全**
- ✅ AES-256-CBC 加密
- ✅ httpOnly Cookie 防 XSS
- ✅ 频率限制防暴力
- ✅ nodemailer 邮件发送
- ✅ node-cron 定时任务
- ✅ Nitro 插件机制

---

### 下一步可以学什么？

1. **连接池优化**：把 `mysql.createConnection` 改为 `mysql.createPool`
2. **统一 DB 工具**：抽离 `getDb()` 到 `server/utils/db.ts`
3. **ESLint + Prettier**：代码风格自动统一
4. **单元测试**：用 Vitest 测试排班算法
5. **TailwindCSS**：美化界面
6. **移动端适配**：项目已规划但未实现
7. **Nuxt Auth Utils**：成熟的认证方案替代自实现加密

---

*本文档基于 DormCleaning v1.3 项目代码编写 | 学习过程中遇到问题欢迎问我 😊*
