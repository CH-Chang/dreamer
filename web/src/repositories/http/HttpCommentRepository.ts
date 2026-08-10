import type { Comment, CreateCommentInput } from '../../../../shared/types/comment'
import type { ICommentRepository } from '../interfaces/ICommentRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpCommentRepository implements ICommentRepository {
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

  async findByDreamId(dreamId: string): Promise<Comment[]> {
    const res = await fetch(`/api/comments?dream_id=${encodeURIComponent(dreamId)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async findByTarget(targetType: string, targetId: string): Promise<Comment[]> {
    const res = await fetch(`/api/comments?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async create(input: CreateCommentInput): Promise<Comment> {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create comment')
    return res.json()
  }

  async update(id: string, data: { content?: string }): Promise<Comment> {
    const res = await fetch(`/api/comments/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update comment')
    return res.json()
  }

  async delete(id: string): Promise<void> {
    await fetch(`/api/comments/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
  }
}
