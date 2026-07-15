import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Dream } from '../../types/dream'
import type { User } from '../../types/user'
import type { Video } from '../../types/video'
import type { Comic } from '../../types/comic'
import { FeedService } from '../feedService'

vi.mock('../../repositories/factory', () => ({
  getDreamRepository: () => mockRepo,
  getUserRepository: () => mockUserRepo,
  getVideoRepository: () => mockVideoRepo,
  getComicRepository: () => mockComicRepo,
}))

const mockRepo = {
  findPublicPage: vi.fn(),
}
const mockUserRepo = {
  findByEmail: vi.fn(),
}
const mockVideoRepo = {
  findAllByDreamId: vi.fn(),
}
const mockComicRepo = {
  findAllByDreamId: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FeedService', () => {
  it('returns feed items from public dreams', async () => {
    const dream: Dream = {
      id: 'dream-1', email: 'a@b.com', date: '2026-07-15',
      description: 'A wonderful dream', title: 'My Dream',
      tags: [], visibility: 'public', edit_log: '',
      created_at: '2026-07-15T10:00:00Z', updated_at: '',
    }
    const user: User = {
      email: 'a@b.com', name: 'Alice', avatar_url: 'https://example.com/avatar.png', role: 'user', created_at: '',
    }
    const video: Video = {
      id: 'vid-1', dream_id: 'dream-1', email: 'a@b.com',
      status: 'done', video_url: 'drive://file123', created_at: '', updated_at: '',
    }
    const comic: Comic = {
      id: 'comic-1', dream_id: 'dream-1', email: 'a@b.com',
      status: 'done', image_url: 'drive://file456', created_at: '', updated_at: '',
    }

    mockRepo.findPublicPage.mockResolvedValue({ items: [dream], nextCursor: undefined })
    mockVideoRepo.findAllByDreamId.mockResolvedValue([video])
    mockComicRepo.findAllByDreamId.mockResolvedValue([comic])
    mockUserRepo.findByEmail.mockResolvedValue(user)

    const service = new FeedService()
    const result = await service.findPublicPage()

    expect(result.items).toHaveLength(2)
    expect(result.items[0].type).toBe('video')
    expect(result.items[0].mediaUrl).toBe('drive://file123')
    expect(result.items[0].author.name).toBe('Alice')
    expect(result.items[1].type).toBe('comic')
    expect(result.items[1].mediaUrl).toBe('drive://file456')
  })

  it('returns empty when no public dreams', async () => {
    mockRepo.findPublicPage.mockResolvedValue({ items: [], nextCursor: undefined })
    const service = new FeedService()
    const result = await service.findPublicPage()
    expect(result.items).toEqual([])
  })

  it('skips dreams with no done media', async () => {
    const dream: Dream = {
      id: 'dream-1', email: 'a@b.com', date: '2026-07-15',
      description: 'd', title: '', tags: [], visibility: 'public',
      edit_log: '', created_at: '2026-07-15T10:00:00Z', updated_at: '',
    }
    mockRepo.findPublicPage.mockResolvedValue({ items: [dream], nextCursor: undefined })
    mockVideoRepo.findAllByDreamId.mockResolvedValue([])
    mockComicRepo.findAllByDreamId.mockResolvedValue([])
    mockUserRepo.findByEmail.mockResolvedValue(null)

    const service = new FeedService()
    const result = await service.findPublicPage()
    expect(result.items).toEqual([])
  })

  it('passes cursor through', async () => {
    mockRepo.findPublicPage.mockResolvedValue({ items: [], nextCursor: '2026-07-14T10:00:00Z' })
    const service = new FeedService()
    const result = await service.findPublicPage('some-cursor')
    expect(mockRepo.findPublicPage).toHaveBeenCalledWith('some-cursor', 10)
    expect(result.nextCursor).toBe('2026-07-14T10:00:00Z')
  })
})
