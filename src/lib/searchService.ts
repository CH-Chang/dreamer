import type { Dream } from '../types/dream'
import type { SearchQuery } from './searchParser'
import { query as queryDb } from './alaSqlService'

export async function searchDreams(query: SearchQuery, email: string): Promise<Dream[]> {
  let dreams = await queryDb<Dream & { tags: string }>(
    'SELECT * FROM dreams WHERE email = ? ORDER BY date DESC',
    [email],
  )

  if (query.tags.length > 0) {
    const catRows = await queryDb<{ id: string; name: string }>(
      'SELECT id, name FROM categories WHERE name IN (' + query.tags.map(() => '?').join(',') + ')',
      query.tags,
    )
    const catIds = catRows.map((r) => r.id)
    if (catIds.length > 0) {
      dreams = dreams.filter((d) => {
        try {
          const tagIds: string[] = JSON.parse((d as any).tags || '[]')
          return tagIds.some((id) => catIds.includes(id))
        } catch {
          return false
        }
      })
    }
  }

  if (query.since) {
    dreams = dreams.filter((d) => d.date >= query.since)
  }

  if (query.to) {
    dreams = dreams.filter((d) => d.date <= query.to)
  }

  if (query.text) {
    const lower = query.text.toLowerCase()
    dreams = dreams.filter((d) =>
      (d.title || '').toLowerCase().includes(lower) ||
      d.description.toLowerCase().includes(lower),
    )
  }

  return dreams
}
