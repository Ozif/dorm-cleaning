/**
 * 邮件发送工具类
 * 封装 QQ邮箱 SMTP 发信逻辑
 * 将在第四阶段实现完整功能
 */
export class EmailService {
  /**
   * 发送验证码邮件
   */
  async sendVerifyCode(to: string, code: string): Promise<boolean> {
    // TODO: 第四阶段实现
    return false
  }

  /**
   * 发送通知/催办邮件
   */
  async sendNotification(to: string, subject: string, content: string): Promise<boolean> {
    // TODO: 第四阶段实现
    return false
  }
}

export const emailService = new EmailService()
