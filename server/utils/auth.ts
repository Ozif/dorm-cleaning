/**
 * 登录验证中间件
 * 检查 session cookie，将用户信息注入 event.context
 * 需要登录的 API 路由自行调用 getAuthUser(event)
 */
import type { H3Event } from 'h3'

export interface AuthUser {
  memberId: number
  dormId: number
  email: string
  name: string
  isAdmin: boolean
  loginAt: number
}

/**
 * 从当前请求中获取已登录用户信息
 * 如果未登录返回 null
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const token = getCookie(event, 'dorm_session')
  if (!token) return null

  const { unseal } = await import('~/server/utils/crypto')
  const data = await unseal(token) as AuthUser | null

  if (!data || !data.memberId) return null
  return data
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
