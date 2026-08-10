import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../../../shared/types/dream'
import type { IDreamRepository } from '../../../../shared/interfaces/IDreamRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { getEditLogRepository } from '../factory'
import { generateId } from '../../utils/idGenerator'

export class DreamRepository implements IDreamRepository {
  private parseRow = (row: Dream): Dream => ({
    ...row,
    tags: typeof row.tags === 'string' ? this.safeParse(row.tags, []) : (row.tags || []),
    title_candidates: typeof row.title_candidates === 'string' ? this.safeParse(row.title_candidates, []) : (row.title_candidates || []),
  })

  private safeParse = <T>(val: string, fallback: T): T => {
    try { return JSON.parse(val) } catch { return fallback }
  }

  async findById(id: string): Promise<Dream | null> {
    const dreams = await query<Dream>(
      'SELECT * FROM dreams WHERE id = ?',
      [id],
    )
    return dreams[0] ? this.parseRow(dreams[0]) : null
  }

  async findAllByEmail(email: string): Promise<Dream[]> {
    const dreams = await query<Dream>(
      'SELECT * FROM dreams WHERE email = ? ORDER BY created_at DESC',
      [email],
    )
    return dreams.map(this.parseRow)
  }

  async findByDate(email: string, date: string): Promise<Dream | null> {
    const dreams = await query<Dream>(
      'SELECT * FROM dreams WHERE email = ? AND date = ?',
      [email, date],
    )
    return dreams[0] ? this.parseRow(dreams[0]) : null
  }

  async findByMonth(email: string, year: number, month: number): Promise<Dream[]> {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    const dreams = await query<Dream>(
      'SELECT * FROM dreams WHERE email = ? AND date LIKE ?',
      [email, `${monthStr}%`],
    )
    return dreams.map(this.parseRow)
  }

  async findPublicPage(cursor?: string, limit = 10): Promise<{ items: Dream[]; nextCursor?: string }> {
    const subquery = `(id IN (SELECT dream_id FROM videos WHERE status = 'done') OR id IN (SELECT dream_id FROM comics WHERE status = 'done'))`
    let sql: string
    let params: unknown[]

    if (cursor) {
      sql = `SELECT * FROM dreams WHERE visibility = 'public' AND created_at < ? AND ${subquery} ORDER BY created_at DESC LIMIT ${limit}`
      params = [cursor]
    } else {
      sql = `SELECT * FROM dreams WHERE visibility = 'public' AND ${subquery} ORDER BY created_at DESC LIMIT ${limit}`
      params = []
    }

    try {
      const items = await query<Dream>(sql, params)
      const nextCursor = items.length === limit ? items[items.length - 1].created_at : undefined
      return { items: items.map(this.parseRow), nextCursor }
    } catch {
      // Fallback if video/comic tables don't exist yet
      const fallbackSql = cursor
        ? `SELECT * FROM dreams WHERE visibility = 'public' AND created_at < ? ORDER BY created_at DESC LIMIT ${limit}`
        : `SELECT * FROM dreams WHERE visibility = 'public' ORDER BY created_at DESC LIMIT ${limit}`
      const items = await query<Dream>(fallbackSql, cursor ? [cursor] : [])
      const nextCursor = items.length === limit ? items[items.length - 1].created_at : undefined
      return { items: items.map(this.parseRow), nextCursor }
    }
  }

  async create(input: CreateDreamInput): Promise<Dream> {
    const now = new Date().toISOString()
    const dream: Dream = {
      id: generateId(),
      email: input.email,
      date: input.date,
      description: input.description,
      title_candidates: [],
      tags: [],
      visibility: input.visibility ?? 'private',
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
    } catch {
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
    let oldValues: string[] = []
    let rowIdx = -1
    let headers: string[] = []

    try {
      const rows = await fetchSheetAsRows('dreams')
      if (rows.length >= 2) {
        headers = rows[0]
        rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
        if (rowIdx !== -1) oldValues = rows[rowIdx]
      }
    } catch {
      // Sheet offline
    }

    const updateFields: string[] = ["updated_at = ?"]
    const updateValues: unknown[] = [now]
    if (data.title !== undefined) { updateFields.push("title = ?"); updateValues.push(data.title) }
    if (data.tags !== undefined) { updateFields.push("tags = ?"); updateValues.push(JSON.stringify(data.tags)) }
    if (data.visibility !== undefined) { updateFields.push("visibility = ?"); updateValues.push(data.visibility) }
    if (data.description !== undefined) { updateFields.push("description = ?"); updateValues.push(data.description) }
    if (data.title_candidates !== undefined) { updateFields.push("title_candidates = ?"); updateValues.push(JSON.stringify(data.title_candidates)) }
    updateValues.push(id)

    if (updateFields.length > 1) {
      await query(`UPDATE dreams SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)
    }

    const existing = await this.findById(id)
    if (!existing) throw new Error('Dream not found')

    if (rowIdx !== -1 && oldValues.length > 0) {
      const newValues = [...oldValues]
      const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
      if (data.title !== undefined) { const ci = colIndex('title'); if (ci !== -1) newValues[ci] = data.title }
      if (data.tags !== undefined) { const ci = colIndex('tags'); if (ci !== -1) newValues[ci] = JSON.stringify(data.tags) }
      if (data.visibility !== undefined) { const ci = colIndex('visibility'); if (ci !== -1) newValues[ci] = data.visibility }
      if (data.description !== undefined) { const ci = colIndex('description'); if (ci !== -1) newValues[ci] = data.description }
      if (data.title_candidates !== undefined) { const ci = colIndex('title_candidates'); if (ci !== -1) newValues[ci] = JSON.stringify(data.title_candidates) }
      const updatedAtCol = colIndex('updated_at')
      if (updatedAtCol !== -1) newValues[updatedAtCol] = now

      try {
        await updateSheetRow('dreams', rowIdx + 1, newValues)
      } catch {
        // Sheet update failed
      }
    }

    return existing
  }

  async delete(id: string, _email?: string): Promise<void> {
    await query('DELETE FROM dreams WHERE id = ?', [id])
  }
}
