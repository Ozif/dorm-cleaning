import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * GET /api/dorm/config
 * 获取宿舍当前配置（频率 + 任务列表）
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
  const { dormConfig, cleaningTasks } = await import('~/server/models/schema')

  // 查询宿舍配置
  const configList = await db.select()
    .from(dormConfig)
    .where(eq(dormConfig.id, dormId))
    .limit(1)

  // 查询任务列表
  const tasks = await db.select()
    .from(cleaningTasks)
    .where(eq(cleaningTasks.dormId, dormId))
    .orderBy(cleaningTasks.sortOrder)

  await connection.end()

  return {
    config: configList[0] || null,
    tasks,
  }
})

/**
 * PUT /api/dorm/config
 * 更新宿舍配置
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { frequencyType, frequencyCount } = body

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)
  const { dormConfig } = await import('~/server/models/schema')

  await db.update(dormConfig)
    .set({
      frequencyType,
      frequencyCount,
      updatedAt: new Date(),
    })
    .where(eq(dormConfig.id, dormId))

  await connection.end()
  return { success: true, message: '配置已更新' }
})
