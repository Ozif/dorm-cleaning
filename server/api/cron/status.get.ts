import { cronService } from '~~/server/services/cron'
import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/cron/status
 * 获取定时任务状态
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, message: '仅管理员可查看定时任务状态' })
  }

  return {
    running: cronService.isRunning,
    tasks: cronService.tasksInfo,
  }
})
