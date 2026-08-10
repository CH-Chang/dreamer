import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../../shared/types/category'
import type { ICategoryRepository } from '../../../../shared/interfaces/ICategoryRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class CategoryRepository implements ICategoryRepository {
  async findAll(email: string): Promise<Category[]> {
    return query<Category>('SELECT * FROM categories WHERE email = ? ORDER BY sort_order ASC', [email])
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString()
    const existing = await query<{ max_order: number }>('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM categories WHERE email = ?', [input.email])
      .catch(() => [{ max_order: 0 }])
    const sortOrder = (existing[0]?.max_order ?? 0) + 1
    const category: Category = {
      id: generateId(),
      name: input.name,
      color: input.color,
      icon: input.icon,
      email: input.email,
      sort_order: sortOrder,
      created_at: now,
    }
    try {
      await appendSheetRow('categories', [[
        category.id, category.name, category.color, category.icon,
        category.email, String(category.sort_order), category.created_at,
      ]])
    } catch {
      // Sheets offline
    }
    await query(
      'INSERT INTO categories (id, name, color, icon, email, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category.id, category.name, category.color, category.icon, category.email, category.sort_order, category.created_at],
    )
    return category
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const updateFields: string[] = []
    const updateValues: unknown[] = []
    if (data.name !== undefined) { updateFields.push('name = ?'); updateValues.push(data.name) }
    if (data.color !== undefined) { updateFields.push('color = ?'); updateValues.push(data.color) }
    if (data.icon !== undefined) { updateFields.push('icon = ?'); updateValues.push(data.icon) }
    if (data.sort_order !== undefined) { updateFields.push('sort_order = ?'); updateValues.push(data.sort_order) }
    if (updateFields.length > 0) {
      updateValues.push(id)
      await query(`UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`, updateValues)
    }

    try {
      const rows = await fetchSheetAsRows('categories')
      if (rows.length >= 2) {
        const headers = rows[0]
        const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
        if (rowIdx !== -1) {
          const newValues = [...rows[rowIdx]]
          const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
          if (data.name !== undefined) newValues[colIndex('name')] = data.name
          if (data.color !== undefined) newValues[colIndex('color')] = data.color
          if (data.icon !== undefined) newValues[colIndex('icon')] = data.icon
          if (data.sort_order !== undefined) newValues[colIndex('sort_order')] = String(data.sort_order)
          await updateSheetRow('categories', rowIdx + 1, newValues)
        }
      }
    } catch {
      // Sheets offline
    }

    const categories = await query<Category>('SELECT * FROM categories WHERE id = ?', [id])
    if (categories.length === 0) throw new Error('Category not found')
    return categories[0]
  }

  async delete(id: string): Promise<void> {
    try {
      const rows = await fetchSheetAsRows('categories')
      if (rows.length >= 2) {
        const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
        if (rowIdx !== -1) {
          await updateSheetRow('categories', rowIdx + 1, rows[rowIdx].map(() => ''))
        }
      }
    } catch {
      // Sheets offline
    }
    await query('DELETE FROM categories WHERE id = ?', [id])
  }
}
