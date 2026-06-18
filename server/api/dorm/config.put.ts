import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/auth'

/**
 * PUT /api/dorm/config
 * 更新宿舍配置（频率类型、打扫次数）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId
  const body = await readBody(event)
  const { frequencyType, frequencyCount } = body

  if (!frequencyType || !frequencyCount) {
    throw createError({ statusCode: 400, message: '请填写完整配置信息' })
  }

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
    .set({ frequencyType, frequencyCount, updatedAt: new Date() })
    .where(eq(dormConfig.id, dormId))

  await connection.end()
  return { success: true, message: '配置已更新' }
})
