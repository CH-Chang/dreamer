import type { Video, VideoStatus } from '../../../../shared/types/video'
import type { IVideoRepository } from '../interfaces/IVideoRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpVideoRepository implements IVideoRepository {
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

  async findByDreamId(dreamId: string): Promise<Video | null> {
    const res = await fetch(`/api/videos/by-dream/${encodeURIComponent(dreamId)}`, { headers: this.getHeaders() })
    if (!res.ok) return null
    return res.json()
  }

  async findAllByDreamId(dreamId: string): Promise<Video[]> {
    const res = await fetch(`/api/videos?dream_id=${encodeURIComponent(dreamId)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async create(video: { dream_id: string; email: string; with_character?: boolean }): Promise<Video> {
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(video),
    })
    if (!res.ok) throw new Error('Failed to create video')
    return res.json()
  }

  async updateStatus(id: string, status: VideoStatus, videoUrl?: string): Promise<Video> {
    const res = await fetch(`/api/videos/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, video_url: videoUrl }),
    })
    if (!res.ok) throw new Error('Failed to update video status')
    return res.json()
  }
}
