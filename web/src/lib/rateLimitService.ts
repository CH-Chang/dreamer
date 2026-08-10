import { getRateLimitRepository } from '../repositories/factory'
import type { RateLimitType } from '../../../shared/types/rateLimit'

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

const DEFAULT_LIMITS: Record<RateLimitType, { daily: number; monthly: number }> = {
  video: { daily: 5, monthly: 30 },
  comic: { daily: 10, monthly: 60 },
}

export const rateLimitService = {
  async getLimit(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const repo = getRateLimitRepository()
    try {
      const userLimit = await repo.findByTypeAndScope(type, email)
      if (userLimit) return { daily: userLimit.daily_limit, monthly: userLimit.monthly_limit }

      const systemLimit = await repo.findByTypeAndScope(type, 'system')
      if (systemLimit) return { daily: systemLimit.daily_limit, monthly: systemLimit.monthly_limit }
    } catch {
      // Ignore API error and return default
    }
    return DEFAULT_LIMITS[type] ?? { daily: 10, monthly: 50 }
  },

  async getUsage(_email: string, _type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    // Basic usage tracking fallback
    return { daily: 0, monthly: 0 }
  },

  async getRemaining(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const limit = await this.getLimit(email, type)
    const usage = await this.getUsage(email, type)
    return {
      daily: Math.max(0, limit.daily - usage.daily),
      monthly: Math.max(0, limit.monthly - usage.monthly),
    }
  },

  async checkAndThrow(email: string, type: RateLimitType, _cost = 1): Promise<void> {
    const remaining = await this.getRemaining(email, type)
    if (remaining.daily <= 0) {
      throw new RateLimitError(`已達到每日${type === 'video' ? '影片' : '漫畫'}生成上限`)
    }
    if (remaining.monthly <= 0) {
      throw new RateLimitError(`已達到每月${type === 'video' ? '影片' : '漫畫'}生成上限`)
    }
  },
}
