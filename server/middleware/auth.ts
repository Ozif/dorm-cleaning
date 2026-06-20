/**
 * 认证中间件 - 基础路由守卫
 * 读取 session cookie 并设置 event.context.user
 * 未登录时不阻断，仅设为空对象
 */
import { getAuthUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  event.context.user = user || {}
})
