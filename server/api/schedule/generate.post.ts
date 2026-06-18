import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'
import { schedulerService } from '~/server/services/scheduler'

/**
 * POST /api/schedule/generate
 * 生成指定时间段的排班计划
 * Body: { startDate: string, days: number }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { startDate, days } = body

  if (!startDate || !days) {
    throw createError({ statusCode: 400, message: '请指定开始日期和天数' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { members, schedules, dormConfig } = await import('~/server/models/schema')

  // 获取宿舍配置
  const configList = await db.select()
    .from(dormConfig)
    .where(eq(dormConfig.id, dormId))
    .limit(1)

  if (configList.length === 0) {
    await connection.end()
    throw createError({ statusCode: 404, message: '宿舍未配置' })
  }

  // 获取成员列表
  const memberList = await db.select()
    .from(members)
    .where(eq(members.dormId, dormId))

  if (memberList.length === 0) {
    await connection.end()
    throw createError({ statusCode: 400, message: '宿舍暂无成员，请先添加成员' })
  }

  // 用排班算法生成
  const assignments = schedulerService.generateSchedule(memberList, startDate, days)

  if (assignments.length === 0) {
    await connection.end()
    throw createError({ statusCode: 500, message: '排班生成失败' })
  }

  // 批量写入数据库
  for (const a of assignments) {
    // 检查是否已存在该日期的排班
    const existing = await db.select()
      .from(schedules)
      .where(eq(schedules.scheduledDate, a.scheduledDate))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(schedules).values({
        dormId,
        memberId: a.memberId,
        scheduledDate: a.scheduledDate,
        weekNumber: a.weekNumber,
        status: 'pending',
      })
    }
  }

  await connection.end()

  return {
    success: true,
    message: `已生成 ${assignments.length} 天排班`,
    count: assignments.length,
  }
})
