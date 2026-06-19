import { eq } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'
import { requireAuth } from '~/server/utils/auth'
import { emailService } from '~/server/utils/email'

/**
 * PUT /api/swap
 * 审批互换请求（通过/拒绝）
 * Body: { swapId, action: 'approve' | 'reject' }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { swapId, action } = body

  if (!swapId || !action) {
    throw createError({ statusCode: 400, message: '请提供互换 ID 和操作类型' })
  }

  if (!['approve', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, message: '操作类型为 approve 或 reject' })
  }

  const { db } = getDb()
  const { swapLogs, schedules } = await import('~/server/models/schema')

  // 获取互换请求
  const [swapLog] = await db.select().from(swapLogs).where(eq(swapLogs.id, swapId)).limit(1)

  if (!swapLog) {
    throw createError({ statusCode: 404, message: '互换请求不存在' })
  }

  if (swapLog.status !== 'pending') {
    throw createError({ statusCode: 400, message: '该互换请求已处理' })
  }

  // 验证操作人是被请求方
  if (user.memberId !== swapLog.toMemberB) {
    throw createError({ statusCode: 403, message: '只有被请求方才能审批' })
  }

  if (action === 'reject') {
    // 拒绝：直接更新状态
    await db.update(swapLogs)
      .set({ status: 'rejected' })
      .where(eq(swapLogs.id, swapId))

    return { success: true, message: '已拒绝互换请求' }
  }

  // 批准：原子化执行所有读写操作
  await db.transaction(async (tx) => {
    const [schedA] = await tx.select().from(schedules).where(eq(schedules.id, swapLog.scheduleIdA)).limit(1)
    const [schedB] = await tx.select().from(schedules).where(eq(schedules.id, swapLog.scheduleIdB)).limit(1)

    if (!schedA || !schedB) {
      throw createError({ statusCode: 404, message: '排班记录不存在' })
    }

    // 验证排班属于同一个宿舍
    if (schedA.dormId !== user.dormId || schedB.dormId !== user.dormId) {
      throw createError({ statusCode: 403, message: '排班不属于您的宿舍' })
    }
    // 交换 member_id
    await tx.update(schedules)
      .set({
        memberId: schedB.memberId,
        status: 'pending',
        swappedWith: schedB.id,
      })
      .where(eq(schedules.id, schedA.id))

    await tx.update(schedules)
      .set({
        memberId: schedA.memberId,
        status: 'pending',
        swappedWith: schedA.id,
      })
      .where(eq(schedules.id, schedB.id))

    // 更新互换日志
    await tx.update(swapLogs)
      .set({
        status: 'approved',
        swappedAt: new Date(),
      })
      .where(eq(swapLogs.id, swapId))

    // 发送互换通知给双方
    const { members } = await import('~/server/models/schema')
    const [memberA] = await tx.select().from(members).where(eq(members.id, swapLog.fromMemberA)).limit(1)
    const [memberB] = await tx.select().from(members).where(eq(members.id, swapLog.toMemberB)).limit(1)

    if (memberA && memberB) {
      const dateA = schedA.scheduledDate
      const dateB = schedB.scheduledDate
      await emailService.sendNotification(memberA.email, '换班已批准', `您好，您与 ${memberB.name} 的换班请求已批准！\n您将承担 ${dateB} 的值班，${memberB.name} 将承担 ${dateA} 的值班。`)
      await emailService.sendNotification(memberB.email, '换班已批准', `您好，${memberA.name} 与您的换班请求已批准！\n您将承担 ${dateA} 的值班，${memberA.name} 将承担 ${dateB} 的值班。`)
    }
  })

  return { success: true, message: '互换已批准 🎉' }
})
