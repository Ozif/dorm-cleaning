import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: '无效的审批链接' })

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)

  const { registrationRequests, dormConfig, members } = await import('~/server/models/schema')

  // 查找审批记录
  const requests = await db.select().from(registrationRequests)
    .where(eq(registrationRequests.approveToken, token))
    .limit(1)

  if (requests.length === 0) {
    return `<html><body><h2>❌ 无效的审批链接</h2></body></html>`
  }

  const req = requests[0]
  if (req.status !== 'pending') {
    return `<html><body><h2>❌ 该申请已被${req.status === 'approved' ? '通过' : '拒绝'}</h2></body></html>`
  }
  if (new Date() > req.expiresAt!) {
    return `<html><body><h2>❌ 审批链接已过期（有效期7天）</h2></body></html>`
  }

  // 通过审批
  await db.update(registrationRequests)
    .set({ status: 'approved', approvedAt: new Date() })
    .where(eq(registrationRequests.id, req.id))

  // 创建宿舍
  const dormResult = await db.insert(dormConfig).values({
    dormName: req.dormName,
    frequencyType: 'weekly',
    frequencyCount: 3,
    isActive: true,
  })

  const dormId = Number(dormResult[0].insertId)

  // 创建首位成员（管理员），邮箱自动验证
  await db.insert(members).values({
    dormId,
    name: req.applicantName,
    email: req.applicantEmail,
    weight: '1.0',
    emailVerified: true,
  })

  await connection.end()

  const { emailService } = await import('~/server/utils/email')
  await emailService.sendNotification(
    req.applicantEmail,
    `「${req.dormName}」宿舍已开通`,
    `恭喜！${req.applicantName}，你的宿舍「${req.dormName}」已审批通过。\n\n请访问系统登录：${process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'}/login`
  )

  return `<html><body><h2>✅ 审批通过！欢迎邮件已发送至 ${req.applicantEmail}</h2></body></html>`
})
