import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * POST /api/members
 * 添加宿舍成员
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) throw createError({ statusCode: 403, message: '仅管理员可操作' })
  const dormId = user.dormId
  const body = await readBody(event)
  const { name, email } = body

  if (!name || !email) {
    throw createError({ statusCode: 400, message: '请填写姓名和邮箱' })
  }

  const { db } = getDb()
  const { members } = await import('~~/server/models/schema')

  // 检查邮箱是否已存在
  const existing = await db.select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1)

  if (existing.length > 0) {
    throw createError({ statusCode: 409, message: '该邮箱已注册' })
  }

  const result = await db.insert(members).values({
    dormId,
    name,
    email,
    weight: '1.0',
    emailVerified: false,
  })

  return { success: true, message: '成员已添加', id: Number(result[0].insertId) }
})
