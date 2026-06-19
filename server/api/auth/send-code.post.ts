import { eq, and, gte, sql } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'

/**
 * POST /api/auth/send-code
 * 发送登录验证码到管理员邮箱
 * 频率限制：同一邮箱60秒内仅限1次，每小时最多5次
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  if (!email) {
    throw createError({ statusCode: 400, message: '请填写邮箱' })
  }

  const { db } = getDb()
  const { members, emailLogs } = await import('~/server/models/schema')

  // 查找该邮箱对应的宿舍管理员
  const memberList = await db.select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1)

  if (memberList.length === 0) {
    throw createError({ statusCode: 404, message: '该邮箱未注册为宿舍管理员' })
  }

  const member = memberList[0]

  // 频率限制检查：60秒内
  const recentLogs = await db.select()
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.email, email),
        eq(emailLogs.emailType, 'login'),
        gte(emailLogs.sentAt, new Date(Date.now() - 60 * 1000))
      )
    )
    .limit(1)

  if (recentLogs.length > 0) {
    throw createError({ statusCode: 429, message: '请60秒后再获取验证码' })
  }

  // 频率限制检查：每小时5次
  const hourlyLogs = await db.select({ count: sql<number>`count(*)` })
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.email, email),
        eq(emailLogs.emailType, 'login'),
        gte(emailLogs.sentAt, new Date(Date.now() - 60 * 60 * 1000))
      )
    )

  if (Number(hourlyLogs[0]?.count || 0) >= 5) {
    throw createError({ statusCode: 429, message: '发送太频繁，请1小时后再试' })
  }

  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分钟过期

  // 更新成员表的登录验证码
  await db.update(members)
    .set({
      loginCode: code,
      loginCodeExpires: expiresAt,
    })
    .where(eq(members.id, member.id))

  // 先发送验证码邮件
  const { emailService } = await import('~/server/utils/email')
  await emailService.sendVerifyCode(email, code)

  // 发送成功后记录日志
  await db.insert(emailLogs).values({
    dormId: member.dormId!,
    memberId: member.id,
    email: email,
    emailType: 'login',
    subject: '宿舍管理系统 - 登录验证码',
    sentAt: new Date(),
    status: 'success',
  })

  return { success: true, message: '验证码已发送' }
})
