import type { Comic, ComicStatus } from '../../types/comic'
import type { IComicRepository } from '../interfaces/IComicRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class ComicRepository implements IComicRepository {
  async findAllByDreamId(dreamId: string): Promise<Comic[]> {
    return query<Comic>(
      'SELECT * FROM comics WHERE dream_id = ? ORDER BY created_at DESC',
      [dreamId],
    )
  }

  async create(input: { dream_id: string; email: string }): Promise<Comic> {
    const now = new Date().toISOString()
    const comic: Comic = {
      id: generateId(),
      dream_id: input.dream_id,
      email: input.email,
      status: 'pending',
      created_at: now,
    }
    await appendSheetRow('comics', [[
      comic.id, comic.dream_id, comic.email, comic.status, '', comic.created_at, '',
    ]])
    await query(
      'INSERT INTO comics (id, dream_id, email, status, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [comic.id, comic.dream_id, comic.email, comic.status, '', comic.created_at, ''],
    )
    return comic
  }

  async updateStatus(id: string, status: ComicStatus, imageUrl?: string): Promise<Comic> {
    const rows = await fetchSheetAsRows('comics')
    if (rows.length < 2) throw new Error('Comic not found')
    const headers = rows[0]
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
    if (rowIdx === -1) throw new Error('Comic not found')
    const now = new Date().toISOString()
    const newValues = [...rows[rowIdx]]
    const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
    const statusCol = colIndex('status')
    if (statusCol !== -1) newValues[statusCol] = status
    if (imageUrl !== undefined) {
      const urlCol = colIndex('image_url')
      if (urlCol !== -1) newValues[urlCol] = imageUrl
    }
    const updatedAtCol = colIndex('updated_at')
    if (updatedAtCol !== -1) newValues[updatedAtCol] = now
    await updateSheetRow('comics', rowIdx + 1, newValues)

    const updateFields = ["status = ?", "updated_at = ?"]
    const updateValues: unknown[] = [status, now]
    if (imageUrl !== undefined) {
      updateFields.push("image_url = ?")
      updateValues.push(imageUrl)
    }
    updateValues.push(id)
    await query(`UPDATE comics SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    const comic: Comic = {
      id: newValues[colIndex('id')] || id,
      dream_id: newValues[colIndex('dream_id')] || '',
      email: newValues[colIndex('email')] || '',
      status: (newValues[colIndex('status')] as ComicStatus) || 'pending',
      image_url: newValues[colIndex('image_url')] || undefined,
      created_at: newValues[colIndex('created_at')] || '',
      updated_at: newValues[colIndex('updated_at')] || undefined,
    }
    return comic
  }
}
