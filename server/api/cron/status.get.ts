import { cronService } from '~/server/services/cron'

/**
 * GET /api/cron/status
 * 获取定时任务状态
 */
export default defineEventHandler(async () => {
  return {
    running: cronService.isRunning,
    tasks: cronService.tasksInfo,
  }
})
