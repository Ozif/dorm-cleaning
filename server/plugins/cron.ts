/**
 * Nitro 启动插件
 * 在服务器启动时自动初始化定时任务
 */
import { cronService } from '~~/server/services/cron'

export default defineNitroPlugin(() => {
  if (process.env.CRON_AUTO_START === 'true') {
    cronService.registerAll()
    console.log('[Nitro Plugin] Cron service auto-started')
  } else {
    console.log('[Nitro Plugin] Cron service waiting for manual start')
  }
})
