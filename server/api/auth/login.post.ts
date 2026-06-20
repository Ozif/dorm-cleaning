import { eq, and, gte, sql } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'

/**
 * POST /api/auth/login
 * 验证码登录
 * 验证通过后设置 session cookie
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, code } = body

  if (!email || !code) {
    throw createError({ statusCode: 400, message: '请填写邮箱和验证码' })
  }

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, message: '验证码格式错误' })
  }

  const { db } = getDb()
  const { members, dormConfig, emailLogs } = await import('~~/server/models/schema')

  // 查找成员
  const memberList = await db.select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1)

  const member = memberList[0]
  if (!member) {
    throw createError({ statusCode: 404, message: '该邮箱未注册' })
  }

  const recentFailures = await db.select({ count: sql<number>`count(*)` })
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.email, email),
        eq(emailLogs.emailType, 'login_failed'),
        gte(emailLogs.sentAt, new Date(Date.now() - 10 * 60 * 1000)),
      ),
    )

  if (Number(recentFailures[0]?.count || 0) >= 5) {
    throw createError({ statusCode: 429, message: '登录失败次数过多，请 10 分钟后再试' })
  }

  // 查询宿舍配置，判断是否为管理员
  const configList = await db.select()
    .from(dormConfig)
    .where(eq(dormConfig.id, member.dormId))
    .limit(1)

  const isAdmin = configList[0]?.adminMemberId === member.id

  // 验证验证码
  if (member.loginCode !== code) {
    await db.insert(emailLogs).values({
      dormId: member.dormId,
      memberId: member.id,
      email,
      emailType: 'login_failed',
      subject: '登录验证码校验失败',
      sentAt: new Date(),
      status: 'failed',
    })
    throw createError({ statusCode: 401, message: '验证码错误' })
  }

  if (!member.loginCodeExpires || new Date() > member.loginCodeExpires) {
    throw createError({ statusCode: 401, message: '验证码已过期' })
  }

  // 清除验证码（一次性使用）
  await db.update(members)
    .set({
      loginCode: null,
      loginCodeExpires: null,
    })
    .where(eq(members.id, member.id))

  // 设置 session（使用 Nuxt 内置的 seal/data 机制，或简单存 cookie）
  const now = Date.now()
  const sessionData = {
    memberId: member.id,
    dormId: member.dormId,
    email: member.email,
    name: member.name,
    iat: now,
    exp: now + 7 * 24 * 60 * 60 * 1000,
  }

  const sessionToken = await sealSession(sessionData)

  setCookie(event, 'dorm_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7天
    path: '/',
  })

  return {
    success: true,
    session: {
      ...sessionData,
      isAdmin,
    },
  }
})

/**
 * 使用简单加密方式保护 session 数据
 * 生产环境建议使用 nuxt-auth-utils 或 iron-session
 */
async function sealSession(data: {
  memberId: number
  dormId: number
  email: string
  name: string
  iat: number
  exp: number
}): Promise<string> {
  const { seal } = await import('~~/server/utils/crypto')
  return seal(data)
}
