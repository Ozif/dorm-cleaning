import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { dorm_name, applicant_name, applicant_email } = body

  if (!dorm_name || !applicant_name || !applicant_email) {
    throw createError({ statusCode: 400, message: '请填写所有字段' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_cleaning',
  })
  const db = drizzle(connection)

  const { registrationRequests } = await import('~/server/models/schema')
  const crypto = await import('node:crypto')

  const approveToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(registrationRequests).values({
    dormName: dorm_name,
    applicantName: applicant_name,
    applicantEmail: applicant_email,
    approveToken,
    status: 'pending',
    expiresAt,
  })

  const { emailService } = await import('~/server/utils/email')
  const approveUrl = `${process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'}/api/approve/${approveToken}`
  await emailService.sendNotification(
    process.env.SUPER_ADMIN_EMAIL || '',
    '新宿舍注册申请',
    `宿舍名称：${dorm_name}\n申请人：${applicant_name}\n邮箱：${applicant_email}\n\n审批链接：${approveUrl}`
  )

  await connection.end()
  return { success: true, message: '申请已提交，请等待邮件通知' }
})
