import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../../../shared/types/dream'
import type { IDreamRepository } from '../interfaces/IDreamRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpDreamRepository implements IDreamRepository {
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

  async findById(id: string): Promise<Dream | null> {
    const res = await fetch(`/api/dreams/${id}`, { headers: this.getHeaders() })
    if (!res.ok) return null
    return res.json()
  }

  async findAllByEmail(email: string): Promise<Dream[]> {
    const res = await fetch(`/api/dreams?email=${encodeURIComponent(email)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async findByDate(email: string, date: string): Promise<Dream | null> {
    const res = await fetch(`/api/dreams?email=${encodeURIComponent(email)}&date=${encodeURIComponent(date)}`, { headers: this.getHeaders() })
    if (!res.ok) return null
    return res.json()
  }

  async findByMonth(email: string, year: number, month: number): Promise<Dream[]> {
    const res = await fetch(`/api/dreams?email=${encodeURIComponent(email)}&year=${year}&month=${month}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async findPublicPage(cursor?: string, limit = 10): Promise<{ items: Dream[]; nextCursor?: string }> {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    params.set('limit', String(limit))
    const res = await fetch(`/api/dreams/public?${params.toString()}`, { headers: this.getHeaders() })
    if (!res.ok) return { items: [] }
    return res.json()
  }

  async create(input: CreateDreamInput): Promise<Dream> {
    const res = await fetch('/api/dreams', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create dream')
    return res.json()
  }

  async update(id: string, data: UpdateDreamInput): Promise<Dream> {
    const res = await fetch(`/api/dreams/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update dream')
    return res.json()
  }

  async delete(id: string, email?: string): Promise<void> {
    const query = email ? `?email=${encodeURIComponent(email)}` : ''
    await fetch(`/api/dreams/${id}${query}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
  }
}
