import { cronService } from '~/server/services/cron'

/**
 * POST /api/cron/start
 * 启动定时任务调度器
 */
export default defineEventHandler(async () => {
  if (cronService.isRunning) {
    return { success: true, message: '定时任务已在运行' }
  }

  cronService.registerAll()
  return { success: true, message: '定时任务已启动' }
})
