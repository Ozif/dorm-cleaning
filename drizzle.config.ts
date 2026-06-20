import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`)
  }
  return value
}

export default defineConfig({
  out: './server/models/migrations',
  schema: './server/models/schema.ts',
  dialect: 'mysql',
  dbCredentials: {
    host: requiredEnv('DB_HOST'),
    port: parseInt(requiredEnv('DB_PORT')),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_NAME'),
  },
})
