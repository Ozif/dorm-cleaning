import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessionPayload {
  memberId: number
  dormId: number
  email: string
  name: string
  iat: number
  exp: number
}

/**
 * 获取会话签名密钥
 */
function getKey(): Buffer {
  const secret = process.env.NUXT_SESSION_PASSWORD
  if (!secret) {
    throw new Error('NUXT_SESSION_PASSWORD 环境变量未设置，请设置一个安全的随机密钥')
  }
  if (secret.length < 32) {
    throw new Error('NUXT_SESSION_PASSWORD 长度至少需要 32 个字符')
  }
  return Buffer.from(secret, 'utf8')
}

/**
 * 对 session 数据做签名，防止客户端篡改
 */
export async function seal(data: SessionPayload): Promise<string> {
  const key = getKey()
  const payload = Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')
  const signature = createHmac('sha256', key).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

/**
 * 校验签名并还原 session 数据
 */
export async function unseal<T = SessionPayload>(token: string): Promise<T | null> {
  try {
    const key = getKey()
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null

    const expected = createHmac('sha256', key).update(payload).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null
    }

    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
