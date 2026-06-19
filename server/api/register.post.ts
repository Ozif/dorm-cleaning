import { eq } from 'drizzle-orm'
import { getDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { dorm_name, applicant_name, applicant_email } = body

  if (!dorm_name || !applicant_name || !applicant_email) {
    throw createError({ statusCode: 400, message: '请填写所有字段' })
  }

  const { db } = getDb()

  const { dormConfig, registrationRequests } = await import('~/server/models/schema')

  // 检查宿舍名是否已存在
  const [existingDorm] = await db.select().from(dormConfig).where(eq(dormConfig.dormName, dorm_name)).limit(1)
  if (existingDorm) {
    throw createError({ statusCode: 409, message: '宿舍名已存在，请更换名称' })
  }

  const [pendingRequest] = await db.select().from(registrationRequests).where(
    eq(registrationRequests.dormName, dorm_name),
  ).limit(1)
  if (pendingRequest) {
    throw createError({ statusCode: 409, message: '宿舍名已存在，请更换名称' })
  }
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

  return { success: true, message: '申请已提交，请等待邮件通知' }
})
