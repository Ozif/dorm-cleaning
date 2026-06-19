import { cronService } from '~/server/services/cron'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/cron/start
 * 启动定时任务调度器
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (cronService.isRunning) {
    return { success: true, message: '定时任务已在运行' }
  }

  cronService.registerAll()
  return { success: true, message: '定时任务已启动' }
})
