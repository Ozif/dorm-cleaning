import { cronService } from '~~/server/services/cron'
import { requireAuth } from '~~/server/utils/auth'

/**
 * POST /api/cron/start
 * 启动定时任务调度器
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isAdmin) throw createError({ statusCode: 403, message: '仅管理员可启停定时任务' })
  if (cronService.isRunning) {
    return { success: true, message: '定时任务已在运行' }
  }

  cronService.registerAll()
  return { success: true, message: '定时任务已启动' }
})
