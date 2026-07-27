export interface EditLogEntry {
  id: string
  dream_id: string
  edited_at: string
  changes: Record<string, { from: string; to: string }>
  created_at: string
}
