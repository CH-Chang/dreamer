import type { RateLimit, RateLimitType, RateLimitScope, CreateRateLimitInput, UpdateRateLimitInput } from '../../../../shared/types/rateLimit'
import type { IRateLimitRepository } from '../../../../shared/interfaces/IRateLimitRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class RateLimitRepository implements IRateLimitRepository {
  async findByTypeAndScope(type: RateLimitType, scope: RateLimitScope): Promise<RateLimit | null> {
    const rows = await query<RateLimit>(
      'SELECT * FROM rate_limits WHERE type = ? AND scope = ? LIMIT 1',
      [type, scope],
    )
    return rows[0] || null
  }

  async findAll(): Promise<RateLimit[]> {
    return query<RateLimit>('SELECT * FROM rate_limits ORDER BY type, scope')
  }

  async create(input: CreateRateLimitInput): Promise<RateLimit> {
    const now = new Date().toISOString()
    const item: RateLimit = {
      id: generateId(),
      type: input.type,
      scope: input.scope,
      daily_limit: input.daily_limit,
      monthly_limit: input.monthly_limit,
      created_at: now,
    }
    try {
      await appendSheetRow('rate_limits', [[
        item.id, item.type, item.scope, String(item.daily_limit), String(item.monthly_limit), item.created_at, '',
      ]])
    } catch {
      // Sheets offline
    }
    await query(
      'INSERT INTO rate_limits (id, type, scope, daily_limit, monthly_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [item.id, item.type, item.scope, item.daily_limit, item.monthly_limit, item.created_at, ''],
    )
    return item
  }

  async update(id: string, input: UpdateRateLimitInput): Promise<RateLimit> {
    const now = new Date().toISOString()
    const updateFields: string[] = []
    const updateValues: unknown[] = []
    if (input.daily_limit !== undefined) {
      updateFields.push('daily_limit = ?')
      updateValues.push(input.daily_limit)
    }
    if (input.monthly_limit !== undefined) {
      updateFields.push('monthly_limit = ?')
      updateValues.push(input.monthly_limit)
    }
    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?')
      updateValues.push(now)
      updateValues.push(id)
      await query(`UPDATE rate_limits SET ${updateFields.join(', ')} WHERE id = ?`, updateValues)
    }

    try {
      const rows = await fetchSheetAsRows('rate_limits')
      if (rows.length >= 2) {
        const headers = rows[0]
        const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
        if (rowIdx !== -1) {
          const newValues = [...rows[rowIdx]]
          const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
          if (input.daily_limit !== undefined) {
            const col = colIndex('daily_limit')
            if (col !== -1) newValues[col] = String(input.daily_limit)
          }
          if (input.monthly_limit !== undefined) {
            const col = colIndex('monthly_limit')
            if (col !== -1) newValues[col] = String(input.monthly_limit)
          }
          const updatedAtCol = colIndex('updated_at')
          if (updatedAtCol !== -1) newValues[updatedAtCol] = now
          await updateSheetRow('rate_limits', rowIdx + 1, newValues)
        }
      }
    } catch {
      // Sheets offline
    }

    const items = await query<RateLimit>('SELECT * FROM rate_limits WHERE id = ?', [id])
    if (items.length === 0) throw new Error('Rate limit not found')
    return items[0]
  }

  async delete(id: string): Promise<void> {
    try {
      const rows = await fetchSheetAsRows('rate_limits')
      if (rows.length >= 2) {
        const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
        if (rowIdx !== -1) {
          await updateSheetRow('rate_limits', rowIdx + 1, rows[rowIdx].map(() => ''))
        }
      }
    } catch {
      // Sheets offline
    }
    await query('DELETE FROM rate_limits WHERE id = ?', [id])
  }
}
