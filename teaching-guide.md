# 📖 Nuxt 3 从零教学 — 基于 DormCleaning 项目逐知识点讲解

> 🎯 **目标读者**：刚接触 Nuxt 3 / Vue 3 的前端新手  
> 📦 **项目**：dorm-cleaning（宿舍打扫排班系统）  
> 💡 **学习方法**：跟着项目代码走，每个知识点结合真实代码例子理解

---

## 📑 目录

<!-- TOC -->
1. [项目总览：Nuxt 到底是什么？](#1-项目总览nuxt-到底是什么)
2. [项目结构：每个文件夹是干嘛的](#2-项目结构每个文件夹是干嘛的)
3. [文件路由：文件位置 = 访问路径](#3-文件路由文件位置--访问路径)
4. [Vue 单文件组件（SFC）](#4-vue-单文件组件sfc)
5. [Vue 3 核心语法](#5-vue-3-核心语法)
6. [Nuxt 前端数据请求](#6-nuxt-前端数据请求)
7. [Nuxt Server Routes（后端 API）](#7-nuxt-server-routes后端-api)
8. [nuxt.config.ts 配置详解](#8-nuxtconfigts-配置详解)
9. [Drizzle ORM + MySQL](#9-drizzle-orm--mysql)
10. [认证系统全流程](#10-认证系统全流程)
11. [中间件机制](#11-中间件机制)
12. [Nitro 插件 + 定时任务](#12-nitro-插件--定时任务)
13. [邮件服务（nodemailer）](#13-邮件服务nodemailer)
14. [排班算法详解](#14-排班算法详解)
15. [限流器实现](#15-限流器实现)
16. [AES 加密 + Session](#16-aes-加密--session)
17. [从文件到数据库 — 完整数据流](#17-从文件到数据库--完整数据流)

---

## 1. 项目总览：Nuxt 到底是什么？

### 1.1 传统开发方式 vs Nuxt 方式

**传统前后端分离模式**（两个项目）：
```
前端项目（Vue/React）  ←HTTP→  后端项目（Express/Spring）  ←SQL→  数据库
   端口 5173                     端口 3000
```

**Nuxt 全栈模式**（一个项目）：
```
Nuxt 项目（一个端口搞定全部）
  ├─ pages/       → 前端页面（Vue）
  ├─ server/api/  → 后端 API（Nitro）
  └─ .env         → 数据库连接
                          ↓
                       MySQL 数据库
```

**Nuxt = Vue 3 + Nitro（后端引擎）** 打包在一起的全栈框架。

### 1.2 这个项目用了 Nuxt 哪些能力？

| Nuxt 特性 | 在本项目中的用途 |
|-----------|----------------|
| `pages/` 文件路由 | 每个 `.vue` 文件自动成为一个页面 |
| `server/api/` 文件路由 | 每个 `.ts` 文件自动成为一个 API 接口 |
| 自动导入功能 | `ref`、`computed`、`useFetch` 不用 `import` 直接用 |
| `useFetch` / `$fetch` | 前端调用后端 API |
| SSR 渲染 | 页面加载时自动请求数据，渲染成 HTML |
| Nitro 引擎 | 后端运行时，处理 API、中间件、插件 |
| `definePageMeta` | 配置页面元信息（标题、布局等） |

---

## 2. 项目结构：每个文件夹是干嘛的

```
dorm-cleaning/
├── app/app.vue          ← 根组件（整个应用的入口）
├── layouts/default.vue  ← 页面布局（导航栏 + 底部栏）
├── pages/               ← 前端页面（自动路由）
├── server/
│   ├── api/             ← 后端 API（自动路由）
│   ├── models/          ← 数据库表定义（Drizzle ORM）
│   ├── services/        ← 业务逻辑层（排班算法、定时任务）
│   ├── utils/           ← 工具函数（加密、邮件、限流）
│   ├── middleware/      ← 中间件（认证检查）
│   └── plugins/         ← Nitro 服务器插件（启动时运行）
├── nuxt.config.ts       ← Nuxt 配置文件
├── drizzle.config.ts    ← 数据库迁移配置
└── package.json         ← 依赖管理
```

> 💡 **记忆口诀**："页面在 pages，接口在 api，逻辑在 services，工具在 utils"

---

## 3. 文件路由：文件位置 = 访问路径

这是 Nuxt **最核心、最爽**的特性——**不用写 router.js**！

### 3.1 前端页面路由

```text
pages/
├── index.vue         →  /                 （首页）
├── login.vue         →  /login            （登录页）
├── register.vue      →  /register         （注册页）
├── schedule.vue      →  /schedule         （排班页）
└── admin/
    └── missed.vue    →  /admin/missed     （漏扫管理页）
```

**规则**：
- `index.vue` 是特殊文件名，表示"这个目录的首页"
- 文件夹嵌套 = URL 路径嵌套
- 文件名（不含 .vue）= URL 路径名

### 3.2 后端 API 路由

```text
server/api/
├── register.post.ts           →  POST /api/register
├── members.get.ts             →  GET  /api/members
├── members.post.ts            →  POST /api/members
├── members.delete.ts          →  DELETE /api/members
├── auth/
│   ├── send-code.post.ts      →  POST /api/auth/send-code
│   └── login.post.ts          →  POST /api/auth/login
├── schedule.get.ts            →  GET  /api/schedule
├── schedule/
│   ├── complete.post.ts       →  POST /api/schedule/complete
│   ├── generate.post.ts       →  POST /api/schedule/generate
│   └── missed.get.ts          →  GET  /api/schedule/missed
├── swap.get.ts / swap.post.ts / swap.put.ts
│                              →  GET/POST/PUT /api/swap
├── dorm/
│   ├── config.get.ts          →  GET  /api/dorm/config
│   ├── config.put.ts          →  PUT  /api/dorm/config
│   ├── tasks.post.ts          →  POST /api/dorm/tasks
│   └── tasks/delete.post.ts   →  POST /api/dorm/tasks/delete
├── cron/
│   ├── status.get.ts          →  GET  /api/cron/status
│   ├── start.post.ts          →  POST /api/cron/start
│   └── stop.post.ts           →  POST /api/cron/stop
├── approve/
│   └── [token].ts             →  GET  /api/approve/:token
└── admin/
    └── signoff.post.ts        →  POST /api/admin/signoff
```

**💡 核心规则**：文件名后缀的 `.get` `.post` `.put` `.delete` 决定了能处理哪种 HTTP 方法！

```text
login.post.ts     → 只能接收 POST 请求
members.get.ts    → 只能接收 GET 请求
members.delete.ts → 只能接收 DELETE 请求
swap.put.ts       → 只能接收 PUT 请求
```

### 3.3 动态路由：`[token]`

```text
server/api/approve/[token].ts
```

`[ ]` 方括号表示"这是一个动态参数"。访问 `/api/approve/abc-123` 时，`token` 的值就是 `abc-123`。

在代码中通过 `getRouterParam(event, 'token')` 获取。

**这学会了**：发邮件的审批链接都是这种 `随机token` 的方式实现的！

### 3.4 ⚠️ 常见的路由错误

项目中有一个"教学用的反面教材"：

```
server/api/schedule/index.get.ts  →  GET /api/schedule/index  （错误！）
server/api/schedule.get.ts        →  GET /api/schedule        （正确！）
```

`schedule/index.get.ts` 会被 Nuxt 解析为 `/api/schedule/index` 路径，多了个 `/index`！

**记住**：  
- 要想路径是 `/api/schedule` → 文件名是 `schedule.get.ts`（扁平放）
- 要想路径是 `/api/schedule/complete` → 创建 `schedule/` 目录，放 `complete.post.ts`

---

## 4. Vue 单文件组件（SFC）

每个 `.vue` 文件是一个"单文件组件"，包含三部分：

```vue
<!-- 第1部分：HTML 模板 -->
<template>
  <div class="my-component">
    <h1>{{ title }}</h1>
    <button @click="handleClick">点我</button>
  </div>
</template>

<!-- 第2部分：JavaScript/TypeScript 逻辑 -->
<script setup lang="ts">
const title = ref('你好')
function handleClick() {
  title.value = '被点了！'
}
</script>

<!-- 第3部分：CSS 样式（scoped 表示只对这个组件生效） -->
<style scoped>
h1 { color: #333; }
</style>
```

### 本项目中的具体例子

**`app/app.vue`** — 根组件，最外层壳：
```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```
- `<NuxtLayout>` → 套上 `layouts/default.vue` 这个布局
- `<NuxtPage>` → 显示当前路由对应的页面内容

这就像相框——`NuxtLayout` 是相框边，`NuxtPage` 是相框里的照片。

**`layouts/default.vue`** — 布局组件：
```vue
<template>
  <div>
    <header>导航栏（所有页面共享）</header>
    <main>
      <slot />  <!-- 这里插入各个页面的内容 -->
    </main>
    <footer>底部信息</footer>
  </div>
</template>
```

---

## 5. Vue 3 核心语法

### 5.1 `ref` — 响应式变量

```typescript
// pages/login.vue
const email = ref('')           // 定义一个响应式字符串
const countdown = ref(0)        // 倒计时
const loading = ref(false)      // 加载状态

// 读取和修改都要用 .value
console.log(email.value)        // 读取
email.value = 'test@qq.com'     // 修改
countdown.value = 60            // 修改
```

**为什么用 .value？** 因为 JavaScript 的基本类型（字符串、数字）没法直接做响应式，所以 `ref` 把它包在一个对象里，`.value` 就是访问这个对象内部的值。

> ⚠️ **小坑**：在 `<template>` 里用的时候**不用写 .value**，Vue 自动解包。
> 只有在 `<script>` 里才需要 `.value`！

### 5.2 `computed` — 自动计算

```typescript
const todos = ref(['扫地', '拖地'])
const todoCount = computed(() => todos.value.length)
// 当 todos 变了，todoCount 自动更新
```

用在本项目中的地方（比如 schedule.vue 里计算哪天是谁值班）。

### 5.3 `v-for` — 循环渲染列表

```html
<!-- pages/members.vue -->
<div v-for="member in members" :key="member.id" class="member-card">
  <span>{{ member.name }}</span>
  <span>{{ member.email }}</span>
  <span v-if="member.emailVerified">✅ 已验证</span>
  <span v-else>⚠️ 未验证</span>
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
