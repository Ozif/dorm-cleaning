import { eq, and, gt, or } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'
import { schedulerService } from '~/server/services/scheduler'

/**
 * PUT /api/members
 * 更新成员权重并重新生成未来排班
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) throw createError({ statusCode: 403, message: '仅管理员可操作' })
  const dormId = user.dormId
  const body = await readBody(event)
  const { memberId, weight } = body

  if (!memberId || weight === undefined) {
    throw createError({ statusCode: 400, message: '请指定成员和权重' })
  }

  const w = parseFloat(weight)
  if (isNaN(w) || w < 0.5 || w > 3.0) {
    throw createError({ statusCode: 400, message: '权重范围 0.5~3.0' })
  }

  const { db } = getDb()
  const { members, schedules, dormConfig } = await import('~/server/models/schema')

  // 更新成员权重
  await db.update(members)
    .set({ weight: w.toString() })
    .where(and(eq(members.id, memberId), eq(members.dormId, dormId)))

  // 重新生成排班：删除未来排班后重新生成
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // 获取宿舍配置
  const [config] = await db.select()
    .from(dormConfig)
    .where(eq(dormConfig.id, dormId))
    .limit(1)

  if (config) {
    // 获取所有成员
    const memberList = await db.select()
      .from(members)
      .where(eq(members.dormId, dormId))

    if (memberList.length > 0) {
      // 清理该成员相关的换班请求
      const { swapLogs } = await import('~/server/models/schema')
      await db.delete(swapLogs).where(
        or(
          eq(swapLogs.fromMemberA, memberId),
          eq(swapLogs.toMemberB, memberId),
        ),
      )

      // 删除今天之后的排班（保留今天的已完成记录）
      await db.delete(schedules).where(
        and(
          eq(schedules.dormId, dormId),
          gt(schedules.scheduledDate, todayStr),
        ),
      )

      // 重新生成 30 天排班
      const assignments = schedulerService.generateSchedule(
        memberList,
        todayStr,
        30,
        config.frequencyCount,
        config.frequencyType,
      )

      if (assignments.length > 0) {
        const newSchedules = assignments.map(a => ({
          dormId,
          memberId: a.memberId,
          scheduledDate: a.scheduledDate,
          weekNumber: a.weekNumber,
          status: 'pending' as const,
        }))
        await db.insert(schedules).values(newSchedules)
      }
    }
  }

  return { success: true, message: '权重已更新，排班已重新生成' }
})
