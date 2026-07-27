import type { EditLogEntry } from '../../types/editLog'

export interface IEditLogRepository {
  create(entry: Omit<EditLogEntry, 'id' | 'created_at'>): Promise<EditLogEntry>
  findByDreamId(dreamId: string): Promise<EditLogEntry[]>
}
