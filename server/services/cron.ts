/**
 * 定时任务调度服务
 * 负责打扫提醒和催办邮件发送
 *
 * 任务时间表：
 * - 20:00 → 首次提醒（今天值班）
 * - 21:00 → 第 1 次催办
 * - 22:00 → 第 2 次催办
 * - 23:00 → 第 3 次催办
 * - 00:00 → 标记未完成 + 通知管理员
 */
import cron from 'node-cron'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, and, gte, lte, inArray, isNull } from 'drizzle-orm'
import { emailService } from '~/server/utils/email'

interface TaskInfo {
  name: string
  schedule: string
  lastRun: Date | null
  lastResult: string | null
}

export class CronService {
  private tasks: Map<string, cron.ScheduledTask> = new Map()
  private running = false
  private taskMeta: Map<string, TaskInfo> = new Map()

  constructor() {
    this.taskMeta.set('reminder-first', {
      name: '首次提醒',
      schedule: '0 20 * * *',
      lastRun: null,
      lastResult: null,
    })
    this.taskMeta.set('followup-1', {
      name: '第 1 次催办',
      schedule: '0 21 * * *',
      lastRun: null,
      lastResult: null,
    })
    this.taskMeta.set('followup-2', {
      name: '第 2 次催办',
      schedule: '0 22 * * *',
      lastRun: null,
      lastResult: null,
    })
    this.taskMeta.set('followup-3', {
      name: '第 3 次催办',
      schedule: '0 23 * * *',
      lastRun: null,
      lastResult: null,
    })
    this.taskMeta.set('mark-missed', {
      name: '标记漏扫',
      schedule: '0 0 * * *',
      lastRun: null,
      lastResult: null,
    })
  }

  get isRunning(): boolean {
    return this.running
  }

  get tasksInfo(): TaskInfo[] {
    return Array.from(this.taskMeta.values())
  }

  /**
   * 获取数据库连接
   */
  private async getDb() {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dorm_cleaning',
    })
    const db = drizzle(connection)
    const schema = await import('~/server/models/schema')
    return { connection, db, schema }
  }

  /**
   * 获取今天的日期字符串 YYYY-MM-DD
   */
  private getToday(): string {
    return new Date().toISOString().slice(0, 10)
  }

  /**
   * 获取今天的待完成排班
   */
  private async getTodayPendingSchedules(db: any, schema: any) {
    const today = this.getToday()
    const { schedules, members } = schema
    const result = await db
      .select({
        scheduleId: schedules.id,
        memberId: schedules.memberId,
        scheduledDate: schedules.scheduledDate,
        status: schedules.status,
        memberName: members.name,
        memberEmail: members.email,
        dormId: schedules.dormId,
      })
      .from(schedules)
      .leftJoin(members, eq(schedules.memberId, members.id))
      .where(
        and(
          eq(schedules.scheduledDate, today),
          eq(schedules.status, 'pending'),
        ),
      )
    return result
  }

  /**
   * 记录邮件日志
   */
  private async logEmail(
    db: any,
    schema: any,
    params: {
      dormId: number
      scheduleId?: number
      memberId?: number
      email: string
      emailType: string
      subject: string
      status: string
    },
  ) {
    const { emailLogs } = schema
    await db.insert(emailLogs).values({
      dormId: params.dormId,
      scheduleId: params.scheduleId ?? null,
      memberId: params.memberId ?? null,
      email: params.email,
      emailType: params.emailType,
      subject: params.subject,
      sentAt: new Date(),
      status: params.status,
    })
  }

  /**
   * 任务：首次提醒 - 20:00
   * 发送今天值班提醒
   */
  private async taskReminderFirst(): Promise<string> {
    try {
      const { connection, db, schema } = await this.getDb()
      const todaySchedules = await this.getTodayPendingSchedules(db, schema)
      if (todaySchedules.length === 0) {
        await connection.end()
        return '今天无人值班'
      }

      const publicUrl = process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'
      let sent = 0
      for (const s of todaySchedules) {
        const swapLink = `${publicUrl}/swap?date=${s.scheduledDate}`
        const ok = await emailService.sendReminder(
          s.memberEmail,
          s.memberName,
          s.scheduledDate,
          swapLink,
        )
        await this.logEmail(db, schema, {
          dormId: s.dormId,
          scheduleId: s.scheduleId,
          memberId: s.memberId,
          email: s.memberEmail,
          emailType: 'reminder_first',
          subject: `宿舍打扫提醒 - ${s.scheduledDate}`,
          status: ok ? 'success' : 'failed',
        })
        if (ok) sent++
      }
      await connection.end()
      return `首次提醒：共 ${todaySchedules.length} 人，成功发送 ${sent} 封`
    } catch (err: any) {
      return `提醒任务出错: ${err.message}`
    }
  }

  /**
   * 任务：催办
   */
  private async taskFollowUp(level: number): Promise<string> {
    try {
      const { connection, db, schema } = await this.getDb()
      const todaySchedules = await this.getTodayPendingSchedules(db, schema)
      if (todaySchedules.length === 0) {
        await connection.end()
        return `第 ${level} 次催办：今天无人值班`
      }

      const publicUrl = process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'
      let sent = 0
      for (const s of todaySchedules) {
        const swapLink = `${publicUrl}/swap?date=${s.scheduledDate}`
        const ok = await emailService.sendReminder(
          s.memberEmail,
          s.memberName,
          s.scheduledDate,
          swapLink,
        )
        await this.logEmail(db, schema, {
          dormId: s.dormId,
          scheduleId: s.scheduleId,
          memberId: s.memberId,
          email: s.memberEmail,
          emailType: `followup_${level}`,
          subject: `宿舍打扫催办 (${level}/3) - ${s.scheduledDate}`,
          status: ok ? 'success' : 'failed',
        })
        if (ok) sent++
      }
      await connection.end()
      return `第 ${level} 次催办：共 ${todaySchedules.length} 人，成功发送 ${sent} 封`
    } catch (err: any) {
      return `催办任务出错: ${err.message}`
    }
  }

  /**
   * 任务：标记漏扫 - 00:00
   * 将所有当天未完成的排班标记为 missed
   * 记录到 missed_logs
   * 通知管理员
   */
  private async taskMarkMissed(): Promise<string> {
    try {
      const { connection, db, schema } = await this.getDb()
      const { schedules, missedLogs, members, dormConfig } = schema
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const dateStr = yesterday.toISOString().slice(0, 10)

      // 查找昨天未完成的排班
      const pendingList = await db
        .select({
          scheduleId: schedules.id,
          memberId: schedules.memberId,
          scheduledDate: schedules.scheduledDate,
          dormId: schedules.dormId,
          memberName: members.name,
          memberEmail: members.email,
        })
        .from(schedules)
        .leftJoin(members, eq(schedules.memberId, members.id))
        .where(
          and(
            eq(schedules.scheduledDate, dateStr),
            eq(schedules.status, 'pending'),
          ),
        )

      if (pendingList.length === 0) {
        await connection.end()
        return '昨天无人漏扫'
      }

      // 更新状态为 missed
      const pendingIds = pendingList.map((p: any) => p.scheduleId)
      await db
        .update(schedules)
        .set({ status: 'missed' })
        .where(inArray(schedules.id, pendingIds))

      // 记录到 missed_logs
      let sentWarnings = 0
      for (const p of pendingList) {
        await db.insert(missedLogs).values({
          scheduleId: p.scheduleId,
          memberId: p.memberId,
          missedDate: p.scheduledDate,
          status: 'missed',
        })

        // 发送漏扫警告
        const ok = await emailService.sendMissedWarning(
          p.memberEmail,
          p.memberName,
          p.scheduledDate,
        )
        await this.logEmail(db, schema, {
          dormId: p.dormId,
          scheduleId: p.scheduleId,
          memberId: p.memberId,
          email: p.memberEmail,
          emailType: 'missed_warning',
          subject: `宿舍漏扫警告 - ${p.scheduledDate}`,
          status: ok ? 'success' : 'failed',
        })
        if (ok) sentWarnings++
      }

      // 通知超级管理员
      const adminEmail = process.env.SUPER_ADMIN_EMAIL
      if (adminEmail) {
        const names = pendingList.map((p: any) => p.memberName).join('、')
        await emailService.sendNotification(
          adminEmail,
          `宿舍漏扫报告 - ${dateStr}`,
          `${names} 未完成 ${dateStr} 的值班打扫任务，已标记为漏扫。`,
        )
      }

      await connection.end()
      return `标记漏扫：共 ${pendingList.length} 人漏扫，已发送 ${sentWarnings} 封警告`
    } catch (err: any) {
      return `标记漏扫任务出错: ${err.message}`
    }
  }

  /**
   * 注册所有定时任务
   */
  registerAll(): void {
    if (this.running) return

    // 20:00 首次提醒
    const t1 = cron.schedule('0 20 * * *', async () => {
      const result = await this.taskReminderFirst()
      const meta = this.taskMeta.get('reminder-first')
      if (meta) {
        meta.lastRun = new Date()
        meta.lastResult = result
      }
      console.log(`[Cron] ${result}`)
    })
    this.tasks.set('reminder-first', t1)

    // 21:00 第 1 次催办
    const t2 = cron.schedule('0 21 * * *', async () => {
      const result = await this.taskFollowUp(1)
      const meta = this.taskMeta.get('followup-1')
      if (meta) {
        meta.lastRun = new Date()
        meta.lastResult = result
      }
      console.log(`[Cron] ${result}`)
    })
    this.tasks.set('followup-1', t2)

    // 22:00 第 2 次催办
    const t3 = cron.schedule('0 22 * * *', async () => {
      const result = await this.taskFollowUp(2)
      const meta = this.taskMeta.get('followup-2')
      if (meta) {
        meta.lastRun = new Date()
        meta.lastResult = result
      }
      console.log(`[Cron] ${result}`)
    })
    this.tasks.set('followup-2', t3)

    // 23:00 第 3 次催办
    const t4 = cron.schedule('0 23 * * *', async () => {
      const result = await this.taskFollowUp(3)
      const meta = this.taskMeta.get('followup-3')
      if (meta) {
        meta.lastRun = new Date()
        meta.lastResult = result
      }
      console.log(`[Cron] ${result}`)
    })
    this.tasks.set('followup-3', t4)

    // 00:00 标记漏扫
    const t5 = cron.schedule('0 0 * * *', async () => {
      const result = await this.taskMarkMissed()
      const meta = this.taskMeta.get('mark-missed')
      if (meta) {
        meta.lastRun = new Date()
        meta.lastResult = result
      }
      console.log(`[Cron] ${result}`)
    })
    this.tasks.set('mark-missed', t5)

    this.running = true
    console.log('[Cron] 所有定时任务已注册并启动')
  }

  /**
   * 停止所有定时任务
   */
  stopAll(): void {
    for (const [, task] of this.tasks) {
      task.stop()
    }
    this.tasks.clear()
    this.running = false
    console.log('[Cron] 所有定时任务已停止')
  }

  /**
   * 手动触发指定任务（返回任务结果字符串）
   */
  async triggerTask(taskId: string): Promise<string> {
    switch (taskId) {
      case 'reminder-first':
        return await this.taskReminderFirst()
      case 'followup-1':
        return await this.taskFollowUp(1)
      case 'followup-2':
        return await this.taskFollowUp(2)
      case 'followup-3':
        return await this.taskFollowUp(3)
      case 'mark-missed':
        return await this.taskMarkMissed()
      default:
        return `未知任务: ${taskId}`
    }
  }
}

export const cronService = new CronService()
