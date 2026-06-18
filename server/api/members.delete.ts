import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * DELETE /api/members
 * 移除成员（通过 query 参数传递 memberId）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const memberId = Number(query.memberId)

  if (!memberId) {
    throw createError({ statusCode: 400, message: '请指定要移除的成员' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { members } = await import('~/server/models/schema')

  await db.delete(members).where(eq(members.id, memberId))

  await connection.end()
  return { success: true, message: '成员已移除' }
})
