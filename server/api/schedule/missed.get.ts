import { eq, desc } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
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

  const { db } = getDb()
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

  return logs
})
