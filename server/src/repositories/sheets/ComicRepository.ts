import type { Comic, ComicStatus } from '../../../../shared/types/comic'
import type { IComicRepository } from '../../../../shared/interfaces/IComicRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class ComicRepository implements IComicRepository {
  async findAllByDreamId(dreamId: string): Promise<Comic[]> {
    if (!dreamId) {
      return query<Comic>('SELECT * FROM comics ORDER BY created_at DESC')
    }
    return query<Comic>(
      'SELECT * FROM comics WHERE dream_id = ? ORDER BY created_at DESC',
      [dreamId],
    )
  }

  async create(input: { dream_id: string; email: string; with_character?: boolean }): Promise<Comic> {
    const now = new Date().toISOString()
    const withCharacter = input.with_character ?? false
    const comic: Comic = {
      id: generateId(),
      dream_id: input.dream_id,
      email: input.email,
      status: 'pending',
      with_character: withCharacter,
      created_at: now,
    }
    try {
      await appendSheetRow('comics', [[
        comic.id, comic.dream_id, comic.email, comic.status, '', withCharacter ? 'TRUE' : 'FALSE', comic.created_at, '',
      ]])
    } catch {
      // Sheets offline
    }
    await query(
      'INSERT INTO comics (id, dream_id, email, status, image_url, with_character, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [comic.id, comic.dream_id, comic.email, comic.status, '', withCharacter, comic.created_at, ''],
    )
    return comic
  }

  async updateStatus(id: string, status: ComicStatus, imageUrl?: string): Promise<Comic> {
    const now = new Date().toISOString()
    const updateFields = ["status = ?", "updated_at = ?"]
    const updateValues: unknown[] = [status, now]
    if (imageUrl !== undefined) {
      updateFields.push("image_url = ?")
      updateValues.push(imageUrl)
    }
    updateValues.push(id)
    await query(`UPDATE comics SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    try {
      const rows = await fetchSheetAsRows('comics')
      if (rows.length >= 2) {
        const headers = rows[0]
        const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
        if (rowIdx !== -1) {
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
        }
      }
    } catch {
      // Sheets offline
    }

    const comics = await query<Comic>('SELECT * FROM comics WHERE id = ?', [id])
    if (comics.length === 0) throw new Error('Comic not found')
    return comics[0]
  }
}
