import { eq } from 'drizzle-orm'
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

  const [sched] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1)

  if (!sched) {
    throw createError({ statusCode: 404, message: '排班记录不存在' })
  }

  if (sched.memberId !== user.memberId) {
    throw createError({ statusCode: 403, message: '只能打卡自己的排班' })
  }

  if (sched.status === 'done') {
    return { success: true, message: '已完成，无需重复打卡' }
  }

  await db.update(schedules)
    .set({ status: 'done', completedAt: new Date() })
    .where(eq(schedules.id, scheduleId))

  return { success: true, message: '打卡完成 ✅' }
})
