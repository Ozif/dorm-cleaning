# 🔍 代码审查报告 — DormCleaning 宿舍打扫系统

> **审查时间**：2026-06-19  
> **审查范围**：全部源文件（pages/、server/、server/models/、server/services/、server/api/ 等）  
> **审查方式**：静态代码分析 + 逻辑推理

---

## 📊 总体评价

| 维度 | 评分 | 说明 |
|------|:----:|------|
| 代码结构 | ⭐⭐⭐⭐ | 遵循 Nuxt 3 标准结构，模块划分清晰 |
| TypeScript 类型 | ⭐⭐⭐⭐ | 类型基本正确，无明显 `any` 滥用 |
| 业务逻辑 | ⭐⭐⭐ | 核心逻辑正确，但有边界条件遗漏 |
| 安全性 | ⭐⭐⭐ | Session 加密、httpOnly cookie 做得好；有遗漏 |
| 错误处理 | ⭐⭐⭐ | 基本覆盖，但缺少日志和降级 |
| 性能 | ⭐⭐ | 无连接池，每次请求新建 MySQL 连接 |
| 注释文档 | ⭐⭐⭐⭐ | JSDoc 齐全，代码即文档 |

---

## 🚨 严重 Bug（必须修复）

### Bug 1 — `config.get.ts` 中有两个 `export default` ❌

**文件**：`server/api/dorm/config.get.ts`（第 10 行和第 48 行）

```typescript
// 第 10 行：第一个默认导出（GET 处理器）
export default defineEventHandler(async (event) => { ... })

// 第 48 行：第二个默认导出（PUT 处理器）—— 语法错误！
export default defineEventHandler(async (event) => { ... })
```

**问题**：一个模块只能有一个 `export default`，TypeScript 编译时会报错。而且 `.get.ts` 文件的命名约定只处理 GET 请求，即使编译通过，里面的 PUT 处理器也不会被调用。

**修复**：移除 `config.get.ts` 中的 PUT 处理器（第 43~74 行）。PUT 逻辑已经存在于 `server/api/dorm/config.put.ts` 中。

---

### Bug 2 — 排班生成时未按宿舍过滤已存在记录 🚫

**文件**：`server/api/schedule/generate.post.ts`（第 64~67 行）

```typescript
const existing = await db.select()
  .from(schedules)
  .where(eq(schedules.scheduledDate, a.scheduledDate))  // ❌ 没加 dormId 条件
  .limit(1)
```

**问题**：检查某天是否已有排班时，只过滤了 `scheduledDate`，**没有加 `dormId` 条件**。如果有多个宿舍使用同一套系统，A 宿舍某天已生成排班，B 宿舍同一天就无法生成了——因为系统会认为"已有排班"而跳过。

**修复**：加上 `and(eq(schedules.dormId, dormId), eq(schedules.scheduledDate, a.scheduledDate))`

---

### Bug 3 — 审批通过后未设置 `admin_member_id` 🧩

**文件**：`server/api/approve/[token].ts`（第 43~49 行）

```typescript
// 创建宿舍 —— 没设 admin_member_id
const dormResult = await db.insert(dormConfig).values({
  dormName: req.dormName,
  frequencyType: 'weekly',
  frequencyCount: 3,
  isActive: true,
  // ❌ admin_member_id 未赋值，保持 NULL
})

const dormId = Number(dormResult[0].insertId)

// 创建首位成员（管理员）
await db.insert(members).values({
  dormId,
  name: req.applicantName,
  email: req.applicantEmail,
  weight: '1.0',
  emailVerified: true,
})
```

**问题**：申请人是首位成员（管理员），创建成员后拿到了 `memberId`，但没有回填到 `dorm_config.admin_member_id` 字段。之后系统就无法知道谁是宿舍的管理员。

**修复**：在插入成员后，回写 `dormConfig`：

```typescript
const memberResult = await db.insert(members).values({...})
const adminMemberId = Number(memberResult[0].insertId)

await db.update(dormConfig)
  .set({ adminMemberId })
  .where(eq(dormConfig.id, dormId))
```

---

## ⚠️ 重要问题

### 问题 4 — 每次请求新建数据库连接 🐌

**涉及文件**：**所有 API 文件**

每个 API 处理函数开头都执行：
```typescript
const connection = await mysql.createConnection({...})
const db = drizzle(connection)
// ...业务逻辑...
await connection.end()
```

**影响**：
- 每次请求创建新连接 → 增加 5~20ms 延迟
- 高并发下可能耗尽 MySQL 连接数（当前 `max_connections=500`）
- 连接数上升时，频繁 `create`/`end` 增加 MySQL 服务器负载

**建议**：使用连接池：

```typescript
// server/utils/db.ts
import mysql from 'mysql2/promise'

let pool: mysql.Pool
export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dorm_cleaning',
      waitForConnections: true,
      connectionLimit: 10,
    })
  }
  return drizzle(pool)
}
```

然后在每个 API 中直接 `const db = getDb()`（**不需要**再手动 `connection.end()`）。

---

### 问题 5 — 邮箱验证码与登录验证码字段混用 🤔

**文件**：`server/models/schema.ts` → members 表

Schema 中定义了两个字段：
- `verifyCode` — 邮箱验证码（用于成员邮箱验证）
- `loginCode` / `loginCodeExpires` — 登录验证码（用于管理员登录）

**问题**：代码中使用上基本正确，但 `send-code.post.ts` 和 `register.post.ts`（成员邮箱验证）用的是同一个 `sendVerificationCode` 方法。需要确保不会覆盖对方的验证码。

**严重程度**：当前代码逻辑中，管理员登录只发 `loginCode`，成员验证只发 `verifyCode`，不会冲突。但代码中没有明确防护，以后改代码时容易出错。

---

### 问题 6 — 定时任务未自动启动 🔄

**文件**：`server/plugins/cron.ts`

```typescript
export default defineNitroPlugin(() => {
  console.log('[Cron Plugin] Server started')
  // Cron is not auto-started — user must click "启动" in UI
})
```

**问题**：服务器重启后，管理员需要手动点"启动定时任务"按钮。如果忘了，20:00 不会自动发提醒邮件。

**建议**：在插件启动时自动调用 `cronService.registerAll()`，或至少加一个开关配置（如 `AUTO_START_CRON=true`）。

---

### 问题 7 — 互换批准时会留下冲突状态 🔀

**文件**：`server/api/swap.put.ts`（第 73~87 行）

```typescript
await db.update(schedules)
  .set({
    memberId: schedB.memberId,
    status: 'swapped',          // 标记为 swapped
    swappedWith: schedB.id,
  })
  .where(eq(schedules.id, schedA.id))

await db.update(schedules)
  .set({
    memberId: schedA.memberId,
    status: 'swapped',          // 标记为 swapped
    swappedWith: schedA.id,
  })
  .where(eq(schedules.id, schedB.id))
```

**问题**：互换后两条排班的 status 都变成 `'swapped'`。后续如果再次互换其中某一天，需要解除 `swapped` 状态才能处理。但代码中 `swap.post.ts` 第 42 行只允许 `pending` 状态的排班互换，`swapped` 状态的排班不能再参与互换。

**影响**：互换过的排班就"固化"了，变成不能再互换。这可能是设计上故意的（简化逻辑），但应该写在文档里。

---

## 💡 改进建议

### 建议 8 — 增加统一错误日志

当前错误全部用 `throw createError({...})` 抛给前端。生产环境下，管理员看到错误但服务端没有日志记录，难以排查问题。

建议在关键操作（登录、审批、邮件发送失败等）增加服务端日志：

```typescript
import { serverLogger } from '~/server/utils/logger'
serverLogger.error('邮件发送失败', { email, error: err.message })
```

### 建议 9 — 邮件发送失败应能重试

`email.ts` 中如果 SMTP 连接失败，错误会被 `try/catch` 捕获打印，但不会重试。建议增加重试机制：

```typescript
async sendMailWithRetry(options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await transporter.sendMail(options)
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}
```

### 建议 10 — 路径冲突文件 `schedule/index.get.ts`

**文件**：`server/api/schedule/index.get.ts`

这个文件和 `schedule.get.ts` 内容完全一样，但路径是 `GET /api/schedule/index`。根据 `代码说明书.md`，这是故意留作"反面教材"的。

建议：要么彻底删除，要么在 README 中明确标注"此文件为教学错误示例，无实际作用"。

---

## ✅ 做对了的地方

| 方面 | 具体表现 | 👍 |
|------|---------|:--:|
| **认证安全** | Session 用 AES-256-CBC 加密 + httpOnly cookie | 👍 |
| **频率限制** | 验证码发送有 60s 冷却 + 每小时 5 次上限 | 👍 |
| **验证码过期** | 登录验证码 10 分钟过期，一次性使用 | 👍 |
| **审批安全** | 注册审批用随机 UUID token，7 天过期 | 👍 |
| **模块划分** | `server/services/` 分离业务逻辑和 API 路由 | 👍 |
| **错误处理** | 统一用 `createError` + HTTP status code | 👍 |
| **注释完整** | 每个函数有 JSDoc，API 标注了路径和方法 | 👍 |
| **TypeScript** | 全项目统一 TypeScript，没有 `any` | 👍 |
| **跨宿舍隔离** | 大部分 API 按 `dormId` 过滤数据 | 👍 |
| **排班算法** | 按权重分配 + 避免连续值班 | 👍 |

---

## 📋 修复优先级

| 优先级 | Bug/问题 | 影响 | 预计工时 |
|:------:|----------|:----:|:--------:|
| 🔴 P0 | Bug 1 — `config.get.ts` 两个 export default | 编译报错，项目跑不起来 | 5 分钟 |
| 🔴 P0 | Bug 2 — 排班生成未过滤 dormId | 多宿舍时排班互相覆盖 | 5 分钟 |
| 🟡 P1 | Bug 3 — 未设置 admin_member_id | 管理员权限判断异常 | 10 分钟 |
| 🟡 P1 | 问题 6 — 定时任务未自动启动 | 服务器重启后忘记启动催办 | 10 分钟 |
| 🟢 P2 | 问题 4 — 无数据库连接池 | 高并发时性能差 | 30 分钟 |
| 🟢 P2 | 问题 9 — 邮件发送无重试 | SMTP 临时故障时丢失通知 | 20 分钟 |
| ⬜ P3 | 问题 5/7/8/10 | 代码质量/可维护性改进 | 可选 |

---

*审查人：Hermes Agent | 基于静态代码分析，建议修复后测试运行确认*
