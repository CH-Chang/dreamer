export type UserRole = 'user' | 'admin'

export interface User {
  email: string
  name: string
  avatar_url?: string
  role: UserRole
  created_at: string
  ai_mode?: 'system' | 'custom'
  custom_gcp_project_id?: string
  custom_gcp_location?: string
}
