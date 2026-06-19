import { or, eq, and } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * GET /api/swap
 * 获取互换请求列表
 * Query: status=pending （可选过滤）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const statusFilter = query.status as string | undefined

  const { db } = getDb()
  const { swapLogs } = await import('~/server/models/schema')

  // 查询与当前用户相关的互换请求（作为发起方或接收方）
  let conditions = or(
    eq(swapLogs.fromMemberA, user.memberId),
    eq(swapLogs.toMemberB, user.memberId),
  )
  if (statusFilter) conditions = and(conditions, eq(swapLogs.status, statusFilter))

  // 管理员可以查看宿舍所有互换请求
  const { schedules } = await import('~/server/models/schema')
  if (user.isAdmin) {
    let adminConditions = eq(schedules.dormId, user.dormId)
    if (statusFilter) adminConditions = and(adminConditions, eq(swapLogs.status, statusFilter))

    const swapList = await db.select()
      .from(swapLogs)
      .innerJoin(schedules, eq(swapLogs.scheduleIdA, schedules.id))
      .where(adminConditions)
      .orderBy(swapLogs.createdAt)

    return swapList.map(s => ({
      id: s.swap_logs.id,
      scheduleIdA: s.swap_logs.scheduleIdA,
      scheduleIdB: s.swap_logs.scheduleIdB,
      fromMemberA: s.swap_logs.fromMemberA,
      toMemberB: s.swap_logs.toMemberB,
      status: s.swap_logs.status,
      swappedAt: s.swap_logs.swappedAt,
      createdAt: s.swap_logs.createdAt,
      canApprove: user.memberId === s.swap_logs.toMemberB && s.swap_logs.status === 'pending',
    }))
  }

  const swapList = await db.select()
    .from(swapLogs)
    .where(conditions)
    .orderBy(swapLogs.createdAt)

  return swapList.map(s => ({
    id: s.id,
    scheduleIdA: s.scheduleIdA,
    scheduleIdB: s.scheduleIdB,
    fromMemberA: s.fromMemberA,
    toMemberB: s.toMemberB,
    status: s.status,
    swappedAt: s.swappedAt,
    createdAt: s.createdAt,
    // 前端标识是否可审批
    canApprove: user.memberId === s.toMemberB && s.status === 'pending',
  }))
})
