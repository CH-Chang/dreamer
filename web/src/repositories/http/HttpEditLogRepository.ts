import type { EditLogEntry } from '../../../../shared/types/editLog'
import type { IEditLogRepository } from '../interfaces/IEditLogRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpEditLogRepository implements IEditLogRepository {
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

  async create(entry: Omit<EditLogEntry, 'id' | 'created_at'>): Promise<EditLogEntry> {
    const res = await fetch('/api/edit-logs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(entry),
    })
    if (!res.ok) throw new Error('Failed to create edit log')
    return res.json()
  }

  async findByDreamId(dreamId: string): Promise<EditLogEntry[]> {
    const res = await fetch(`/api/edit-logs?dream_id=${encodeURIComponent(dreamId)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }
}
