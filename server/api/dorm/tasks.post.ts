import { eq } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/dorm/tasks
 * 添加打扫任务
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { taskName } = body

  if (!taskName) {
    throw createError({ statusCode: 400, message: '请输入任务名称' })
  }

  const { db } = getDb()
  const { cleaningTasks } = await import('~/server/models/schema')

  await db.transaction(async (tx) => {
    const tasks = await tx.select()
      .from(cleaningTasks)
      .where(eq(cleaningTasks.dormId, dormId))
      .orderBy(cleaningTasks.sortOrder)

    const maxSort = tasks.length > 0 ? tasks[tasks.length - 1].sortOrder : 0

    await tx.insert(cleaningTasks).values({
      dormId,
      taskName,
      sortOrder: maxSort + 1,
    })
  })

  return { success: true, message: '任务已添加' }
})
