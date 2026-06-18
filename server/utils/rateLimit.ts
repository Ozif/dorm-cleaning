/**
 * 速率限制工具
 * 内存级速率限制器，用于 API 调用频率控制
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()

  /**
   * 清理过期条目
   */
  private cleanExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key)
      }
    }
  }

  /**
   * 检查是否允许请求
   * @param key 限流键（如邮箱地址）
   * @param limit 窗口内最大请求数
   * @param windowMs 窗口时间（毫秒）
   */
  check(
    key: string,
    limit: number,
    windowMs: number,
  ): RateLimitResult {
    this.cleanExpired()
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || existing.resetAt <= now) {
      // 新窗口，重置
      this.store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      }
    }

    if (existing.count >= limit) {
      // 已达上限
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
      }
    }

    // 在窗口内递增
    existing.count++
    return {
      allowed: true,
      remaining: limit - existing.count,
      resetAt: existing.resetAt,
    }
  }

  /**
   * 获取键的当前状态
   */
  getStatus(key: string): { count: number; resetAt: number } | null {
    const entry = this.store.get(key)
    if (!entry || entry.resetAt <= Date.now()) {
      return null
    }
    return { count: entry.count, resetAt: entry.resetAt }
  }

  /**
   * 重置某个键
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * 获取总条目数
   */
  get size(): number {
    this.cleanExpired()
    return this.store.size
  }
}

/**
 * 应用级速率限制器实例
 * 用于验证码发送等场景
 */
export const rateLimiter = new RateLimiter()

/**
 * 验证码发送限制帮助函数
 */
export function checkVerifyCodeLimit(email: string): {
  allowed: boolean
  message?: string
} {
  // 60 秒冷却
  const perMinute = rateLimiter.check(`code:${email}`, 1, 60 * 1000)
  if (!perMinute.allowed) {
    return { allowed: false, message: '请 60 秒后再获取验证码' }
  }

  // 每小时最多 5 次
  const perHour = rateLimiter.check(`code:hourly:${email}`, 5, 60 * 60 * 1000)
  if (!perHour.allowed) {
    return { allowed: false, message: '发送太频繁，请 1 小时后再试' }
  }

  return { allowed: true }
}
