import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as factory from '../../repositories/factory'

vi.mock('../../repositories/factory', async () => {
  const actual = await vi.importActual('../../repositories/factory')
  return {
    ...actual,
    getDreamRepository: vi.fn(),
  }
})

const mockGetRepo = vi.mocked(factory.getDreamRepository)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('searchDreams', () => {
  it('filters by text in title and description', async () => {
    const mockRepo = {
      findAllByEmail: vi.fn().mockResolvedValue([
        { id: '1', email: 'a@b.com', date: '2025-01-01', title: '天空之旅', description: '在雲端', tags: [], created_at: '', updated_at: '', visibility: 'private' },
        { id: '2', email: 'a@b.com', date: '2025-01-02', title: '海洋', description: '潛水到深處', tags: [], created_at: '', updated_at: '', visibility: 'private' },
      ]),
    }
    mockGetRepo.mockReturnValue(mockRepo as any)

    const { searchDreams } = await import('../searchService')
    const results = await searchDreams({ tags: [], since: '', to: '', text: '天空' }, 'a@b.com')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })

  it('filters by since date', async () => {
    const mockRepo = {
      findAllByEmail: vi.fn().mockResolvedValue([
        { id: '1', email: 'a@b.com', date: '2025-01-01', title: '', description: 'a', tags: [], created_at: '', updated_at: '', visibility: 'private' },
        { id: '2', email: 'a@b.com', date: '2025-02-01', title: '', description: 'b', tags: [], created_at: '', updated_at: '', visibility: 'private' },
      ]),
    }
    mockGetRepo.mockReturnValue(mockRepo as any)

    const { searchDreams } = await import('../searchService')
    const results = await searchDreams({ tags: [], since: '2025-02-01', to: '', text: '' }, 'a@b.com')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('2')
  })

  it('filters by to date', async () => {
    const mockRepo = {
      findAllByEmail: vi.fn().mockResolvedValue([
        { id: '1', email: 'a@b.com', date: '2025-01-01', title: '', description: 'a', tags: [], created_at: '', updated_at: '', visibility: 'private' },
        { id: '2', email: 'a@b.com', date: '2025-02-01', title: '', description: 'b', tags: [], created_at: '', updated_at: '', visibility: 'private' },
      ]),
    }
    mockGetRepo.mockReturnValue(mockRepo as any)

    const { searchDreams } = await import('../searchService')
    const results = await searchDreams({ tags: [], since: '', to: '2025-01-01', text: '' }, 'a@b.com')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })
})
