import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../types/dream'
import type { IDreamRepository } from '../interfaces/IDreamRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class DreamRepository implements IDreamRepository {
  async findById(id: string): Promise<Dream | null> {
    const dreams = await query<Dream>(
      'SELECT * FROM dreams WHERE id = ?',
      [id],
    )
    return dreams[0] || null
  }

  async findByDate(email: string, date: string): Promise<Dream | null> {
    const dreams = await query<Dream>(
      'SELECT * FROM dreams WHERE email = ? AND date = ?',
      [email, date],
    )
    return dreams[0] || null
  }

  async findByMonth(email: string, year: number, month: number): Promise<Dream[]> {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    return query<Dream>(
      'SELECT * FROM dreams WHERE email = ? AND date LIKE ?',
      [email, `${monthStr}%`],
    )
  }

  async create(input: CreateDreamInput): Promise<Dream> {
    const now = new Date().toISOString()
    const dream: Dream = {
      id: generateId(),
      email: input.email,
      date: input.date,
      description: input.description,
      tags: [],
      visibility: input.visibility ?? 'private',
      edit_log: '',
      created_at: now,
      updated_at: now,
    }
    await appendSheetRow('dreams', [[
      dream.id, dream.email, dream.date, dream.description,
      dream.title || '', JSON.stringify(dream.tags), dream.visibility,
      dream.edit_log || '',
      dream.created_at, dream.updated_at,
    ]])
    await query(
      `INSERT INTO dreams (id, email, date, description, title, tags, visibility, edit_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dream.id, dream.email, dream.date, dream.description, dream.title || '', JSON.stringify(dream.tags), dream.visibility, dream.edit_log || '', dream.created_at, dream.updated_at],
    )
    return dream
  }

  async update(id: string, data: UpdateDreamInput): Promise<Dream> {
    const rows = await fetchSheetAsRows('dreams')
    if (rows.length < 2) throw new Error('Dream not found')

    const headers = rows[0]
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
    if (rowIdx === -1) throw new Error('Dream not found')

    const oldValues = rows[rowIdx]
    const now = new Date().toISOString()

    const changes: Record<string, { from: string; to: string }> = {}
    const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)

    const newValues = [...oldValues]
    if (data.title !== undefined) {
      const ci = colIndex('title')
      if (ci !== -1 && newValues[ci] !== data.title) {
        changes.title = { from: newValues[ci] || '', to: data.title }
        newValues[ci] = data.title
      }
    }
    if (data.tags !== undefined) {
      const ci = colIndex('tags')
      if (ci !== -1) {
        const oldTags = newValues[ci] || '[]'
        const newTags = JSON.stringify(data.tags)
        if (oldTags !== newTags) {
          changes.tags = { from: oldTags, to: newTags }
          newValues[ci] = newTags
        }
      }
    }
    if (data.visibility !== undefined) {
      const ci = colIndex('visibility')
      if (ci !== -1 && newValues[ci] !== data.visibility) {
        changes.visibility = { from: newValues[ci] || '', to: data.visibility }
        newValues[ci] = data.visibility
      }
    }
    if (data.description !== undefined) {
      const ci = colIndex('description')
      if (ci !== -1 && newValues[ci] !== data.description) {
        changes.description = { from: newValues[ci] || '', to: data.description }
        newValues[ci] = data.description
      }
    }

    const updatedAtCol = colIndex('updated_at')
    if (updatedAtCol !== -1) newValues[updatedAtCol] = now

    if (Object.keys(changes).length > 0) {
      const editLogCol = colIndex('edit_log')
      if (editLogCol !== -1) {
        const existingLog = newValues[editLogCol] || ''
        const entry = JSON.stringify({ edited_at: now, changes })
        newValues[editLogCol] = existingLog ? existingLog + '\n' + entry : entry
      }
    }

    await updateSheetRow('dreams', rowIdx + 1, newValues)

    const updateFields: string[] = ["updated_at = ?"]
    const updateValues: unknown[] = [now]
    if (data.title !== undefined) { updateFields.push("title = ?"); updateValues.push(data.title) }
    if (data.tags !== undefined) { updateFields.push("tags = ?"); updateValues.push(JSON.stringify(data.tags)) }
    if (data.visibility !== undefined) { updateFields.push("visibility = ?"); updateValues.push(data.visibility) }
    if (data.description !== undefined) { updateFields.push("description = ?"); updateValues.push(data.description) }
    updateValues.push(id)
    if (updateFields.length > 1) {
      await query(`UPDATE dreams SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)
    }

    const dream: Dream = {
      id: newValues[colIndex('id')] || id,
      email: newValues[colIndex('email')] || '',
      date: newValues[colIndex('date')] || '',
      description: newValues[colIndex('description')] || '',
      title: newValues[colIndex('title')] || undefined,
      tags: JSON.parse(newValues[colIndex('tags')] || '[]'),
      visibility: (newValues[colIndex('visibility')] || 'private') as 'public' | 'private',
      edit_log: newValues[colIndex('edit_log')] || undefined,
      created_at: newValues[colIndex('created_at')] || '',
      updated_at: newValues[colIndex('updated_at')] || '',
    }
    return dream
  }
}
