import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { or, eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * GET /api/swap
 * 获取互换请求列表
 * Query: status=pending （可选过滤）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const statusFilter = query.status as string | undefined

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { swapLogs } = await import('~/server/models/schema')

  // 查询与当前用户相关的互换请求（作为发起方或接收方）
  let conditions = or(
    eq(swapLogs.fromMemberA, user.memberId),
    eq(swapLogs.toMemberB, user.memberId),
  )

  // 管理员可以查看所有
  // TODO: 检查管理员权限

  const swapList = await db.select()
    .from(swapLogs)
    .where(conditions)
    .orderBy(swapLogs.createdAt)

  await connection.end()

  return swapList.map(s => ({
    id: s.id,
    scheduleIdA: s.scheduleIdA,
    scheduleIdB: s.scheduleIdB,
    fromMemberA: s.fromMemberA,
    toMemberB: s.toMemberB,
    status: s.status,
    swappedAt: s.swappedAt,
    createdAt: s.createdAt,
    // 前端标识是否可审批
    canApprove: user.memberId === s.toMemberB && s.status === 'pending',
  }))
})
