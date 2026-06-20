import { and, eq } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'
import { schedulerService } from '~~/server/services/scheduler'

/**
 * POST /api/swap
 * 发起互换请求（双向互换模型）
 * Body: { scheduleIdA, scheduleIdB, fromMemberA, toMemberB }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { scheduleIdA, scheduleIdB, fromMemberA, toMemberB } = body

  if (!scheduleIdA || !scheduleIdB || !fromMemberA || !toMemberB) {
    throw createError({ statusCode: 400, message: '请提供完整的互换信息' })
  }

  const { db } = getDb()
  const { schedules, swapLogs } = await import('~~/server/models/schema')

  // 获取两个排班记录（同时校验宿舍隔离）
  const [schedA] = await db.select().from(schedules).where(and(eq(schedules.id, scheduleIdA), eq(schedules.dormId, dormId))).limit(1)
  const [schedB] = await db.select().from(schedules).where(and(eq(schedules.id, scheduleIdB), eq(schedules.dormId, dormId))).limit(1)

  if (!schedA || !schedB) {
    throw createError({ statusCode: 404, message: '排班记录不存在' })
  }

  // 验证双方都是 pending 状态
  if (schedA.status !== 'pending' || schedB.status !== 'pending') {
    throw createError({ statusCode: 400, message: '只能互换待完成状态的排班' })
  }

  // 验证排班记录与请求成员匹配
  if (schedA.memberId !== fromMemberA) {
    throw createError({ statusCode: 400, message: '排班记录与请求成员不匹配' })
  }

  // 验证接收方的排班记录与指定的接收人成员匹配 (Problem H)
  if (schedB.memberId !== toMemberB) {
    throw createError({ statusCode: 400, message: '接收方的排班记录与指定的接收人成员不匹配' })
  }

  // 验证请求方确实是被互换的成员之一
  if (fromMemberA !== user.memberId && toMemberB !== user.memberId) {
    throw createError({ statusCode: 403, message: '只能发起与自己相关的互换' })
  }

  // 检查合法性（不连续值班）
  const allSchedules = await db.select().from(schedules).where(eq(schedules.dormId, dormId))
  const validation = schedulerService.validateSwap(schedA, schedB, allSchedules)

  if (!validation.valid) {
    throw createError({ statusCode: 400, message: validation.reason || '互换无效' })
  }

  // 检查是否已有待审批的互换请求（相同排班对）+ 写入互换日志（原子操作）
  await db.transaction(async (tx) => {
    const [existingPending] = await tx.select().from(swapLogs).where(
      and(eq(swapLogs.scheduleIdA, scheduleIdA), eq(swapLogs.scheduleIdB, scheduleIdB), eq(swapLogs.status, 'pending'))
    ).limit(1)

    if (existingPending) {
      throw createError({ statusCode: 400, message: '已有待审批的互换请求' })
    }

    await tx.insert(swapLogs).values({
      scheduleIdA,
      scheduleIdB,
      fromMemberA,
      toMemberB,
      status: 'pending',
    })
  })

  return { success: true, message: '互换请求已发起，等待对方确认' }
})
