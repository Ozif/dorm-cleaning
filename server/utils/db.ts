import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'

let pool: mysql.Pool | null = null

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`)
  }
  return value
}

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: requiredEnv('DB_HOST'),
      port: parseInt(requiredEnv('DB_PORT')),
      user: requiredEnv('DB_USER'),
      password: requiredEnv('DB_PASSWORD'),
      database: requiredEnv('DB_NAME'),
      waitForConnections: true,
      connectionLimit: 10,
    })
  }
  return pool
}

export function getDb() {
  const connectionPool = getPool()
  const db = drizzle(connectionPool)
  return { pool: connectionPool, db }
}
