import { eq, and, or, desc, alias } from 'drizzle-orm'
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
  const { missedLogs, members, schedules } = await import('~/server/models/schema')
  const clearedMembers = alias(members, 'cleared_members')

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
      clearedByName: clearedMembers.name,
    })
    .from(missedLogs)
    .leftJoin(members, and(eq(missedLogs.memberId, members.id), eq(members.dormId, user.dormId)))
    .leftJoin(clearedMembers, eq(missedLogs.clearedBy, clearedMembers.id))
    .leftJoin(schedules, and(eq(missedLogs.scheduleId, schedules.id), eq(schedules.status, 'missed')))
    .where(
      or(eq(schedules.status, 'missed'), eq(missedLogs.status, 'cleared')),
    )
    .orderBy(desc(missedLogs.missedDate))
    .limit(100)

  return logs
})
