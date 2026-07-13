import type { RateLimitType } from '../types/rateLimit'
import { query } from './alaSqlService'
import { getRateLimitRepository } from '../repositories/factory'

export class RateLimitError extends Error {
  remaining: { daily: number; monthly: number }
  type: RateLimitType

  constructor(type: RateLimitType, remaining: { daily: number; monthly: number }) {
    const parts: string[] = []
    if (remaining.daily <= 0) parts.push(`今日`)
    if (remaining.monthly <= 0) parts.push(`本月`)
    super(`已達上限`)
    this.name = 'RateLimitError'
    this.remaining = remaining
    this.type = type
  }
}

class RateLimitService {
  async getUsage(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const table = type === 'video' ? 'videos' : 'comics'
    const dailyResult = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE email = ? AND status != 'failed' AND date(created_at) = date('now')`,
      [email],
    )
    const monthlyResult = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE email = ? AND status != 'failed' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      [email],
    )
    return {
      daily: dailyResult[0]?.cnt || 0,
      monthly: monthlyResult[0]?.cnt || 0,
    }
  }

  async getLimit(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const repo = getRateLimitRepository()

    const userLimit = await repo.findByTypeAndScope(type, email)
    if (userLimit) {
      return { daily: userLimit.daily_limit, monthly: userLimit.monthly_limit }
    }

    const systemLimit = await repo.findByTypeAndScope(type, 'system')
    if (systemLimit) {
      return { daily: systemLimit.daily_limit, monthly: systemLimit.monthly_limit }
    }

    const defaults: Record<RateLimitType, { daily: number; monthly: number }> = {
      video: { daily: 5, monthly: 30 },
      comic: { daily: 10, monthly: 60 },
    }
    return defaults[type]
  }

  async getRemaining(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const [usage, limit] = await Promise.all([
      this.getUsage(email, type),
      this.getLimit(email, type),
    ])
    return {
      daily: Math.max(0, limit.daily - usage.daily),
      monthly: Math.max(0, limit.monthly - usage.monthly),
    }
  }

  async checkAndThrow(email: string, type: RateLimitType): Promise<void> {
    const [usage, limit] = await Promise.all([
      this.getUsage(email, type),
      this.getLimit(email, type),
    ])
    const remaining = {
      daily: Math.max(0, limit.daily - usage.daily),
      monthly: Math.max(0, limit.monthly - usage.monthly),
    }
    if (remaining.daily <= 0 || remaining.monthly <= 0) {
      throw new RateLimitError(type, {
        daily: remaining.daily,
        monthly: remaining.monthly,
      })
    }
  }

  async initDefaults(): Promise<void> {
    const repo = getRateLimitRepository()
    const existing = await repo.findByTypeAndScope('video', 'system')
    if (!existing) {
      await repo.create({ type: 'video', scope: 'system', daily_limit: 5, monthly_limit: 30 })
    }
    const existingComic = await repo.findByTypeAndScope('comic', 'system')
    if (!existingComic) {
      await repo.create({ type: 'comic', scope: 'system', daily_limit: 10, monthly_limit: 60 })
    }
  }
}

export const rateLimitService = new RateLimitService()
