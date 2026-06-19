import { cronService } from '~/server/services/cron'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/cron/stop
 * 停止定时任务调度器
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!cronService.isRunning) {
    return { success: true, message: '定时任务未在运行' }
  }

  cronService.stopAll()
  return { success: true, message: '定时任务已停止' }
})
