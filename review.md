# 🔁 第三次审查报告 — 全面代码审查

> **审查时间**：2026-06-19（全面复习所有代码后）

---

## ✅ 上次审查 Bug 修复确认

| 原优先级 | Bug | 状态 |
|:--------:|-----|:----:|
| 🔴 P0 | `config.get.ts` 两个 `export default` | ✅ 已修 |
| 🔴 P0 | 排班生成未过滤 `dormId` | ✅ 已修 |
| 🟡 P1 | 审批后未设 `admin_member_id` | ✅ 已修 |
| 🟡 P1 | 定时任务不自动启动 | ✅ 已修 |
| ⏳ P2 | `schedule/index.get.ts` 路径冲突（反面教材） | ✅ 保留 |
| ⏳ P2 | 无数据库连接池（教学项目合理） | ✅ 接受 |
| ⏳ P2 | 邮件发送无重试 | ✅ 已加（email.ts 第44行，3次重试+指数退避）👍 |
| ⏳ P2 | 无统一错误日志 | ✅ 已加 console.error |

> 上次整改情况：全部合格 ✅

---

## 🔴 新发现 P0 — 严重 Bug

### 1️⃣ `schedule.get.ts` 本周默认范围在周日计算错误

**文件**：`server/api/schedule.get.ts` 第 20~21 行（`schedule/index.get.ts` 同样存在）

```ts
const startDate = start || new Date(now.getFullYear(), now.getMonth(),
  now.getDate() - now.getDay() + 1).toISOString().slice(0, 10)
```

**问题**：`now.getDay()` 在**周日返回 0**，此时：
| 变量 | 公式 | 周日结果 | 正确结果 |
|:----:|:----:|:---------:|:--------:|
| 本周一 | `date - 0 + 1 = date + 1` | **下周一** ❌ | 本周一（`date - 6`） |
| 本周日 | `date - 0 + 7 = date + 7` | **下周日** ❌ | 本周日（`date + 0`） |

**后果**：周日访问排班页面时，默认显示的是下周的数据，本周数据不会出现。

**修复方案**：将 `getDay()` 映射为以周一为起点：
```ts
const monIndex = (now.getDay() + 6) % 7  // 周一=0, 周日=6
const startDate = start || new Date(now.getFullYear(), now.getMonth(), now.getDate() - monIndex).toISOString().slice(0, 10)
const endDate = end || new Date(now.getFullYear(), now.getMonth(), now.getDate() - monIndex + 6).toISOString().slice(0, 10)
```

---

## 🟡 新发现 P1 — 重要问题

### 2️⃣ 互换后状态 `swapped` 导致新值班人无法打卡

**涉及文件**：
- `server/api/swap.put.ts` 第 74~87 行：互换后将两条排班状态设为 `'swapped'`
- `server/api/schedule/complete.post.ts` 第 47~50 行：拒绝 `swapped` 状态的排班

**流程冲突**：
```
发起互换 → 对方审批通过 → memberId 交换 ✓
                          → 状态设为 'swapped' ❌
                            → 新值班人打卡 → 被拒绝："该排班已被互换标记"
```

**后果**：互换生效后，承担该值班任务的新成员无法完成打卡。

**修复方案**：`swap.put.ts` 中将 memberId 互换后，将状态恢复为 `'pending'` 而不是 `'swapped'`。或者 `complete.post.ts` 中允许 `swapped` 状态打卡（后者更合理，因为 swapped 也是有意义的日志标记）。

### 3️⃣ `cron/start.post.ts` 和 `cron/stop.post.ts` 无认证

**文件**：`server/api/cron/start.post.ts`、`server/api/cron/stop.post.ts`

```ts
// 两文件都是
export default defineEventHandler(async () => {
  // 没有任何 requireAuth！
```

对比 `trigger.post.ts` 正确使用了 `requireAuth` + `user.isAdmin` 权限检查。启动/停止定时任务同样需要管理员权限。

**后果**：任何未登录访客都可以启动/停止定时任务（拒绝服务攻击面）。

### 4️⃣ `members.delete.ts` 不校验 `dormId`

**文件**：`server/api/members.delete.ts` 第 29 行

```ts
await db.delete(members).where(eq(members.id, memberId))
// 没有校验 member 是否属于自己的宿舍！
```

没有用 `and(eq(members.id, memberId), eq(members.dormId, dormId))` 来限定删除范围。

**后果**：登录用户可以遍历 `memberId` 删除其他宿舍的成员。

---

## 🟢 新发现 P2/P3 — 建议项

### 5️⃣ `register.post.ts` 无防重名宿舍校验

可以注册多个同名宿舍，审批时还得手动区分。

### 6️⃣ 删除成员不清理关联排班记录

`members.delete.ts` 删除成员后，`schedules` 表中该 `memberId` 的记录成为**孤儿数据**，显示为"未知"姓名。建议在删除时级联清理或置空。

### 7️⃣ `swap.get.ts` 的 TODO 未实现

第 33 行：
```ts
// TODO: 检查管理员权限
```
管理员无法查看所有互换记录，只能看到与自己相关的。逻辑上和 `swap.put.ts` 的问题（只允许被请求方审批）一致。

### 8️⃣ `config.put.ts` 未校验 dormId 存在性

如果 session 中的 `dormId` 在 `dormConfig` 表中不存在，更新会静默成功但不生效。

---

## ✨ 亮点总结

| 项目 | 说明 |
|------|------|
| 排班算法 | `scheduler.ts` 权重分配 + 防连续 + 动态重排序，逻辑完整清晰 |
| 邮件模板 | 5 种邮件模板（验证码/提醒/催办/漏扫/通知），HTML 排版精美 |
| 定时任务 | 5 级时间线（20→21→22→23→00），node-cron 调度稳定 |
| 安全设计 | httpOnly cookie + AES-256-CBC session + 验证码一次性使用 |
| 频率控制 | 双重限流（内存 rateLimiter + 数据库 emailLogs） |
| 代码组织 | API 文件路由 + Nitro 插件自动启动 + Drizzle ORM 类型安全 |
| 教学价值 | 保留反面教材、有详细的 教学.md 和 README |

---

✅ **总体结论**：项目结构性良好，核心功能完整可用。**新发现 1 个 P0、3 个 P1、4 个 P2/P3**。重点修复周日日期计算和互换打卡冲突即可。

📊 **总分**：从上次 10/10 → 新发现 8 个问题 → 建议修复后再次审查 👍
