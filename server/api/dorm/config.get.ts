import { eq } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'

/**
 * GET /api/dorm/config
 * 获取宿舍当前配置（频率 + 任务列表）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const dormId = user.dormId

  const { db } = getDb()
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

  return {
    config: configList[0] || null,
    tasks,
  }
})


