import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * GET /api/members
 * 获取宿舍成员列表
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { members } = await import('~/server/models/schema')

  const memberList = await db.select()
    .from(members)
    .where(eq(members.dormId, dormId))

  await connection.end()

  return memberList.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    weight: parseFloat(m.weight || '1.0'),
    emailVerified: m.emailVerified,
  }))
})
