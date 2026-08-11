export interface Dream {
  id: string
  email: string
  date: string
  description: string
  title?: string
  title_candidates?: string[]
  tags: string[]
  visibility: 'public' | 'private'
  created_at: string
  updated_at: string
}

export interface CreateDreamInput {
  email: string
  date: string
  description: string
  title?: string
  title_candidates?: string[]
  tags?: string[]
  visibility?: 'public' | 'private'
}

export interface UpdateDreamInput {
  title?: string
  title_candidates?: string[]
  tags?: string[]
  visibility?: 'public' | 'private'
  description?: string
}
