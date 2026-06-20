import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/utils/db'

function renderPage(params: {
  title: string
  message: string
  token?: string
  confirm?: boolean
}) {
  const action = params.confirm && params.token
    ? `
      <form method="post" style="margin-top: 20px;">
        <input type="hidden" name="confirm" value="1">
        <button type="submit" style="padding: 10px 16px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
          确认审批并开通宿舍
        </button>
      </form>
    `
    : ''

  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 32px; background: #f5f5f5;">
        <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
          <h2 style="margin-top: 0;">${params.title}</h2>
          <p style="white-space: pre-wrap; line-height: 1.6;">${params.message}</p>
          ${action}
        </div>
      </body>
    </html>
  `
}

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: '无效的审批链接' })

  const { db } = getDb()

  const { registrationRequests, dormConfig, members } = await import('~~/server/models/schema')

  // 查找审批记录
  const requests = await db.select().from(registrationRequests)
    .where(eq(registrationRequests.approveToken, token))
    .limit(1)

  const request = requests[0]
  if (!request) {
    return renderPage({ title: '审批失败', message: '无效的审批链接' })
  }

  // 幂等性：已经通过则返回成功
  if (request.status === 'approved') {
    return renderPage({ title: '已审批', message: '该申请已通过，无需重复审批。' })
  }
  if (request.status !== 'pending') {
    return renderPage({ title: '审批失败', message: '该申请已被拒绝。' })
  }

  // 24 小时过期检查
  const createdAt = new Date(request.createdAt).getTime()
  if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
    throw createError({ statusCode: 400, message: '审批链接已超过24小时有效期，请重新申请' })
  }

  if (new Date() > request.expiresAt) {
    return renderPage({ title: '审批失败', message: '审批链接已过期（有效期 7 天）。' })
  }

  if (getMethod(event) === 'GET') {
    return renderPage({
      title: '确认审批',
      message: `确认开通宿舍「${request.dormName}」？\n申请人：${request.applicantName}\n邮箱：${request.applicantEmail}`,
      token,
      confirm: true,
    })
  }

  const body = await readBody<{ confirm?: string }>(event)
  if (body?.confirm !== '1') {
    throw createError({ statusCode: 400, message: '缺少审批确认信息' })
  }

  let dormId = 0
  let memberId = 0

  await db.transaction(async (tx) => {
    // 通过审批
    await tx.update(registrationRequests)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(registrationRequests.id, request.id))

    // 创建宿舍配置
    const dormResult = await tx.insert(dormConfig).values({
      dormName: request.dormName,
      frequencyType: 'weekly',
      frequencyCount: 3,
      isActive: true,
    })

    dormId = Number(dormResult[0].insertId)

    // 创建首位成员记录（管理员），邮箱自动验证
    const memberResult = await tx.insert(members).values({
      dormId,
      name: request.applicantName,
      email: request.applicantEmail,
      weight: '1.0',
      emailVerified: true,
    })

    memberId = Number(memberResult[0].insertId)

    // 更新宿舍配置的管理员成员 ID
    await tx.update(dormConfig)
      .set({ adminMemberId: memberId })
      .where(eq(dormConfig.id, dormId))
  })

  const { emailService } = await import('~~/server/utils/email')
  await emailService.sendNotification(
    request.applicantEmail,
    `「${request.dormName}」宿舍已开通`,
    `恭喜！${request.applicantName}，你的宿舍「${request.dormName}」已审批通过。\n\n请访问系统登录：${process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'}/login`
  )

  return renderPage({
    title: '审批完成',
    message: `审批通过，欢迎邮件已发送至 ${request.applicantEmail}。`,
  })
})
