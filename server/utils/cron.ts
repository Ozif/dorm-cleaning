import cron from 'node-cron'

/**
 * 定时任务调度器
 * 负责打扫提醒和催办邮件发送
 * 将在第四阶段实现完整功能
 */
export class CronService {
  private tasks: cron.ScheduledTask[] = []

  /**
   * 注册所有定时任务
   * - 20:00 → 首次提醒
   * - 21:00 → 第1次催办
   * - 22:00 → 第2次催办
   * - 23:00 → 第3次催办
   * - 00:00 → 标记未完成
   */
  registerAll(): void {
    // TODO: 第四阶段实现
  }

  /**
   * 清理所有定时任务
   */
  stopAll(): void {
    this.tasks.forEach(task => task.stop())
    this.tasks = []
  }
}

export const cronService = new CronService()
