import { eq, sql } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/dorm/tasks
 * 添加打扫任务
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) throw createError({ statusCode: 403, message: '仅管理员可操作' })
  const dormId = user.dormId
  const body = await readBody(event)
  const { taskName } = body

  if (!taskName) {
    throw createError({ statusCode: 400, message: '请输入任务名称' })
  }

  const { db } = getDb()
  const { cleaningTasks } = await import('~/server/models/schema')

  const [result] = await db.select({ maxSort: sql<number>`MAX(${cleaningTasks.sortOrder})` })
    .from(cleaningTasks)
    .where(eq(cleaningTasks.dormId, dormId))
  const maxSort = result.maxSort || 0

  await db.insert(cleaningTasks).values({
    dormId,
    taskName,
    sortOrder: maxSort + 1,
  })

  return { success: true, message: '任务已添加' }
})
