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
