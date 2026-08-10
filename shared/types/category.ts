export interface Category {
  id: string
  name: string
  color: string
  icon: string
  email: string
  sort_order: number
  created_at: string
}

export interface CreateCategoryInput {
  name: string
  color: string
  icon: string
  email: string
}

export interface UpdateCategoryInput {
  name?: string
  color?: string
  icon?: string
  sort_order?: number
}
