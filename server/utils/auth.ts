/**
 * 登录验证中间件
 * 检查 session cookie，将用户信息注入 event.context
 * 需要登录的 API 路由自行调用 getAuthUser(event)
 */
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'
import type { SessionPayload } from '~~/server/utils/crypto'

export interface AuthUser {
  memberId: number
  dormId: number
  email: string
  name: string
  isAdmin: boolean
  iat: number
  exp: number
}

/**
 * 从当前请求中获取已登录用户信息
 * 如果未登录返回 null
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const token = getCookie(event, 'dorm_session')
  if (!token) return null

  const { unseal } = await import('~~/server/utils/crypto')
  const data = await unseal<SessionPayload>(token)

  if (!data?.memberId || Date.now() >= data.exp) return null

  const { db } = getDb()
  const { members, dormConfig } = await import('~~/server/models/schema')

  const memberList = await db.select()
    .from(members)
    .where(eq(members.id, data.memberId))
    .limit(1)

  const member = memberList[0]
  if (!member || member.dormId !== data.dormId) return null

  const configList = await db.select()
    .from(dormConfig)
    .where(eq(dormConfig.id, member.dormId))
    .limit(1)

  const isAdmin = configList[0]?.adminMemberId === member.id

  return {
    memberId: member.id,
    dormId: member.dormId,
    email: member.email,
    name: member.name,
    isAdmin,
    iat: data.iat,
    exp: data.exp,
  }
}

/**
 * 从当前请求中获取已登录用户信息
 * 如果未登录则抛出 401 错误
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }
  return user
}
