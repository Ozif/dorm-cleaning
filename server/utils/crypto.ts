import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

const ALGORITHM = 'aes-256-cbc'

/**
 * 获取加密密钥（从环境变量或固定密钥派生）
 * 生产环境请使用安全的随机密钥
 */
function getKey(): Buffer {
  const secret = process.env.NUXT_SESSION_PASSWORD
  if (!secret) {
    throw new Error('NUXT_SESSION_PASSWORD 环境变量未设置，请设置一个安全的随机密钥')
  }
  return createHash('sha256').update(secret).digest()
}

/**
 * 加密并密封数据为安全的 token 字符串
 */
export async function seal(data: Record<string, any>): Promise<string> {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const json = JSON.stringify(data)
  const encrypted = Buffer.concat([
    cipher.update(json, 'utf8'),
    cipher.final(),
  ])

  // iv + encrypted 组合为 base64
  const combined = Buffer.concat([iv, encrypted])
  return combined.toString('base64url')
}

/**
 * 解封 token 还原数据
 */
export async function unseal<T = Record<string, any>>(token: string): Promise<T | null> {
  try {
    const key = getKey()
    const combined = Buffer.from(token, 'base64url')
    const iv = combined.subarray(0, 16)
    const encrypted = combined.subarray(16)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])

    return JSON.parse(decrypted.toString('utf8')) as T
  } catch {
    return null
  }
}
