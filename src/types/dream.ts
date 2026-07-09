
export interface Dream {
  id: string
  email: string
  date: string
  description: string
  title?: string
  tags: string[]
  visibility: 'public' | 'private'
  edit_log?: string
  created_at: string
  updated_at: string
}

export interface CreateDreamInput {
  email: string
  date: string
  description: string
  visibility?: 'public' | 'private'
}

export interface UpdateDreamInput {
  title?: string
  tags?: string[]
  visibility?: 'public' | 'private'
  description?: string
}
