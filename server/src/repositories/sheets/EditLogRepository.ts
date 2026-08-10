import type { EditLogEntry } from '../../../../shared/types/editLog'
import type { IEditLogRepository } from '../../../../shared/interfaces/IEditLogRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class EditLogRepository implements IEditLogRepository {
  async create(entry: Omit<EditLogEntry, 'id' | 'created_at'>): Promise<EditLogEntry> {
    const now = new Date().toISOString()
    const log: EditLogEntry = {
      id: generateId(),
      dream_id: entry.dream_id,
      edited_at: entry.edited_at,
      changes: entry.changes,
      created_at: now,
    }
    try {
      await appendSheetRow('edit_logs', [[
        log.id, log.dream_id, log.edited_at,
        JSON.stringify(log.changes), log.created_at,
      ]])
    } catch {
      // Sheets offline
    }
    await query(
      'INSERT INTO edit_logs (id, dream_id, edited_at, changes, created_at) VALUES (?, ?, ?, ?, ?)',
      [log.id, log.dream_id, log.edited_at, JSON.stringify(log.changes), log.created_at],
    )
    return log
  }

  async findByDreamId(dreamId: string): Promise<EditLogEntry[]> {
    const rows = await query<EditLogEntry>(
      'SELECT * FROM edit_logs WHERE dream_id = ? ORDER BY edited_at ASC',
      [dreamId],
    )
    return rows.map((row) => ({
      ...row,
      changes: (() => {
        if (typeof row.changes === 'string') {
          try { return JSON.parse(row.changes) } catch { return {} }
        }
        return row.changes
      })(),
    }))
  }
}
