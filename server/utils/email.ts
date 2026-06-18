/**
 * 邮件发送工具类
 * 封装 QQ邮箱 SMTP 发信逻辑
 * 支持：验证码、打扫提醒、互换通知、漏扫警告
 */
import nodemailer from 'nodemailer'

export class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private fromName: string
  private fromAddr: string

  constructor() {
    this.fromName = '宿舍管理系统'
    this.fromAddr = process.env.SMTP_USER || 'noreply@example.com'
  }

  /**
   * 获取或创建 transporter（懒初始化）
   */
  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.qq.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true, // 465 端口使用 SSL
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      })
    }
    return this.transporter
  }

  /**
   * 发送邮件基方法
   */
  private async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    try {
      const transporter = this.getTransporter()
      await transporter.sendMail({
        from: `"${this.fromName}" <${this.fromAddr}>`,
        to,
        subject,
        html,
      })
      return true
    } catch (err) {
      console.error('[EmailService] 发送邮件失败:', err)
      return false
    }
  }

  /**
   * 发送 6 位验证码邮件
   */
  async sendVerifyCode(to: string, code: string): Promise<boolean> {
    const html = `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1e40af; text-align: center;">宿舍管理系统</h2>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151;">您好：</p>
          <p style="font-size: 16px; color: #374151;">您的登录验证码为：</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e40af; background: #eff6ff; padding: 12px 24px; border-radius: 6px;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #6b7280;">验证码有效期为 10 分钟，请勿泄露给他人。</p>
          <p style="font-size: 14px; color: #6b7280;">如非本人操作，请忽略此邮件。</p>
        </div>
        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">宿舍管理系统 · 自动发送，请勿回复</p>
      </div>
    `
    return this.sendMail(to, '宿舍管理系统 - 登录验证码', html)
  }

  /**
   * 发送打扫提醒邮件
   * @param to 收件人邮箱
   * @param memberName 值班人姓名
   * @param date 值班日期 YYYY-MM-DD
   * @param swapLink 互换链接
   */
  async sendReminder(
    to: string,
    memberName: string,
    date: string,
    swapLink: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1e40af; text-align: center;">打扫提醒</h2>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151;">${memberName} 同学，你好：</p>
          <p style="font-size: 16px; color: #374151;">今天是您值班打扫宿舍的日子，请记得按时完成！</p>
          <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #1e40af;"><strong>值班日期：</strong>${date}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">如需换班，请点击下方链接：</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${swapLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 15px;">查看排班 &amp; 换班</a>
          </div>
        </div>
        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">宿舍管理系统 · 自动发送，请勿回复</p>
      </div>
    `
    return this.sendMail(to, `宿舍打扫提醒 - ${date}`, html)
  }

  /**
   * 发送互换通知邮件
   * @param to 收件人邮箱
   * @param fromName 发起方姓名
   * @param dateA 原日期
   * @param dateB 目标日期
   */
  async sendSwapNotification(
    to: string,
    fromName: string,
    dateA: string,
    dateB: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1e40af; text-align: center;">换班通知</h2>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151;">您好：</p>
          <p style="font-size: 16px; color: #374151;">
            <strong>${fromName}</strong> 向您发起了换班请求：
          </p>
          <div style="background: #fff7ed; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #9a3412;"><strong>换班详情：</strong></p>
            <p style="margin: 4px 0; color: #374151;">他将承担您在 <strong>${dateB}</strong> 的值班</p>
            <p style="margin: 4px 0; color: #374151;">请您承担他在 <strong>${dateA}</strong> 的值班</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">请登录系统确认或拒绝此换班请求。</p>
        </div>
        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">宿舍管理系统 · 自动发送，请勿回复</p>
      </div>
    `
    return this.sendMail(to, `宿舍换班通知 - ${fromName} 请求与您换班`, html)
  }

  /**
   * 发送漏扫警告邮件
   * @param to 收件人邮箱
   * @param memberName 漏扫成员姓名
   * @param date 漏扫日期
   */
  async sendMissedWarning(
    to: string,
    memberName: string,
    date: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #dc2626; text-align: center;">⚠️ 漏扫警告</h2>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151;">${memberName} 同学：</p>
          <p style="font-size: 16px; color: #374151;">您于 <strong>${date}</strong> 的值班任务尚未完成，已被系统记录为漏扫。</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #991b1b;"><strong>漏扫日期：</strong>${date}</p>
            <p style="margin: 4px 0; color: #991b1b;"><strong>状态：</strong>已记录</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">请注意按时完成值班任务，多次漏扫将影响宿舍评分。</p>
        </div>
        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">宿舍管理系统 · 自动发送，请勿回复</p>
      </div>
    `
    return this.sendMail(to, `宿舍漏扫警告 - ${date}`, html)
  }

  /**
   * 发送通用通知邮件
   * 用于管理员通知等场景
   */
  async sendNotification(
    to: string,
    subject: string,
    content: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1e40af; text-align: center;">宿舍管理系统</h2>
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; white-space: pre-wrap;">${content}</p>
        </div>
        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">宿舍管理系统 · 自动发送，请勿回复</p>
      </div>
    `
    return this.sendMail(to, subject, html)
  }
}

export const emailService = new EmailService()
