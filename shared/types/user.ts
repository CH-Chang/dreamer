export type UserRole = 'user' | 'admin'
export type SupportedLanguage = 'zh-TW' | 'en-US' | 'zh-CN'

export interface User {
  email: string
  name: string
  avatar_url?: string
  role: UserRole
  created_at: string
  language?: SupportedLanguage
  ai_mode?: 'system' | 'custom'
  custom_gcp_project_id?: string
  custom_gcp_location?: string
}

