import { eq, and } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
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

  const { db } = getDb()
  const { schedules } = await import('~/server/models/schema')

  const [sched] = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.dormId, user.dormId))).limit(1)

  if (!sched) {
    throw createError({ statusCode: 404, message: '排班记录不存在' })
  }

  if (sched.memberId !== user.memberId) {
    throw createError({ statusCode: 403, message: '只能打卡自己的排班' })
  }

  // 检查是否为未来日期
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const schedDate = new Date(sched.scheduledDate)
  if (schedDate > today) {
    throw createError({ statusCode: 400, message: '未到值班日期，无法提前打卡' })
  }

  if (sched.status === 'done') {
    return { success: true, message: '已完成，无需重复打卡' }
  }

  // 允许 missed 状态补打卡
  if (sched.status !== 'pending' && sched.status !== 'missed') {
    throw createError({ statusCode: 400, message: '该排班状态不允许打卡' })
  }

  await db.update(schedules)
    .set({ status: 'done', completedAt: new Date() })
    .where(eq(schedules.id, scheduleId))

  return { success: true, message: '打卡完成 ✅' }
})
