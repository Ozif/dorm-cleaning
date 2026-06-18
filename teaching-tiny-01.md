 v-else>⚠️ 未验证</span>
</div>
```

**`:key` 是什么？** Vue 需要唯一标识每个列表项，这样才能高效更新（增/删/排序时不用重新渲染全部）。

### 5.4 `v-if` / `v-else` — 条件渲染

```html
<!-- pages/schedule.vue 中判断排班状态 -->
<span v-if="item.status === 'done'" class="badge-done">✅ 已完成</span>
<span v-else-if="item.status === 'pending'" class="badge-pending">⏳ 待打扫</span>
<span v-else-if="item.status === 'swapped'" class="badge-swap">🔄 已互换</span>
<span v-else class="badge-missed">❌ 漏扫</span>
```

### 5.5 `@click` — 点击事件

```html
<button @click="sendCode" :disabled="countdown > 0">
  {{ countdown > 0 ? `${countdown}秒后重新获取` : '获取验证码' }}
</button>
```

### 5.6 `v-model` — 双向绑定

```html
<!-- pages/login.vue -->
<input v-model="email" type="email" placeholder="请输入邮箱" />
<!-- 用户在输入框打字 → email.value 自动更新 -->
```

### 5.7 `:class` — 动态样式类

```html
<div :class="{ active: isSelected, 'text-red': isUrgent }">
  这段文字样式会根据 isSelected 和 isUrgent 变化
</div>
```

### 5.8 `definePageMeta` — 页面元信息

```typescript
// pages/schedule.vue
definePageMeta({
  title: '排班管理',
  layout: 'default',   // 使用哪个布局
  middleware: 'auth',  // 需要登录才能访问
})
```

---

## 6. Nuxt 前端数据请求

### 6.1 `useFetch` — 页面加载时自动请求数据

```typescript
// pages/index.vue（首页）
const { data: schedule, error, pending } = await useFetch('/api/schedule', {
  query: { start: '2026-06-01', end: '2026-06-30' }
})
```

**特点**：
- 页面加载时**自动**发起请求
- 支持 SSR（服务器端渲染时会先请求好数据再返回 HTML）
- `data` - 返回的数据
- `pending` - 是否正在加载
- `error` - 错误信息

**`query` 参数**：自动变成 URL 的查询参数 `?start=2026-06-01&end=2026-06-30`

### 6.2 `$fetch` — 手动请求（更灵活）

```typescript
// pages/login.vue
async function sendCode() {
  try {
    const result = await $fetch('/api/auth/send-code', {
      method: 'POST',
      body: { email: email.value }
    })
    // 成功了
    countdown.value = 60
  } catch (err) {
    // 失败了
    errorMessage.value = '发送失败，请稍后重试'
  }
}
```

**`$fetch` vs `useFetch` 的区别**：

| 特性 | `useFetch` | `$fetch` |
|------|:----------:|:--------:|
| 自动在页面加载时请求 | ✅ | ❌ 需要手动调 |
| 支持 SSR（服务端渲染） | ✅ | ✅ |
| 自动去重 | ✅ | ❌ |
| 适用于用户交互触发 | ❌ | ✅ |
| 适用于非页面组件 | ❌ | ✅ |

**简单记法**：页面加载时自动请求的数据用 `useFetch`，用户点击按钮后请求的用 `$fetch`。

### 6.3 错误处理

```typescript
// 后端 API 抛出的错误
throw createError({ statusCode: 400, message: '参数错误' })

// 前端捕获
try {
  await $fetch('/api/members', { method: 'POST', body: {...} })
} catch (err) {
  // err 包含后端返回的 statusCode 和 message
  alert(err.message)  // 显示 "参数错误"
}
```

---

## 7. Nuxt Server Routes（后端 API）

### 7.1 API 文件基本结构

```typescript
// server/api/hello.get.ts
export default defineEventHandler(async (event) => {
  // event 是请求上下文
  const query = getQuery(event)        // 获取 ?key=value 参数
  const body = await readBody(event)   // 获取 POST 请求体
  const params = getRouterParam(event, 'name')  // 获取动态路由参数

  // ...业务逻辑...

  return { message: '你好！' }
})
```

### 7.2 获取不同类型的请求数据

```typescript
// 1. 获取 URL 查询参数（?start=2026-01-01&end=2026-01-31）
const query = getQuery(event)
const start = query.start as string

// 2. 获取请求体（POST/PUT 请求的 JSON body）
const body = await readBody(event)
const { email, code } = body

// 3. 获取动态路由参数（/api/approve/:token）
const token = getRouterParam(event, 'token')

// 4. 获取/设置 Cookie
const sessionToken = getCookie(event, 'dorm_session')
setCookie(event, 'dorm_session', token, {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,  // 7天过期
  path: '/',
})
```

### 7.3 统一错误返回

```typescript
// 400 — 客户端参数错误
throw createError({ statusCode: 400, message: '请填写邮箱' })

// 401 — 未登录/验证失败
throw createError({ statusCode: 401, message: '验证码错误' })

// 403 — 权限不足
throw createError({ statusCode: 403, message: '仅管理员可操作' })

// 404 — 资源不存在
throw createError({ statusCode: 404, message: '该邮箱未注册' })

// 409 — 冲突（已存在）
throw createError({ statusCode: 409, message: '该邮箱已注册' })
```

前端会收到这些错误，可以用 `try/catch` 捕获并显示给用户。

### 7.4 项目的 API 设计模式

每个 API 文件遵循固定的模式：

```typescript
// 1. 导入依赖
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

// 2. 默认导出事件处理函数
export default defineEventHandler(async (event) => {
  // 3. 认证检查（需要登录的接口）
  const user = await requireAuth(event)

  // 4. 获取请求数据
  const body = await readBody(event)

  // 5. 参数校验
  if (!body.email) {
    throw createError({ statusCode: 400, message: '请填写邮箱' })
  }

  // 6. 数据库操作
  const connection = await mysql.createConnection({...})
  const db = drizzle(connection)
  // ... 增删改查 ...
  await connection.end()

  // 7. 返回结果
  return { success: true, data: result }
})
```

---

## 8. nuxt.config.ts 配置详解

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // 开发/构建时的模块
  modules: [
    '@nuxt/devtools',  // 开发工具（提供组件检查等功能）
  ],

  // 应用运行时配置（.env 中的变量映射到这里）
  runtimeConfig: {
    // 服务端私有变量（不会暴露给前端）
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || 'dev-secret',

    // 客户端也能访问的公开变量（以 NUXT_PUBLIC_ 开头的 env）
    public: {
      appName: 'DormCleaning',
    }
  },

  // 兼容性日期
  compatibilityDate: '2025-04-30',
})
```

**⑸ runtimeConfig 怎么用？**

```typescript
// 在任何 API 文件中使用
const config = useRuntimeConfig()
console.log(config.sessionPassword)  // 服务端可用
```

> ⚠️ **安全提示**：`runtimeConfig` 中不以 `public` 开头的变量只在服务端可用，不会泄露到前端 JS 中。

---

## 9. Drizzle ORM + MySQL

### 9.1 ORM 是什么？

**ORM = Object Relational Mapping（对象关系映射）**

简单说：**用写 TypeScript 对象的方式来操作数据库，不用手写 SQL 语句**。

```typescript
// 用 ORM 写（Drizzle）
await db.select().from(members).where(eq(members.email, 'test@qq.com'))

// 等价于写 SQL
// SELECT * FROM members WHERE email = 'test@qq.com'
```

### 9.2 定义数据表

```typescript
// server/models/schema.ts

// 定义一张名为 members 的表
export const members = mysqlTable('members', {
  // 字段名        类型            约束
  id:              int('id').autoincrement().primaryKey(),
  name:            varchar('name', { length: 255 }).notNull(),
  email:           varchar('email', { length: 255 }).notNull().unique(),
  weight:          decimal('weight', { precision: 3, scale: 1 }).default('1.0'),
  emailVerified:   boolean('email_verified').default(false),
  createdAt:       timestamp('created_at').defaultNow(),
})
```

**数据库字段类型对应表**（常用）：

| Drizzle 类型 | 数据库类型 | 说明 |
|-------------|-----------|------|
| `int('id')` | INT | 整数 |
| `varchar('name', { length: 255 })` | VARCHAR(255) | 字符串 |
| `boolean('flag')` | TINYINT(1) | 布尔值 |
| `decimal('price', { precision: 10, scale: 2 })` | DECIMAL(10,2) | 小数 |
| `timestamp('created_at')` | TIMESTAMP | 时间戳 |
| `date('scheduled_date')` | DATE | 日期 |

### 9.3 查数据（SELECT）

```typescript
import { eq, and, or, gte, lte, inArray, desc, isNull } from 'drizzle-orm'

// 📌 查全部
const allMembers = await db.select().from(members)

// 📌 按条件查（WHERE）
const result = await db.select()
  .from(members)
  .where(eq(members.email, 'test@qq.com'))
  .limit(1)

// 📌 查指定字段
const names = await db.select({ name: members.name })
  .from(members)

// 📌 组合条件（AND）
const logs = await db.select()
  .from(emailLogs)
  .where(and(
    eq(emailLogs.email, email),
    gte(emailLogs.sentAt, oneHourAgo),
  ))

// 📌 OR 条件
const swaps = await db.select()
  .from(swapLogs)
  .where(or(
    eq(swapLogs.fromMemberA, userId),
    eq(swapLogs.toMemberB, userId),
  ))

// 📌 日期范围查询（>= 和 <=）
const schedules = await db.select()
  .from(schedules)
  .where(and(
    gte(schedules.scheduledDate, startDate),
    lte(schedules.scheduledDate, endDate),
  ))

// 📌 IN 查询
const memberList = await db.select()
  .from(members)
  .where(inArray(members.id, [1, 2, 3]))

// 📌 排序
const logs = await db.select()
  .from(emailLogs)
  .orderBy(desc(emailLogs.sentAt))  // 按时间倒序

// 📌 分页
const page1 = await db.select()
  .from(members)
  .limit(20)     // 每页 20 条
  .offset(0)     // 跳过前 0 条

// 📌 LEFT JOIN 联表查询
const result = await db
  .select({
    id: missedLogs.id,
    memberName: members.name,
    missedDate: missedLogs.missedDate,
  })
  .from(missedLogs)
  .leftJoin(members, eq(missedLogs.memberId, members.id))
```

### 9.4 增删改（INSERT / UPDATE / DELETE）

```typescript
