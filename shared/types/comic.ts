export type ComicStatus = 'pending' | 'generating' | 'done' | 'failed'

export interface Comic {
  id: string
  dream_id: string
  email: string
  status: ComicStatus
  image_url?: string
  with_character: boolean
  created_at: string
  updated_at?: string
}
