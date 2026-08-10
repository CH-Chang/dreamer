export type RateLimitType = 'video' | 'comic'
export type RateLimitScope = 'system' | string

export interface RateLimit {
  id: string
  type: RateLimitType
  scope: RateLimitScope
  daily_limit: number
  monthly_limit: number
  created_at: string
  updated_at?: string
}

export interface CreateRateLimitInput {
  type: RateLimitType
  scope: RateLimitScope
  daily_limit: number
  monthly_limit: number
}

export interface UpdateRateLimitInput {
  daily_limit?: number
  monthly_limit?: number
}
