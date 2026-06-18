import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/cron/trigger
 * 手动触发指定定时任务
 * Body: { taskId: string }
 * taskId: reminder-first | followup-1 | followup-2 | followup-3 | mark-missed
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, message: '仅管理员可操作' })
  }

  const body = await readBody(event)
  const { taskId } = body || {}

  if (!taskId) {
    throw createError({ statusCode: 400, message: '请提供 taskId' })
  }

  const { cronService } = await import('~/server/services/cron')
  const result = await cronService.triggerTask(taskId)

  return { success: true, taskId, result }
})
