# DormCleaning 🧹 — 宿舍打扫卫生管理系统

> 基于 Nuxt 4 + MySQL 的智能宿舍排班系统，让你的舍友再也不用争论"今天轮到谁打扫"了！

---

## ✨ 功能特性

| 模块 | 功能 | 状态 |
|------|------|:----:|
| 🏠 **宿舍注册** | 申请人填写宿舍信息 → 超级管理员邮箱审批 | ✅ |
| 🔐 **邮箱登录** | 验证码发送到管理员邮箱，60秒冷却 + 每小时5次限制 | ✅ |
| 👥 **成员管理** | 添加/删除成员，设置打扫权重（0.5~3.0），邮箱验证 | ✅ |
| ⚙️ **宿舍配置** | 设置打扫频率（每周/每月）、打扫任务列表 | ✅ |
| 📅 **智能排班** | 按权重比例自动分配，保证不连续值班 | ✅ |
| 🔄 **双向互换** | 成员之间可以发起互换，对方确认后原子化交换 | ✅ |
| ✅ **打卡完成** | 打扫完了一键打卡，记录完成时间 | ✅ |
| 📧 **定时提醒** | 20:00 首次提醒 → 21/22/23 三次催办 → 00:00 标记漏扫 | ✅ |
| 🎛️ **任务控制** | 可视化控制面板，可手动触发/停止定时任务 | ✅ |
| 📋 **漏扫管理** | 查看漏扫记录，管理员可手动签销 | ✅ |

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **Nuxt 4** (Vue 3 + TypeScript) | 全栈框架，前后端一体 |
| **pnpm** | 包管理器 |
| **MySQL 8.0** | 关系型数据库 |
| **Drizzle ORM** | 数据库 ORM，类型安全 |
| **node-cron** | 定时任务调度 |
| **nodemailer** | 邮件发送（QQ SMTP 465端口） |

---

## 🚀 快速开始

### 前置要求

- Node.js >= 20
- pnpm 已安装
- MySQL 8.0+ 运行中

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入真实配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=dorm_cleaning

# SMTP 邮件（QQ邮箱）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your_email@qq.com
SMTP_PASS=your_smtp_authorization_code

# 超级管理员邮箱（审批宿舍注册用）
SUPER_ADMIN_EMAIL=admin@example.com

# Session 加密密钥（随便写个长字符串）
NUXT_SESSION_PASSWORD=your_random_secret_key_here

# 应用端口
NUXT_PORT=3000
```

> 💡 QQ 邮箱的 SMTP 授权码在设置 → 账户 → POP3/IMAP/SMTP 服务中开启并生成

### 3. 创建数据库

在 MySQL 中执行：

```sql
CREATE DATABASE dorm_cleaning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 推送数据表

```bash
pnpm drizzle-kit push
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 🎉

---

## 📁 项目结构

```
dorm-cleaning/
├── app/
│   └── app.vue                    # 根组件（Nuxt 入口）
├── layouts/
│   └── default.vue                # 默认布局（导航栏 + 底部栏）
├── pages/                         # 📄 前端页面（Nuxt 文件路由）
│   ├── index.vue                  # 🏠 首页仪表盘
│   ├── login.vue                  # 🔐 管理员登录
│   ├── register.vue               # 📝 宿舍注册申请
│   ├── config.vue                 # ⚙️ 宿舍配置
│   ├── members.vue                # 👥 成员管理
│   ├── schedule.vue               # 📅 日历排班
│   ├── swap.vue                   # 🔄 互换管理
│   ├── history.vue                # 📋 打扫记录
│   ├── cron.vue                   # ⏰ 定时任务控制
│   └── admin/
│       └── missed.vue             # 📋 漏扫管理
├── server/
│   ├── models/
│   │   └── schema.ts              # 🗄️ Drizzle 数据表定义（8张表）
│   ├── services/
│   │   ├── scheduler.ts           # 🧮 排班算法
│   │   └── cron.ts                # ⏰ 定时任务调度
│   ├── plugins/
│   │   └── cron.ts                # Nitro 启动插件
│   ├── api/                       # 📡 后端 API（Nuxt Server Routes）
│   │   ├── register.post.ts       # 注册申请
│   │   ├── approve/[token].get.ts # 审批入口
│   │   ├── auth/
│   │   │   ├── send-code.post.ts  # 发送验证码
│   │   │   └── login.post.ts      # 验证码登录
│   │   ├── dorm/
│   │   │   ├── config.get.ts      # 获取宿舍配置
│   │   │   ├── config.put.ts      # 更新宿舍配置
│   │   │   ├── tasks.post.ts      # 添加打扫任务
│   │   │   └── tasks/delete.post.ts # 删除打扫任务
│   │   ├── members.get.ts         # 成员列表
│   │   ├── members.post.ts        # 添加成员
│   │   ├── members.put.ts         # 更新权重
│   │   ├── members.delete.ts      # 删除成员
│   │   ├── schedule.get.ts        # 获取排班
│   │   ├── schedule/generate.post.ts  # 生成排班
│   │   ├── schedule/complete.post.ts  # 打卡完成
│   │   ├── schedule/missed.get.ts     # 获取漏扫列表（⚠️ 注意：这是个多余的错误路由示例）
│   │   ├── schedule/index.get.ts      # ⚠️ 错误路由示例（应为 /api/schedule）
│   │   ├── swap.get.ts            # 互换列表
│   │   ├── swap.post.ts           # 发起互换
│   │   ├── swap.put.ts            # 审批互换
│   │   ├── cron/
│   │   │   ├── status.get.ts      # 定时任务状态
│   │   │   ├── start.post.ts      # 启动定时任务
│   │   │   ├── stop.post.ts       # 停止定时任务
│   │   │   └── trigger.post.ts    # 手动触发
│   │   └── admin/
│   │       └── signoff.post.ts    # 管理员签销
│   └── utils/
│       ├── auth.ts                # 认证工具（requireAuth）
│       ├── crypto.ts              # 加密工具（AES-256-CBC）
│       ├── email.ts               # 邮件服务
│       ├── cron.ts                # Cron 导出桥接
│       └── rateLimit.ts           # 限流器
├── nuxt.config.ts                 # Nuxt 配置文件
├── drizzle.config.ts              # Drizzle ORM 配置
├── .env.example                   # 环境变量模板
├── CHANGELOG.md                   # 变更日志
├── PROGRESS.md                    # 项目进度
└── README.md                      # 本文件
```

---

## 📡 API 概览

### 认证模块
| 路径 | 方法 | 说明 | 频率限制 |
|------|:----:|------|:--------:|
| `/api/register` | POST | 提交宿舍注册申请 | - |
| `/api/approve/[token]` | GET | 超级管理员审批（点击邮件链接） | - |
| `/api/auth/send-code` | POST | 发送邮箱验证码 | 60s/1次, 5次/小时 |
| `/api/auth/login` | POST | 验证码登录 | - |

### 宿舍配置
| 路径 | 方法 | 说明 |
|------|:----:|------|
| `/api/dorm/config` | GET | 获取宿舍配置 |
| `/api/dorm/config` | PUT | 更新宿舍配置（需登录） |
| `/api/dorm/tasks` | POST | 添加打扫任务（需登录） |
| `/api/dorm/tasks/delete` | POST | 删除打扫任务（需登录） |

### 成员管理
| 路径 | 方法 | 说明 |
|------|:----:|------|
| `/api/members` | GET | 获取成员列表 |
| `/api/members` | POST | 添加成员 |
| `/api/members` | PUT | 更新成员权重 |
| `/api/members` | DELETE | 删除成员 |

### 排班
| 路径 | 方法 | 说明 |
|------|:----:|------|
| `/api/schedule` | GET | 获取排班列表（支持 start/end 日期过滤） |
| `/api/schedule/generate` | POST | 按权重生成排班 |
| `/api/schedule/complete` | POST | 打卡完成 |

### 互换
| 路径 | 方法 | 说明 |
|------|:----:|------|
| `/api/swap` | GET | 获取我的互换请求 |
| `/api/swap` | POST | 发起互换请求 |
| `/api/swap` | PUT | 审批互换（通过/拒绝） |

### 定时任务
| 路径 | 方法 | 说明 |
|------|:----:|------|
| `/api/cron/status` | GET | 获取定时任务运行状态 |
| `/api/cron/start` | POST | 启动所有定时任务 |
| `/api/cron/stop` | POST | 停止所有定时任务 |
| `/api/cron/trigger` | POST | 手动触发指定任务 |

### 管理员
| 路径 | 方法 | 说明 |
|------|:----:|------|
| `/api/admin/signoff` | POST | 管理员签销漏扫 |
| `/api/schedule/missed` | GET | 获取漏扫列表 |

---

## ⚖️ 排班算法说明

核心算法在 `server/services/scheduler.ts` 中，流程如下：

1. **计算总权重**：所有成员的 weight 之和
2. **按比例分配天数**：每个成员得到的排班天数 = `频率次数 × (个人权重 / 总权重)`
3. **轮转填充**：用 round-robin + 权重累积器决定具体值班日期
4. **不连续检测**：检查生成的排班，确保同一个人不会连续两天值班
5. **冲突检测**：互换时检查是否会导致不连续值班

> 例如：3 人宿舍 [张三(1.0), 李四(2.0), 王五(0.5)]，总权重 3.5，每周 7 天打扫。
> 理论分配：张三 2 天，李四 4 天，王五 1 天

---

## 📄 许可证

MIT

---

*基于 Nuxt 4 + Drizzle ORM + MySQL 构建 | 项目地址：[GitHub]*
