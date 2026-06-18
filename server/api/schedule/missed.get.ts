import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, desc, isNull } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * GET /api/schedule/missed
 * 获取所有漏扫记录（含已签收的）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, message: '仅管理员可查看' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { missedLogs, members } = await import('~/server/models/schema')

  // 联表查询
  const logs = await db
    .select({
      id: missedLogs.id,
      scheduleId: missedLogs.scheduleId,
      memberId: missedLogs.memberId,
      memberName: members.name,
      missedDate: missedLogs.missedDate,
      status: missedLogs.status,
      clearedBy: missedLogs.clearedBy,
      clearedAt: missedLogs.clearedAt,
    })
    .from(missedLogs)
    .leftJoin(members, eq(missedLogs.memberId, members.id))
    .orderBy(desc(missedLogs.missedDate))
    .limit(100)

  await connection.end()
  return logs
})
