import type { User } from '../../../shared/types/user'
import type { IUserRepository } from '../interfaces/IUserRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpUserRepository implements IUserRepository {
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

  async findByEmail(email: string): Promise<User | null> {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`, { headers: this.getHeaders() })
    if (!res.ok) return null
    return res.json()
  }

  async findCount(): Promise<number> {
    const res = await fetch('/api/users/count', { headers: this.getHeaders() })
    if (!res.ok) return 0
    const data = await res.json()
    return typeof data === 'number' ? data : data.count ?? 0
  }

  async create(user: Omit<User, 'created_at'>): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(user),
    })
    if (!res.ok) throw new Error('Failed to create user')
    return res.json()
  }

  async update(email: string, data: Partial<Omit<User, 'email' | 'created_at'>>): Promise<void> {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update user')
  }
}
