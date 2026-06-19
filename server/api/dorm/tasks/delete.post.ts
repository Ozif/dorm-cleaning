import { eq, and } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/dorm/tasks/delete
 * 删除打扫任务
 * 使用 POST 方法避免前端 `$fetch` 无法发送 DELETE body 的问题
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { taskId } = body

  if (!taskId) {
    throw createError({ statusCode: 400, message: '缺少任务 ID' })
  }

  const { db } = getDb()
  const { cleaningTasks } = await import('~/server/models/schema')

  await db.delete(cleaningTasks)
    .where(and(eq(cleaningTasks.id, taskId), eq(cleaningTasks.dormId, dormId)))

  return { success: true, message: '任务已删除' }
})
