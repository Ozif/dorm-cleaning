import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/members
 * 获取宿舍成员列表
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId

  const { db } = getDb()
  const { members } = await import('~~/server/models/schema')

  const memberList = await db.select()
    .from(members)
    .where(eq(members.dormId, dormId))

  return memberList.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    weight: parseFloat(m.weight || '1.0'),
    emailVerified: m.emailVerified,
  }))
})
