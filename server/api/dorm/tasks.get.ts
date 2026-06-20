import { eq, desc } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/dorm/tasks
 * 获取指定宿舍的打扫任务列表（按 sortOrder 排序）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId

  const { db } = getDb()
  const { cleaningTasks } = await import('~~/server/models/schema')

  const tasks = await db
    .select()
    .from(cleaningTasks)
    .where(eq(cleaningTasks.dormId, dormId))
    .orderBy(cleaningTasks.sortOrder)

  return tasks
})
