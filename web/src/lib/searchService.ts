import type { Dream } from '../../../shared/types/dream'
import type { SearchQuery } from './searchParser'
import { getDreamRepository } from '../repositories/factory'

export async function searchDreams(query: SearchQuery, email: string): Promise<Dream[]> {
  const repo = getDreamRepository()
  let dreams = await repo.findAllByEmail(email)

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
