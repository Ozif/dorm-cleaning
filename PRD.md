# 宿舍打扫卫生系统 - PRD (产品需求文档)

> **项目代号**: DormCleaning  
> **版本**: v1.3  
> **状态**: 定稿

---

## 1. 项目概述

### 1.1 背景
宿舍成员轮流打扫卫生时，人工排班容易出现不公平、忘记通知、难以换班等问题。需要一个自动化系统来管理打扫任务分配和通知。

### 1.2 目标
构建一个轻量级 Web 管理系统，实现：
- 打扫任务的自动排班（每日一人负责全部卫生）
- 日历式拖拽调整排班
- 成员间任务互换（纯互换，无转让）
- 定时邮件催办 + 未完成记录 + 管理员代签

### 1.3 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | **Nuxt 3** (Vue 3) | 全栈框架，前后端一体 |
| 语言 | **TypeScript** | 全项目统一 |
| 包管理 | **pnpm** | |
| 数据库 | **MySQL 8.0** | 宝塔面板管理，连接信息在 `.env` |
| 邮件 | **QQ邮箱 SMTP** | 仅发信功能（不读取邮件） |
| 拖拽 | **vuedraggable / SortableJS** | 日历排班拖拽 |
| 动效 | **CSS transitions / GSAP** | 日历切换动画 + 放入光效 |
| 定时任务 | **node-cron** | 内建任务调度器，每天定点扫描并发送催办邮件 |
| ORM | **Drizzle ORM** | 数据库操作与迁移 |

---

## 2. 功能需求

### 2.1 宿舍注册（需超级管理员审批）
- 服务器只有**一位超级管理员**，即 `.env` 中配置的 `SUPER_ADMIN_EMAIL`
- 新宿舍注册流程：
  1. 访客访问注册页，填写：**宿舍名称 + 申请人姓名 + 申请人邮箱**
  2. 系统发送审批邮件到超级管理员邮箱
     - 邮件内容：新宿舍申请详情（宿舍名、申请人、联系方式）+ **审批通过链接**
  3. 超级管理员（你）点击邮件中的链接 → 确认开通
     - 审批通过时，**自动将申请人邮箱设为已验证**（省去管理员再验证一次邮箱的步骤）
  4. 系统自动创建该宿舍，并发**欢迎邮件**给申请人
  5. 申请人收到欢迎邮件后，即可登录系统（首位成员默认为宿舍管理员）
- 超级管理员**不需要登录后台**，通过邮件链接即可完成审批
- 审批链接有效期 **7 天**

### 2.2 用户认证
- **仅宿舍管理员可登录后台**，使用自己的邮箱接收验证码登录（无密码）
- 每个宿舍只有一位管理员
- **注册时首位成员自动成为管理员**
- 登录流程：
  1. 输入邮箱
  2. 系统发送 6 位验证码到该邮箱
  3. 输入验证码完成登录
  4. 验证码有效期 10 分钟
- **频率限制**：同一邮箱 60 秒内只能发送 1 次，每小时最多 5 次
- 非管理员成员无需登录系统，通过邮件接收通知和操作链接

### 2.3 宿舍初始化（管理员登录后）
> 宿舍名称已在注册时填写，无需再次配置。

首次登录后配置流程：
1. 设置打扫频率（每周 N 次 / 每月 N 次）
2. 添加打扫任务列表（如 "扫地"、"拖地"、"倒垃圾"、"卫生间"等）
3. 逐个添加成员（姓名 + 邮箱），系统自动发送验证码验证邮箱
4. 设置每位成员的打扫**权重**（权重高的成员排班更频繁，默认 1.0）
5. 系统根据权重自动生成排班计划

### 2.4 成员管理
- **添加成员**：姓名 + 邮箱（必填）
- **邮箱验证**：首次添加时，系统发送验证码到该邮箱，成员需输入验证码完成验证
- **权重设置**：每位成员可设置打扫权重（0.5~3.0），决定排班频率
- **成员列表**：展示所有成员、邮箱验证状态、权重值
- **编辑/删除成员**（删除成员后自动调整后续排班）
- **宿舍人数实时计算**：每次查询时统计实际成员数，无需单独维护人数字段

### 2.5 排班规则
- **每天一人负责所有卫生**，不再按任务拆分配置
- 排班逻辑：
  - 根据打扫频率（每周几次 / 每月几次）确定周期内打扫天数
  - 按权重比例分配，权重高的成员排班更多
  - 以**轮次**为单位循环，保证公平性
  - 记录每次打扫的历史

### 2.6 日历式排班管理 🗓️
管理员在排班页面看到的是一个**交互式日历**：

**布局：**
- **左侧**：成员列表（可拖拽的头像/名字卡片）
- **右侧**：日历网格，每个格子代表一天

**视图切换：**
- 支持**周视图**和**月视图**切换
- 切换时使用**平滑过渡动画**（如缩放+平移），丝滑切换

**AI 自动排班：**
- 系统按权重自动填入排班（每个有打扫任务的格子显示负责成员）
- 默认优先展示当前周期

**拖拽调整：**
- 管理员从左侧**拖拽成员卡片**到日历格子里
- 放入时格子有**光效闪烁**（约 300ms 的发光动画）
- 拖拽后自动更新排班记录
- 手动调整不影响后续自动轮换逻辑

**交互细节：**
- 已排班的格子显示该成员的姓名和头像
- 空格子显示 "待分配" 或灰色背景
- 支持跨日拖拽

### 2.7 任务互换 🔄
- **仅支持互换，不支持转让**。保持公平，私下交易自行解决
- 成员之间可以**互换打扫任务**（A 的某天 ↔ B 的某天）
- 互换操作会**同时更新两条排班记录**，交换双方的 `member_id`
- **发起入口（成员）**：
  - 在每天 **20:00 的首次提醒邮件**中，除了"确认完成"链接，额外附带**"发起互换"链接**
  - 成员点击后进入互换页面，可看到自己该天的排班信息
  - 选择想要交换的 B 成员及 B 的某一天（从该宿舍未来排班中选取）
  - 提交后系统自动向 B 发送确认邮件
- **发起入口（管理员）**：
  - 管理员可在排班日历中直接右键/点击成员卡片，选择"发起互换"
  - 使用同样的确认流程
- 互换确认流程：
  1. A 发起互换请求（选择 A 的某天 ↔ B 的某天）
  2. B 收到确认邮件，点击链接审批
  3. B 确认后，系统**原子化更新**：a）更新两条 schedules 的 member_id 互换；b）设置 status='swapped'、swapped_with 指向对方；c）写入 swap_logs 记录
  4. A 和 B 都收到互换成功通知
- 下次排班时恢复正常轮换（互换仅影响当前轮次）

### 2.8 邮件通知与催办 ⏰

| 时间 | 事件 | 说明 |
|------|------|------|
| **当天 20:00** | 🟡 首次提醒 | 发送邮件通知该成员：今日有打扫任务 + **"发起互换"链接** |
| **当天 21:00** | 🔴 催办（第1次） | 若未确认完成，再次发送催办邮件 |
| **当天 22:00** | 🔴 催办（第2次） | 若仍未确认，继续催办 |
| **当天 23:00** | 🔴 催办（第3次） | 继续催办 |
| **当天 00:00** | ⚫ 记为未完成 | 记录一次未完成，schedules.status → 'missed' |

- 成员收到邮件后，可通过邮件中的链接**确认打扫完成** → `schedules.status` 设为 `'done'`
- 确认后停止催办
- 每次催办发送前检查 `schedules.status`，已完成则不发送
- **定时任务实现**：通过 **node-cron** 内建调度器，每天 20:00/21:00/22:00/23:00/00:00 扫描当天未完成排班并发送邮件（也可部署层面 crontab 调 Nuxt API，二选一）
- 未完成记录留存在 `missed_logs` 表中，可供管理员查看历史统计

### 2.9 管理员代签 ✅
- 管理员可在未完成记录页面查看所有 `missed_logs` 记录
- 确认实际已打扫后，点击**代签**按钮
- 代签操作：
  - `missed_logs.status` → `'cleared'`
  - `missed_logs.cleared_by` → 当前管理员 ID
  - `missed_logs.cleared_at` → 当前时间
  - `schedules.status` → `'done'`（排班表同时改为已完成）
  - `schedules.completed_at` → 当前时间
- 类似学习通教师代签机制

### 2.10 管理页面功能一览
| 页面 | 功能 |
|------|------|
| 注册页 | 新宿舍申请注册（提交后等超级管理员审批） |
| 登录页 | 输入邮箱 → 获取验证码 → 登录 |
| 首页 / 仪表盘 | 今日打扫概览、本周排班、未完成统计 |
| 宿舍配置页 | 打扫频率、任务列表 CRUD |
| 成员管理页 | 添加/编辑/删除成员、权重设置、邮箱验证状态 |
| **排班日历页** | 周/月视图切换、**拖拽调整**、AI 自动排班 |
| 互换管理页 | 查看/审批互换请求 |
| 历史记录页 | 打扫完成记录、未完成记录（可代签）、互换记录 |
| 催办日志页 | 邮件发送记录、发送状态 |

---

## 3. 数据模型

### 3.1 宿舍配置表 (dorm_config)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| dorm_name | VARCHAR | 宿舍名称（注册时填写） |
| frequency_type | ENUM('weekly','monthly') | 打扫频率类型 |
| frequency_count | INT | 每周期打扫次数 |
| admin_member_id | INT (FK) | 管理员成员 ID（首位注册者） |
| is_active | BOOLEAN | 是否已审批开通 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 3.2 打扫任务表 (cleaning_tasks)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| dorm_id | INT (FK) | 关联宿舍 |
| task_name | VARCHAR | 任务名称（如 "扫地"） |
| sort_order | INT | 排序 |
| created_at | DATETIME | |

> 任务列表仅用于告知成员当日的打扫内容，排班不再按任务拆分配到人。

### 3.3 成员表 (members)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| dorm_id | INT (FK) | 关联宿舍 |
| name | VARCHAR | 成员姓名 |
| email | VARCHAR | 邮箱 |
| weight | DECIMAL(3,1) | 打扫权重（默认 1.0，范围 0.5~3.0） |
| email_verified | BOOLEAN | 邮箱是否已验证 |
| verify_code | VARCHAR | 验证码（临时） |
| verify_code_expires | DATETIME | 验证码过期时间 |
| login_code | VARCHAR | 登录验证码（管理员登录用） |
| login_code_expires | DATETIME | 登录验证码过期时间 |
| created_at | DATETIME | |

> 管理员审批通过时，申请人邮箱自动设为已验证，无需再次验证。

### 3.4 排班表 (schedules)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| dorm_id | INT (FK) | 关联宿舍 |
| member_id | INT (FK) | 当日打扫负责人（一人负责全部卫生） |
| scheduled_date | DATE | 打扫日期 |
| week_number | INT | 轮次编号 |
| status | ENUM('pending','done','swapped','missed','admin_approved') | 状态 |
| completed_at | DATETIME | 确认完成时间 |
| swapped_with | INT (FK, nullable) | 互换目标成员 ID |
| created_at | DATETIME | |
| updated_at | DATETIME | |

> 每天只对应一条排班记录（一人负责全部），不再按任务拆分。

### 3.5 互换记录表 (swap_logs)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| schedule_id_a | INT (FK) | 发起方排班 ID |
| schedule_id_b | INT (FK) | 接收方排班 ID |
| from_member_a | INT (FK) | 发起方原负责人 |
| to_member_b | INT (FK) | 接收方原负责人 |
| status | ENUM('pending','approved','rejected') | 互换状态 |
| swapped_at | DATETIME | 完成时间 |
| created_at | DATETIME | |

> 互换同时更新两条 schedules 的 member_id、status='swapped'、swapped_with 指向对方。一条 swap_logs 记录即可完整回溯双向互换。

### 3.6 邮件日志表 (email_logs)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| dorm_id | INT (FK) | 关联宿舍 |
| schedule_id | INT (FK) | 关联排班（可为空） |
| member_id | INT (FK) | 收件人 |
| email | VARCHAR | 发送到邮箱 |
| email_type | ENUM('remind','urge','verify','login','swap_request','swap_confirm','approval_request','approval_confirm') | 邮件类型 |
| subject | VARCHAR | 邮件主题 |
| sent_at | DATETIME | 发送时间 |
| status | ENUM('success','failed') | 发送状态 |

### 3.7 未完成记录表 (missed_logs)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| schedule_id | INT (FK) | 关联排班 |
| member_id | INT (FK) | 关联成员 |
| missed_date | DATE | 未完成日期 |
| status | ENUM('missed','cleared') | 状态：未完成 / 已代签 |
| cleared_by | INT (FK, nullable) | 代签管理员成员 ID |
| cleared_at | DATETIME | 代签时间 |
| recorded_at | DATETIME | 记录时间 |

### 3.8 注册审批表 (registration_requests)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT (PK) | 主键 |
| dorm_name | VARCHAR | 申请宿舍名称 |
| applicant_name | VARCHAR | 申请人姓名 |
| applicant_email | VARCHAR | 申请人邮箱 |
| approve_token | VARCHAR | 审批链接令牌 |
| status | ENUM('pending','approved','rejected','expired') | 审批状态 |
| approved_at | DATETIME | 审批通过时间 |
| expires_at | DATETIME | 链接过期时间 |
| created_at | DATETIME | |

---

## 4. .env 配置

```env
# ========== 数据库配置 ==========
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=***

# ========== QQ邮箱 SMTP 配置 ==========
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=QQ邮箱SMTP授权码（非QQ密码）

# ========== 超级管理员（就是你） ==========
SUPER_ADMIN_EMAIL=你的邮箱@qq.com

# ========== 应用配置 ==========
NUXT_PORT=3000
NUXT_PUBLIC_URL=http://localhost:3000  # 公网部署时改为实际域名
```

---

## 5. 非功能需求

### 5.1 界面要求
- 简洁清晰，**移动端优先**（宿舍用手机访问）
- 支持中文界面
- 登录验证码输入体验流畅
- **日历排班页动效要求**：
  - 周/月视图切换时平滑过渡（缩放+平移动画）
  - 拖拽成员放入日历时格子有光效闪烁（~300ms）
  - 整体操作反馈流畅不卡顿

### 5.2 安全性
- 验证码有效期 10 分钟
- SMTP 密码存于 .env，不提交到代码仓库
- 邮箱验证防暴力请求：**同一邮箱 60 秒内仅限 1 次，每小时最多 5 次**
- 审批链接使用随机 token，不可猜测

### 5.3 定时任务
催办逻辑通过**内建任务调度器**实现：
- 使用 `node-cron` 在 Nuxt 服务端注册定时任务
- 也可通过部署层面的 crontab 定时调用 Nuxt API 端点（二选一）
- 每天 20:00 / 21:00 / 22:00 / 23:00 / 00:00 执行扫描
- 每次扫描：查询当天 `schedules` 中 `status='pending'` 的记录 → 发送对应邮件

### 5.4 部署
- `pnpm dev` 可本地运行开发
- 可通过宝塔面板反代部署到公网
- 数据库表结构使用 Drizzle ORM 自动迁移

---

## 6. 代码规范

> 所有代码必须严格遵守以下规范，opencode 提交代码后 Hermes Agent 进行审查，
> 不通过则返工。

### 6.1 项目结构规范

```
dorm-cleaning/
├── server/                  # 服务端代码
│   ├── api/                 # API 路由（按业务模块分文件）
│   │   ├── auth.ts          # 认证相关
│   │   ├── dorm.ts          # 宿舍配置
│   │   ├── member.ts        # 成员管理
│   │   ├── schedule.ts      # 排班管理
│   │   ├── swap.ts          # 任务互换
│   │   └── notification.ts  # 邮件通知/催办
│   ├── models/              # 数据模型 / ORM schema
│   │   └── schema.ts        # Drizzle ORM 表定义
│   ├── services/            # 业务逻辑层（与 API 路由分离）
│   │   ├── auth.service.ts
│   │   ├── schedule.service.ts
│   │   ├── swap.service.ts
│   │   ├── notification.service.ts
│   │   └── email.service.ts
│   ├── utils/               # 工具函数
│   │   ├── email.ts         # SMTP 邮件发送
│   │   └── cron.ts          # node-cron 定时任务
│   └── middleware/          # 中间件
│       └── auth.ts          # 登录验证中间件
├── pages/                   # Nuxt 页面
│   ├── login.vue
│   ├── register.vue
│   ├── index.vue            # 首页仪表盘
│   ├── config.vue           # 宿舍配置
│   ├── members.vue          # 成员管理
│   ├── schedule.vue         # 排班日历
│   ├── swap.vue             # 互换管理
│   ├── history.vue          # 历史记录
│   └── logs.vue             # 催办日志
├── components/              # 可复用 Vue 组件
│   ├── Calendar.vue         # 日历组件（周/月视图）
│   ├── MemberCard.vue       # 成员拖拽卡片
│   ├── SwapModal.vue        # 互换弹窗
│   └── ConfirmDialog.vue    # 通用确认对话框
├── layouts/                 # Nuxt 布局
│   └── default.vue
├── composables/             # 组合式函数
├── .env                     # 环境变量（不提交）
├── .env.example             # 环境变量模板
├── nuxt.config.ts
├── drizzle.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 6.2 编码风格
- **语言**：全项目 TypeScript，禁止使用 `any`，善用 `interface` / `type`
- **面向对象**：业务逻辑层（services）使用 Class 组织，如 `class ScheduleService {}`，api 层可使用函数式
- **命名**：
  - 文件/目录：`kebab-case`
  - 类/接口/类型：`PascalCase`
  - 变量/函数/方法：`camelCase`
  - 常量/枚举：`UPPER_SNAKE_CASE`
  - 表名：`snake_case`
- **注释**：
  - 每个函数/方法必须写 JSDoc 注释（用途、参数、返回值）
  - 复杂逻辑需要行内注释说明
  - API 路由需标注 HTTP 方法和路径
- **模块化**：严格按业务分模块，每个模块遵循 `/api → /services → /models` 的调用链，禁止跨层直接调用数据库

### 6.3 Git 规范
- **初始提交**：第一阶段初始化后创建 `.gitignore` + 首次 commit
- **提交粒度**：每个功能点一次 commit，message 用中文清晰描述改动
- **提交频率**：每个开发阶段完成后至少一次 commit
- **分支策略**：全程在 `main` 分支开发（单人项目）
- **commit 示例**：
  ```
  feat: 完成数据库表创建与初始迁移
  feat: 实现管理员邮箱验证码登录
  fix: 修复验证码发送频率限制未生效的问题
  refactor: 抽离排班算法为独立 Service
  ```

### 6.4 上下文维护
opencode 在每次提交前，必须维护以下上下文文件，放在项目根目录：

- **`PROGRESS.md`** — 项目进度记录
  ```
  # 项目进度

  ## 当前阶段：第二阶段（注册与认证）
  - ✅ 第一阶段：基础框架（2026-06-18）
  - 🔄 第二阶段：注册与认证（进行中）
  - ⬜ 第三阶段：排班核心
  - ⬜ 第四阶段：通知与催办
  - ⬜ 第五阶段：完善

  ## 已完成功能
  - ✅ 初始化 Nuxt 3 + TypeScript + pnpm 项目
  - ✅ 配置 MySQL + Drizzle ORM + 数据表迁移
  - ✅ 搭建基础布局

  ## 当前工作
  - 实现宿舍注册申请页
  - 实现超级管理员审批流程

  ## 已修复 Bug
  | 日期 | Bug | 原因 | 修复方式 |
  |------|-----|------|----------|
  | 2026-06-18 | 验证码频率限制未生效 | 中间件顺序错误 | 将 rate-limit 中间件移到路由注册前 |
  ```

- **`CHANGELOG.md`** — 每次开发结束更新

### 6.5 质量门禁
每次 opencode 提交代码后，Hermes Agent 审查以下内容，全部通过才合入：
1. ✅ 代码结构是否符合 6.1 的模块划分
2. ✅ TypeScript 类型是否正确（无 `any`、无类型错误）
3. ✅ 函数是否有 JSDoc 注释
4. ✅ 业务逻辑是否符合 PRD 需求
5. ✅ 是否存在安全隐患（SQL 注入、XSS、密码明文等）
6. ✅ 是否符合面向对象风格（services 层）

不通过则要求 opencode 返工，通过后继续下一项工作。

---

## 7. 开发路线

### 第一阶段：基础框架
- [ ] 初始化 Nuxt 3 + TypeScript + pnpm 项目
- [ ] 配置 ESLint / Prettier
- [ ] 配置 MySQL + Drizzle ORM
- [ ] 创建数据表结构（migration）
- [ ] 搭建基础布局

### 第二阶段：注册与认证
- [ ] 宿舍注册申请页 + 超级管理员审批流程
- [ ] 管理员邮箱验证码登录（含频率限制）
- [ ] 宿舍初始化配置（频率、任务、成员）
- [ ] 成员管理（增删改 + 权重 + 邮箱验证）

### 第三阶段：排班核心
- [ ] 按权重自动排班算法（每日一人）
- [ ] **日历排班页面**（周/月视图 + 切换动效）
- [ ] **拖拽调整排班**（左侧人员 → 日历格子 + 光效）
- [ ] 任务互换功能

### 第四阶段：通知与催办
- [ ] QQ SMTP 邮件发送
- [ ] node-cron 定时催办（20→21→22→23→00 记未完成）
- [ ] 打扫完成确认（邮件链接）
- [ ] 管理员代签功能
- [ ] 历史记录与统计

### 第五阶段：完善
- [ ] 移动端适配打磨
- [ ] 错误处理和提示优化
- [ ] 部署文档 + 使用手册

---

## 8. 已确认事项

- ✅ 超级管理员审批宿舍注册（邮件链接一键通过）
- ✅ 审批通过时，申请人邮箱自动验证（省去再次验证）
- ✅ 管理员邮箱验证码登录（无密码，60s/次 频率限制）
- ✅ 宿舍名称取自注册申请，不再二次配置
- ✅ 无"宿舍总人数"字段，实时统计成员数
- ✅ 每天一人负责全部卫生，按权重轮换
- ✅ 日历排班页：周/月视图切换 + 拖拽 + 光效
- ✅ 仅支持互换，不支持转让
- ✅ 每天 20:00 首次提醒打扫
- ✅ 每小时催办一次（21~23点），凌晨记未完成
- ✅ 管理员代签 → schedules 同步改为 done
- ✅ node-cron 实现定时任务
- ✅ 使用 Nuxt 3 + TypeScript + pnpm
- ✅ MySQL 数据库（宝塔）
- ✅ QQ邮箱 SMTP 仅发信
- ✅ Drizzle ORM 管理数据库

---

> 📅 创建日期：2026-06-18  
> 📝 版本：v1.3（定稿）  
> 下一步：委托 opencode 开始开发第一阶段
