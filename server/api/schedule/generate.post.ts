import { eq, and, inArray } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { schedulerService } from '~~/server/services/scheduler'
import { parseDateOnly, formatDateOnly } from '~~/server/utils/date'

/**
 * POST /api/schedule/generate
 * 生成指定时间段的排班计划
 * Body: { startDate: string, days: number }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { startDate, days } = body

  if (!startDate || !days) {
    throw createError({ statusCode: 400, message: '请指定开始日期和天数' })
  }

  const { db } = getDb()
  const { members, schedules, dormConfig } = await import('~~/server/models/schema')

  // 获取宿舍配置
  const configList = await db.select()
    .from(dormConfig)
    .where(eq(dormConfig.id, dormId))
    .limit(1)

  if (configList.length === 0) {
    throw createError({ statusCode: 404, message: '宿舍未配置' })
  }

  // 获取成员列表
  const memberList = await db.select()
    .from(members)
    .where(eq(members.dormId, dormId))

  if (memberList.length === 0) {
    throw createError({ statusCode: 400, message: '宿舍暂无成员，请先添加成员' })
  }

  const config = configList[0]
  if (!config) {
    throw createError({ statusCode: 404, message: '宿舍未配置' })
  }

  // 用排班算法生成
  const assignments = schedulerService.generateSchedule(memberList, startDate, days, config.frequencyCount, config.frequencyType)

  if (assignments.length === 0) {
    throw createError({ statusCode: 500, message: '排班生成失败' })
  }

  // 批量写入数据库
  const dates = assignments.map(a => parseDateOnly(a.scheduledDate))
  const existingSchedules = await db.select({ scheduledDate: schedules.scheduledDate })
    .from(schedules)
    .where(and(eq(schedules.dormId, dormId), inArray(schedules.scheduledDate, dates)))

  const existingDates = new Set(existingSchedules.map(s => formatDateOnly(s.scheduledDate)))
  const newAssignments = assignments
    .filter(a => !existingDates.has(a.scheduledDate))
    .map(a => ({
      dormId,
      memberId: a.memberId,
      scheduledDate: parseDateOnly(a.scheduledDate),
      weekNumber: a.weekNumber,
      status: 'pending' as const,
    }))

  if (newAssignments.length > 0) {
    await db.insert(schedules).values(newAssignments)
  }

  return {
    success: true,
    message: `已生成 ${assignments.length} 天排班`,
    count: assignments.length,
  }
})
