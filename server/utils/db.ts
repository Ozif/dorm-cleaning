import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dorm_cleaning',
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
