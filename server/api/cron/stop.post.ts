import { cronService } from '~/server/services/cron'

/**
 * POST /api/cron/stop
 * 停止定时任务调度器
 */
export default defineEventHandler(async () => {
  if (!cronService.isRunning) {
    return { success: true, message: '定时任务未在运行' }
  }

  cronService.stopAll()
  return { success: true, message: '定时任务已停止' }
})
