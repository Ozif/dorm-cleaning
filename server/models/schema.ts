import {
  mysqlTable,
  int,
  varchar,
  boolean,
  decimal,
  date,
  timestamp,
  mysqlEnum,
} from 'drizzle-orm/mysql-core'

export const dormConfig = mysqlTable('dorm_config', {
  id: int('id').autoincrement().primaryKey(),
  dormName: varchar('dorm_name', { length: 255 }).notNull(),
  frequencyType: mysqlEnum('frequency_type', ['weekly', 'monthly']).notNull(),
  frequencyCount: int('frequency_count').notNull(),
  adminMemberId: int('admin_member_id'),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const cleaningTasks = mysqlTable('cleaning_tasks', {
  id: int('id').autoincrement().primaryKey(),
  dormId: int('dorm_id').notNull(),
  taskName: varchar('task_name', { length: 255 }).notNull(),
  sortOrder: int('sort_order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const members = mysqlTable('members', {
  id: int('id').autoincrement().primaryKey(),
  dormId: int('dorm_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  weight: decimal('weight', { precision: 3, scale: 1 }).default('1.0').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  verifyCode: varchar('verify_code', { length: 6 }),
  verifyCodeExpires: timestamp('verify_code_expires'),
  loginCode: varchar('login_code', { length: 6 }),
  loginCodeExpires: timestamp('login_code_expires'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const schedules = mysqlTable('schedules', {
  id: int('id').autoincrement().primaryKey(),
  dormId: int('dorm_id').notNull(),
  memberId: int('member_id').notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  weekNumber: int('week_number').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  completedAt: timestamp('completed_at'),
  swappedWith: int('swapped_with'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const swapLogs = mysqlTable('swap_logs', {
  id: int('id').autoincrement().primaryKey(),
  scheduleIdA: int('schedule_id_a').notNull(),
  scheduleIdB: int('schedule_id_b').notNull(),
  fromMemberA: int('from_member_a').notNull(),
  toMemberB: int('to_member_b').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  swappedAt: timestamp('swapped_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const emailLogs = mysqlTable('email_logs', {
  id: int('id').autoincrement().primaryKey(),
  dormId: int('dorm_id').notNull(),
  scheduleId: int('schedule_id'),
  memberId: int('member_id'),
  email: varchar('email', { length: 255 }).notNull(),
  emailType: varchar('email_type', { length: 50 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).notNull(),
})

export const missedLogs = mysqlTable('missed_logs', {
  id: int('id').autoincrement().primaryKey(),
  scheduleId: int('schedule_id').notNull(),
  memberId: int('member_id').notNull(),
  missedDate: date('missed_date').notNull(),
  status: varchar('status', { length: 20 }).default('missed').notNull(),
  clearedBy: int('cleared_by'),
  clearedAt: timestamp('cleared_at'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
})

export const registrationRequests = mysqlTable('registration_requests', {
  id: int('id').autoincrement().primaryKey(),
  dormName: varchar('dorm_name', { length: 255 }).notNull(),
  applicantName: varchar('applicant_name', { length: 255 }).notNull(),
  applicantEmail: varchar('applicant_email', { length: 255 }).notNull(),
  approveToken: varchar('approve_token', { length: 64 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  approvedAt: timestamp('approved_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
