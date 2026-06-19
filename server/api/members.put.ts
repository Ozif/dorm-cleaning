import { eq, and } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * PUT /api/members
 * 更新成员权重
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
  const { members } = await import('~/server/models/schema')

  await db.update(members)
    .set({ weight: w.toString() })
    .where(and(eq(members.id, memberId), eq(members.dormId, dormId)))

  return { success: true, message: '权重已更新' }
})
