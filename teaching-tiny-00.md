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
  <span