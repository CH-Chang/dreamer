export type UserRole = 'user' | 'admin'

export interface User {
  email: string
  name: string
  avatar_url?: string
  role: UserRole
  created_at: string
}
