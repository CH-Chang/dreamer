export interface Comment {
  id: string
  dream_id: string
  target_type: 'dream' | 'video' | 'comic'
  target_id: string
  email: string
  content: string
  parent_id: string | null
  mentions: string[]
  created_at: string
  updated_at: string
}

export interface CreateCommentInput {
  dream_id: string
  target_type: 'dream' | 'video' | 'comic'
  target_id: string
  email: string
  content: string
  parent_id?: string
  mentions?: string[]
}
