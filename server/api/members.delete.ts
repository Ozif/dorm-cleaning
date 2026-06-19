import { eq, and, or } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * DELETE /api/members
 * 移除成员（通过 query 参数传递 memberId）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) throw createError({ statusCode: 403, message: '仅管理员可操作' })
  const query = getQuery(event)
  const memberId = Number(query.memberId)

  if (!memberId) {
    throw createError({ statusCode: 400, message: '请指定要移除的成员' })
  }

  const { db } = getDb()
  const { members, schedules, missedLogs, swapLogs, emailLogs } = await import('~/server/models/schema')

  // 验证成员属于该宿舍
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1)
  if (!member || member.dormId !== user.dormId) {
    throw createError({ statusCode: 403, message: '无权删除该成员' })
  }

  await db.transaction(async (tx) => {
    // 删除关联的排班
    await tx.delete(schedules).where(
      and(
        eq(schedules.memberId, memberId),
        eq(schedules.dormId, user.dormId),
      ),
    )

    // 删除关联的漏打卡记录
    await tx.delete(missedLogs).where(eq(missedLogs.memberId, memberId))

    // 删除关联的换班请求
    await tx.delete(swapLogs).where(
      or(
        eq(swapLogs.fromMemberA, memberId),
        eq(swapLogs.toMemberB, memberId),
      ),
    )

    // 删除关联的邮件记录
    await tx.delete(emailLogs).where(eq(emailLogs.memberId, memberId))

    // 删除成员
    await tx.delete(members).where(eq(members.id, memberId))
  })

  return { success: true, message: '成员已移除' }
})
