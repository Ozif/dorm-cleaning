import { requireAuth } from '~~/server/utils/auth'

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  return {
    memberId: user.memberId,
    dormId: user.dormId,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  }
})
