import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/dorm/tasks/delete
 * 删除打扫任务
 * 使用 POST 方法避免前端 `$fetch` 无法发送 DELETE body 的问题
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { taskId } = body

  if (!taskId) {
    throw createError({ statusCode: 400, message: '缺少任务 ID' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { cleaningTasks } = await import('~/server/models/schema')

  await db.delete(cleaningTasks)
    .where(eq(cleaningTasks.id, taskId))

  await connection.end()
  return { success: true, message: '任务已删除' }
})
