import { eq, and } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * DELETE /api/members
 * 移除成员（通过 query 参数传递 memberId）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const memberId = Number(query.memberId)

  if (!memberId) {
    throw createError({ statusCode: 400, message: '请指定要移除的成员' })
  }

  const { db } = getDb()
  const { members, schedules } = await import('~/server/models/schema')

  // 验证成员属于该宿舍
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1)
  if (!member || member.dormId !== user.dormId) {
    throw createError({ statusCode: 403, message: '无权删除该成员' })
  }

  // 删除该成员的未来排班
  await db.delete(schedules).where(
    and(
      eq(schedules.memberId, memberId),
      eq(schedules.dormId, user.dormId),
    ),
  )

  // 删除成员
  await db.delete(members).where(eq(members.id, memberId))

  return { success: true, message: '成员已移除' }
})
