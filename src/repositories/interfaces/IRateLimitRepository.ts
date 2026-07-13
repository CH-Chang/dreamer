import type { RateLimit, RateLimitType, RateLimitScope, CreateRateLimitInput, UpdateRateLimitInput } from '../../types/rateLimit'

export interface IRateLimitRepository {
  findByTypeAndScope(type: RateLimitType, scope: RateLimitScope): Promise<RateLimit | null>
  findAll(): Promise<RateLimit[]>
  create(input: CreateRateLimitInput): Promise<RateLimit>
  update(id: string, input: UpdateRateLimitInput): Promise<RateLimit>
  delete(id: string): Promise<void>
}
