import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as alaSqlService from '../alaSqlService'

vi.mock('../alaSqlService', async () => {
  const actual = await vi.importActual('../alaSqlService')
  return {
    ...actual,
    query: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
  }
})

const mockQuery = vi.mocked(alaSqlService.query)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('searchDreams', () => {
  it('filters by text in title and description', async () => {
    const { searchDreams } = await import('../searchService')
    mockQuery.mockResolvedValue([
      { id: '1', email: 'a@b.com', date: '2025-01-01', title: '天空之旅', description: '在雲端', tags: '[]', created_at: '', updated_at: '' },
      { id: '2', email: 'a@b.com', date: '2025-01-02', title: '海洋', description: '潛水到深處', tags: '[]', created_at: '', updated_at: '' },
    ])
    const results = await searchDreams({ tags: [], since: '', to: '', text: '天空' }, 'a@b.com')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })

  it('filters by since date', async () => {
    const { searchDreams } = await import('../searchService')
    mockQuery.mockResolvedValue([
      { id: '1', email: 'a@b.com', date: '2025-01-01', title: '', description: 'a', tags: '[]', created_at: '', updated_at: '' },
      { id: '2', email: 'a@b.com', date: '2025-02-01', title: '', description: 'b', tags: '[]', created_at: '', updated_at: '' },
    ])
    const results = await searchDreams({ tags: [], since: '2025-02-01', to: '', text: '' }, 'a@b.com')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('2')
  })

  it('filters by to date', async () => {
    const { searchDreams } = await import('../searchService')
    mockQuery.mockResolvedValue([
      { id: '1', email: 'a@b.com', date: '2025-01-01', title: '', description: 'a', tags: '[]', created_at: '', updated_at: '' },
      { id: '2', email: 'a@b.com', date: '2025-02-01', title: '', description: 'b', tags: '[]', created_at: '', updated_at: '' },
    ])
    const results = await searchDreams({ tags: [], since: '', to: '2025-01-01', text: '' }, 'a@b.com')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })

  it('returns empty when tag name does not match any category', async () => {
    const { searchDreams } = await import('../searchService')
    mockQuery
      .mockResolvedValueOnce([
        { id: '1', email: 'a@b.com', date: '2025-01-01', title: '', description: 'a', tags: '["cat1"]', created_at: '', updated_at: '' },
      ])
      .mockResolvedValueOnce([])
    const results = await searchDreams({ tags: ['nonexistent'], since: '', to: '', text: '' }, 'a@b.com')
    expect(results).toHaveLength(0)
  })

  it('filters by tag id match', async () => {
    const { searchDreams } = await import('../searchService')
    mockQuery
      .mockResolvedValueOnce([
        { id: '1', email: 'a@b.com', date: '2025-01-01', title: '', description: 'a', tags: '["cat1","cat2"]', created_at: '', updated_at: '' },
        { id: '2', email: 'a@b.com', date: '2025-01-02', title: '', description: 'b', tags: '["cat3"]', created_at: '', updated_at: '' },
      ])
      .mockResolvedValueOnce([{ id: 'cat1', name: '旅行' }])
    const results = await searchDreams({ tags: ['旅行'], since: '', to: '', text: '' }, 'a@b.com')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })
})
