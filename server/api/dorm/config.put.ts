import { eq } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
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

  const { db } = getDb()
  const { dormConfig } = await import('~/server/models/schema')

  await db.update(dormConfig)
    .set({ frequencyType, frequencyCount, updatedAt: new Date() })
    .where(eq(dormConfig.id, dormId))

  return { success: true, message: '配置已更新' }
})
