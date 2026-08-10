import type { RateLimit, RateLimitType, RateLimitScope, CreateRateLimitInput, UpdateRateLimitInput } from '../../../shared/types/rateLimit'
import type { IRateLimitRepository } from '../interfaces/IRateLimitRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpRateLimitRepository implements IRateLimitRepository {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const token = useAuthStore.getState().token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async findByTypeAndScope(type: RateLimitType, scope: RateLimitScope): Promise<RateLimit | null> {
    const res = await fetch(`/api/rate-limits?type=${encodeURIComponent(type)}&scope=${encodeURIComponent(scope)}`, { headers: this.getHeaders() })
    if (!res.ok) return null
    return res.json()
  }

  async findAll(): Promise<RateLimit[]> {
    const res = await fetch('/api/rate-limits', { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async create(input: CreateRateLimitInput): Promise<RateLimit> {
    const res = await fetch('/api/rate-limits', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create rate limit')
    return res.json()
  }

  async update(id: string, input: UpdateRateLimitInput): Promise<RateLimit> {
    const res = await fetch(`/api/rate-limits/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to update rate limit')
    return res.json()
  }

  async delete(id: string): Promise<void> {
    await fetch(`/api/rate-limits/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
  }
}
