import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../types/dream'
import type { IDreamRepository } from '../interfaces/IDreamRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

const COLUMNS = ['id', 'email', 'date', 'description', 'title', 'category', 'edit_log', 'created_at', 'updated_at']

export class DreamRepository implements IDreamRepository {
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
      edit_log: '',
      created_at: now,
      updated_at: now,
    }
    await appendSheetRow('dreams', [[
      dream.id, dream.email, dream.date, dream.description,
      dream.title || '', dream.category || '', dream.edit_log || '',
      dream.created_at, dream.updated_at,
    ]])
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
    if (data.category !== undefined) {
      const ci = colIndex('category')
      if (ci !== -1 && newValues[ci] !== data.category) {
        changes.category = { from: newValues[ci] || '', to: data.category }
        newValues[ci] = data.category
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

    const dream: Dream = {
      id: newValues[colIndex('id')] || id,
      email: newValues[colIndex('email')] || '',
      date: newValues[colIndex('date')] || '',
      description: newValues[colIndex('description')] || '',
      title: newValues[colIndex('title')] || undefined,
      category: newValues[colIndex('category')] || undefined,
      edit_log: newValues[colIndex('edit_log')] || undefined,
      created_at: newValues[colIndex('created_at')] || '',
      updated_at: newValues[colIndex('updated_at')] || '',
    }
    return dream
  }
}
