import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/schedule/complete
 * 打卡完成打扫
 * Body: { scheduleId }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { scheduleId } = body

  if (!scheduleId) {
    throw createError({ statusCode: 400, message: '请指定排班记录' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { schedules } = await import('~/server/models/schema')

  const [sched] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1)

  if (!sched) {
    await connection.end()
    throw createError({ statusCode: 404, message: '排班记录不存在' })
  }

  if (sched.memberId !== user.memberId) {
    await connection.end()
    throw createError({ statusCode: 403, message: '只能打卡自己的排班' })
  }

  if (sched.status === 'done') {
    await connection.end()
    return { success: true, message: '已完成，无需重复打卡' }
  }

  await db.update(schedules)
    .set({ status: 'done', completedAt: new Date() })
    .where(eq(schedules.id, scheduleId))

  await connection.end()
  return { success: true, message: '打卡完成 ✅' }
})
