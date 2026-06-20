import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { formatDateOnly, parseDateOnly } from '~~/server/utils/date'

/**
 * GET /api/schedule
 * 获取指定日期范围的排班
 * Query: start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const query = getQuery(event)
  const start = query.start as string
  const end = query.end as string

  // 默认本周
  const now = new Date()
  const dayOfWeek = now.getDay() || 7  // Sunday=0 -> 7, Monday=1..Saturday=6
  const startDate = start || formatDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1))
  const endDate = end || formatDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7))

  const { db } = getDb()
  const { schedules, members } = await import('~~/server/models/schema')

  const scheduleList = await db.select()
    .from(schedules)
    .where(
      and(
        eq(schedules.dormId, dormId),
        gte(schedules.scheduledDate, parseDateOnly(startDate)),
        lte(schedules.scheduledDate, parseDateOnly(endDate)),
      )
    )
    .orderBy(schedules.scheduledDate)

  const memberIds = [...new Set(scheduleList.map(s => s.memberId))]
  const memberList = memberIds.length > 0
    ? await db.select().from(members).where(inArray(members.id, memberIds))
    : []

  const memberMap = new Map(memberList.map(m => [m.id, m]))

  return scheduleList.map(s => ({
    id: s.id,
    memberId: s.memberId,
    memberName: memberMap.get(s.memberId)?.name || '未知',
    scheduledDate: formatDateOnly(s.scheduledDate),
    weekNumber: s.weekNumber,
    status: s.status,
    completedAt: s.completedAt,
    swappedWith: s.swappedWith,
  }))
})
