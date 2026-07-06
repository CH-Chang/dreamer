import type { VideoStatus } from './video'

export interface Dream {
  id: string
  email: string
  date: string
  description: string
  title?: string
  category?: string
  edit_log?: string
  created_at: string
  updated_at: string
}

export interface CreateDreamInput {
  email: string
  date: string
  description: string
}

export interface UpdateDreamInput {
  title?: string
  category?: string
  description?: string
}
