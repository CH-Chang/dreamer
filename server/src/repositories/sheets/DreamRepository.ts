import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../../../shared/types/dream'
import type { IDreamRepository } from '../../../../shared/interfaces/IDreamRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'
import { getEditLogRepository } from '../factory'

export class DreamRepository implements IDreamRepository {
  private parseDreamRow(row: Record<string, unknown>): Dream {
    return {
      id: String(row.id || ''),
      email: String(row.email || ''),
      date: String(row.date || ''),
      description: String(row.description || ''),
      title: row.title ? String(row.title) : undefined,
      tags: typeof row.tags === 'string' ? this.safeParse(row.tags, []) : (row.tags as string[] || []),
      title_candidates: typeof row.title_candidates === 'string' ? this.safeParse(row.title_candidates, []) : (row.title_candidates as string[] || []),
      visibility: (row.visibility as 'public' | 'private') || 'public',
      created_at: String(row.created_at || ''),
      updated_at: String(row.updated_at || ''),
    }
  }

  private safeParse<T>(jsonStr: string, fallback: T): T {
    try {
      return JSON.parse(jsonStr)
    } catch {
      return fallback
    }
  }

  async findById(id: string): Promise<Dream | null> {
    const rows = await query<Record<string, unknown>>('SELECT * FROM dreams WHERE id = ?', [id])
    if (rows.length === 0) return null
    return this.parseDreamRow(rows[0])
  }

  async findByDate(email: string, date: string): Promise<Dream | null> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM dreams WHERE email = ? AND date = ?',
      [email, date],
    )
    if (rows.length === 0) return null
    return this.parseDreamRow(rows[0])
  }

  async findByMonth(email: string, year: number, month: number): Promise<Dream[]> {
    const monthStr = String(month + 1).padStart(2, '0')
    const prefix = `${year}-${monthStr}`
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM dreams WHERE email = ? AND date LIKE ? ORDER BY date ASC',
      [email, `${prefix}%`],
    )
    return rows.map((r) => this.parseDreamRow(r))
  }

  async findAllByEmail(email: string): Promise<Dream[]> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM dreams WHERE email = ? ORDER BY date DESC',
      [email],
    )
    return rows.map((r) => this.parseDreamRow(r))
  }

  async findPublicPage(cursor?: string, limit = 10): Promise<{ items: Dream[]; nextCursor?: string }> {
    let sql = "SELECT * FROM dreams WHERE visibility = 'public'"
    const params: unknown[] = []
    if (cursor) {
      sql += ' AND created_at < ?'
      params.push(cursor)
    }
    const safeLimit = Math.max(1, Number(limit) || 10)
    sql += ` ORDER BY created_at DESC LIMIT ${safeLimit + 1}`

    const rows = await query<Record<string, unknown>>(sql, params)
    const dreams = rows.map((r) => this.parseDreamRow(r))
    let nextCursor: string | undefined = undefined

    if (dreams.length > safeLimit) {
      const last = dreams.pop()!
      nextCursor = last.created_at
    }

    return { items: dreams, nextCursor }
  }

  async create(input: CreateDreamInput): Promise<Dream> {
    const now = new Date().toISOString()
    const dream: Dream = {
      id: generateId(),
      email: input.email,
      date: input.date,
      description: input.description,
      title: input.title || '',
      title_candidates: input.title_candidates || [],
      tags: input.tags || [],
      visibility: input.visibility ?? 'public',
      created_at: now,
      updated_at: now,
    }
    try {
      await appendSheetRow('dreams', [[
        dream.id, dream.email, dream.date, dream.description,
        dream.title || '', JSON.stringify(dream.tags), dream.visibility,
        JSON.stringify(dream.title_candidates || []),
        dream.created_at, dream.updated_at,
      ]])
    } catch (err) {
      console.error('DreamRepository: Google Sheets appendSheetRow failed (falling back to AlaSQL)', err)
      // Sheets offline, proceed with AlaSQL
    }
    await query(
      `INSERT INTO dreams (id, email, date, description, title, tags, title_candidates, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dream.id, dream.email, dream.date, dream.description, dream.title || '', JSON.stringify(dream.tags), JSON.stringify(dream.title_candidates || []), dream.visibility, dream.created_at, dream.updated_at],
    )
    return dream
  }

  async update(id: string, data: UpdateDreamInput): Promise<Dream> {
    const now = new Date().toISOString()
    const existing = await this.findById(id)
    if (!existing) throw new Error('Dream not found')

    const updateFields: string[] = ['updated_at = ?']
    const updateValues: unknown[] = [now]
    const changes: Record<string, { from: string; to: string }> = {}

    if (data.title !== undefined && data.title !== existing.title) {
      updateFields.push('title = ?')
      updateValues.push(data.title)
      changes.title = { from: existing.title || '', to: data.title }
    }
    if (data.description !== undefined && data.description !== existing.description) {
      updateFields.push('description = ?')
      updateValues.push(data.description)
      changes.description = { from: existing.description, to: data.description }
    }
    if (data.tags !== undefined) {
      updateFields.push('tags = ?')
      updateValues.push(JSON.stringify(data.tags))
      changes.tags = { from: JSON.stringify(existing.tags || []), to: JSON.stringify(data.tags) }
    }
    if (data.title_candidates !== undefined) {
      updateFields.push('title_candidates = ?')
      updateValues.push(JSON.stringify(data.title_candidates))
      changes.title_candidates = { from: JSON.stringify(existing.title_candidates || []), to: JSON.stringify(data.title_candidates) }
    }
    if (data.visibility !== undefined && data.visibility !== existing.visibility) {
      updateFields.push('visibility = ?')
      updateValues.push(data.visibility)
      changes.visibility = { from: existing.visibility, to: data.visibility }
    }

    updateValues.push(id)
    await query(`UPDATE dreams SET ${updateFields.join(', ')} WHERE id = ?`, updateValues)

    try {
      // Find row index in Google Sheets
      const { fetchSheetAsRows } = await import('../../lib/googleSheetsClient')
      const rows = await fetchSheetAsRows('dreams')
      const rowIndex = rows.findIndex(r => r[0] === id)
      if (rowIndex > 0) {
        const updatedDream = await this.findById(id)
        if (updatedDream) {
          await updateSheetRow('dreams', rowIndex + 1, [
            updatedDream.id, updatedDream.email, updatedDream.date, updatedDream.description,
            updatedDream.title || '', JSON.stringify(updatedDream.tags || []), updatedDream.visibility,
            JSON.stringify(updatedDream.title_candidates || []),
            updatedDream.created_at, updatedDream.updated_at
          ])
        }
      }
    } catch (err) {
      console.error('DreamRepository: Google Sheets updateSheetRow failed', err)
    }

    if (Object.keys(changes).length > 0) {
      try {
        await getEditLogRepository().create({ dream_id: id, edited_at: now, changes })
      } catch (err) {
        console.error('DreamRepository: getEditLogRepository().create failed', err)
        // Ignore edit log creation failure
      }
    }

    const updated = await this.findById(id)
    if (!updated) throw new Error('Dream not found after update')
    return updated
  }

  async delete(id: string, email: string): Promise<void> {
    await query('DELETE FROM dreams WHERE id = ? AND email = ?', [id, email])
  }
}
