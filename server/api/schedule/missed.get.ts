import { eq, desc, inArray } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { formatDateOnly } from '~~/server/utils/date'

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
  const { missedLogs, members } = await import('~~/server/models/schema')

  const logs = await db
    .select({
      id: missedLogs.id,
      scheduleId: missedLogs.scheduleId,
      memberId: missedLogs.memberId,
      missedDate: missedLogs.missedDate,
      status: missedLogs.status,
      clearedBy: missedLogs.clearedBy,
      clearedAt: missedLogs.clearedAt,
    })
    .from(missedLogs)
    .innerJoin(members, eq(missedLogs.memberId, members.id))
    .where(eq(members.dormId, user.dormId))
    .orderBy(desc(missedLogs.missedDate))
    .limit(100)

  const memberIds = new Set<number>()
  for (const log of logs) {
    memberIds.add(log.memberId)
    if (log.clearedBy) memberIds.add(log.clearedBy)
  }

  const memberList = memberIds.size > 0
    ? await db.select().from(members).where(inArray(members.id, [...memberIds]))
    : []
  const memberMap = new Map(memberList.map((member) => [member.id, member]))

  return logs.map((log) => ({
    ...log,
    memberName: memberMap.get(log.memberId)?.name || null,
    clearedByName: log.clearedBy ? (memberMap.get(log.clearedBy)?.name || null) : null,
    missedDate: formatDateOnly(log.missedDate),
  }))
})
