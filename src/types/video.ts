export type VideoStatus = 'pending' | 'generating' | 'done' | 'failed'

export interface Video {
  id: string
  dream_id: string
  email: string
  status: VideoStatus
  video_url?: string
  created_at: string
  updated_at?: string
}
