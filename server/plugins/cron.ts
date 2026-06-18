/**
 * Nitro 启动插件
 * 在服务器启动时自动初始化定时任务
 */
import { cronService } from '~/server/services/cron'

export default defineNitroPlugin(() => {
  // 服务器启动后自动注册定时任务
  cronService.registerAll()
  console.log('[Nitro Plugin] Cron service auto-started')
})
