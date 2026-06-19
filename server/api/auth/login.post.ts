import { eq } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'

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
  const { members } = await import('~/server/models/schema')

  // 查找管理员
  const memberList = await db.select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1)

  if (memberList.length === 0) {
    throw createError({ statusCode: 404, message: '该邮箱未注册' })
  }

  const member = memberList[0]

  // 验证验证码
  if (member.loginCode !== code) {
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
  const sessionData = {
    memberId: member.id,
    dormId: member.dormId,
    email: member.email,
    name: member.name,
    isAdmin: true,
    loginAt: Date.now(),
  }

  // 使用 Nuxt 的 setCookie + seal 确保安全
  const config = useRuntimeConfig()
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
    session: sessionData,
  }
})

/**
 * 使用简单加密方式保护 session 数据
 * 生产环境建议使用 nuxt-auth-utils 或 iron-session
 */
async function sealSession(data: Record<string, any>): Promise<string> {
  const { seal } = await import('~~/server/utils/crypto')
  return seal(data)
}
