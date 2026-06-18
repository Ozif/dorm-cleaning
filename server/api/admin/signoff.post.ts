import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/admin/signoff
 * 管理员手动签收漏扫记录
 * Body: { scheduleId: number }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, message: '仅管理员可操作' })
  }

  const body = await readBody(event)
  const { scheduleId } = body || {}

  if (!scheduleId) {
    throw createError({ statusCode: 400, message: '请提供 scheduleId' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { schedules, missedLogs } = await import('~/server/models/schema')

  // 查找该排班
  const scheduleList = await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .limit(1)

  if (scheduleList.length === 0) {
    await connection.end()
    throw createError({ statusCode: 404, message: '排班记录不存在' })
  }

  const schedule = scheduleList[0]

  // 更新排班状态为 done
  await db
    .update(schedules)
    .set({
      status: 'done',
      completedAt: new Date(),
    })
    .where(eq(schedules.id, scheduleId))

  // 从 missed_logs 中移除（标记为 cleared）
  await db
    .update(missedLogs)
    .set({
      status: 'cleared',
      clearedBy: user.memberId,
      clearedAt: new Date(),
    })
    .where(
      and(
        eq(missedLogs.scheduleId, scheduleId),
        eq(missedLogs.status, 'missed'),
      ),
    )

  await connection.end()
  return {
    success: true,
    message: '已签收漏扫记录',
    scheduleId,
    memberId: schedule.memberId,
    date: schedule.scheduledDate,
  }
})
