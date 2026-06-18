# 变更日志

## [1.0.0] - 2026-06-18

### 新增
- 初始化 Nuxt 3 + TypeScript + pnpm 项目
- 配置 Drizzle ORM 与 MySQL 连接
- 创建数据表定义（8张表）
- 配置 drizzle.config.ts 数据库迁移
- 搭建基础项目结构与布局

## [1.1.0] - 2026-06-18

### 新增
- 宿舍注册申请页面 + 审批流程（POST /api/register）
- 超级管理员审批入口（GET /api/approve/:token）
- 管理员邮箱验证码登录（login.vue + send-code/login API）
- Session 加密认证中间件（crypto.ts + auth.ts）
- 首页仪表盘（今日打扫 + 本周排班 + 最近记录）
- 宿舍配置管理页面（打扫频率 + 任务列表 CRUD）
- 成员管理页面（添加/删除/权重调节）
- 后端 API：dorm config CRUD、members CRUD、tasks CRUD

## [1.2.0] - 2026-06-18

### 新增
- 排班算法服务（权重比例分配 + 不连续值班检测）
- 获取排班 GET /api/schedule
- 生成排班 POST /api/schedule/generate
- 打卡完成 POST /api/schedule/complete
- 日历排班页面（周/月双视图 + 操作弹窗）
- 互换 API：发起/查询/审批（POST/GET/PUT /api/swap）
- 互换管理页面（待处理/历史双 Tab）
- 打扫记录页面（全部/已完成/未完成筛选）
- 原子化双向互换 + 冲突检测
