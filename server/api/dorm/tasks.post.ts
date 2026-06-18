import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * POST /api/dorm/tasks
 * 添加打扫任务
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { taskName } = body

  if (!taskName) {
    throw createError({ statusCode: 400, message: '请输入任务名称' })
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

  // 获取当前最大排序值
  const tasks = await db.select()
    .from(cleaningTasks)
    .where(eq(cleaningTasks.dormId, dormId))
    .orderBy(cleaningTasks.sortOrder)

  const maxSort = tasks.length > 0 ? tasks[tasks.length - 1].sortOrder : 0

  await db.insert(cleaningTasks).values({
    dormId,
    taskName,
    sortOrder: maxSort + 1,
  })

  await connection.end()
  return { success: true, message: '任务已添加' }
})
