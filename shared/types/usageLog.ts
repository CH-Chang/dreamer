export interface UsageLog {
  id: string
  user_email: string
  action_type: 'video' | 'comic' | 'title'
  mode: 'system' | 'custom'
  gcp_project_id: string
  quota_deducted: boolean
  created_at: string
}
