import { eq, and } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'

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

  const { db } = getDb()
  const { schedules, missedLogs } = await import('~~/server/models/schema')

  // 查找该排班
  const scheduleList = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, scheduleId), eq(schedules.dormId, user.dormId)))
    .limit(1)

  if (scheduleList.length === 0) {
    throw createError({ statusCode: 404, message: '排班记录不存在' })
  }

  const schedule = scheduleList[0]!

  await db.transaction(async (tx) => {
    // 更新排班状态为 done
    await tx
      .update(schedules)
      .set({
        status: 'done',
        completedAt: new Date(),
      })
      .where(eq(schedules.id, scheduleId))

    // 从 missed_logs 中移除（标记为 cleared）
    await tx
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
  })

  return {
    success: true,
    message: '已签收漏扫记录',
    scheduleId,
    memberId: schedule.memberId,
    date: schedule.scheduledDate,
  }
})
