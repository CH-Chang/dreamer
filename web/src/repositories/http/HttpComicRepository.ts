import type { Comic, ComicStatus } from '../../../../shared/types/comic'
import type { IComicRepository } from '../interfaces/IComicRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpComicRepository implements IComicRepository {
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

  async findAllByDreamId(dreamId: string): Promise<Comic[]> {
    const res = await fetch(`/api/comics?dream_id=${encodeURIComponent(dreamId)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async create(input: { dream_id: string; email: string; with_character?: boolean }): Promise<Comic> {
    const res = await fetch('/api/comics', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create comic')
    return res.json()
  }

  async updateStatus(id: string, status: ComicStatus, imageUrl?: string): Promise<Comic> {
    const res = await fetch(`/api/comics/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, image_url: imageUrl }),
    })
    if (!res.ok) throw new Error('Failed to update comic status')
    return res.json()
  }
}
