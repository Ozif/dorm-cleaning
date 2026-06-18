import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/members
 * 添加宿舍成员
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { name, email } = body

  if (!name || !email) {
    throw createError({ statusCode: 400, message: '请填写姓名和邮箱' })
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

  // 检查邮箱是否已存在
  const existing = await db.select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1)

  if (existing.length > 0) {
    await connection.end()
    throw createError({ statusCode: 409, message: '该邮箱已注册' })
  }

  const result = await db.insert(members).values({
    dormId,
    name,
    email,
    weight: '1.0',
    emailVerified: false,
  })

  await connection.end()
  return { success: true, message: '成员已添加', id: Number(result[0].insertId) }
})
