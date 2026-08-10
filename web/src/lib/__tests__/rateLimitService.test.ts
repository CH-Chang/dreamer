import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as alaSqlService from '../alaSqlService'
import * as factory from '../../repositories/factory'

vi.mock('../alaSqlService', async () => {
  const actual = await vi.importActual('../alaSqlService')
  return {
    ...actual,
    query: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
  }
})

vi.mock('../../repositories/factory', async () => {
  const actual = await vi.importActual('../../repositories/factory')
  return {
    ...actual,
    getRateLimitRepository: vi.fn(),
  }
})

const mockQuery = vi.mocked(alaSqlService.query)
const mockGetRepo = vi.mocked(factory.getRateLimitRepository)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rateLimitService', () => {
  describe('getUsage', () => {
    it('returns daily and monthly counts excluding failed records', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 3 }])
        .mockResolvedValueOnce([{ cnt: 15 }])
      const { rateLimitService } = await import('../rateLimitService')
      const usage = await rateLimitService.getUsage('a@b.com', 'video')
      expect(usage).toEqual({ daily: 3, monthly: 15 })
      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("status != 'failed' AND strftime('%Y-%m-%d', created_at) = strftime('%Y-%m-%d', 'now')"),
        ['a@b.com'],
      )
    })

    it('queries comics table for comic type', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([{ cnt: 5 }])
      const { rateLimitService } = await import('../rateLimitService')
      const usage = await rateLimitService.getUsage('a@b.com', 'comic')
      expect(usage).toEqual({ daily: 1, monthly: 5 })
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM comics'),
        ['a@b.com'],
      )
    })
  })

  describe('getLimit', () => {
    it('returns user-specific limit when exists', async () => {
      const mockRepo = {
        findByTypeAndScope: vi.fn().mockResolvedValue({ daily_limit: 10, monthly_limit: 50 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      const limit = await rateLimitService.getLimit('a@b.com', 'video')
      expect(limit).toEqual({ daily: 10, monthly: 50 })
      expect(mockRepo.findByTypeAndScope).toHaveBeenCalledWith('video', 'a@b.com')
    })

    it('falls back to system limit when no user override', async () => {
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      const limit = await rateLimitService.getLimit('a@b.com', 'video')
      expect(limit).toEqual({ daily: 5, monthly: 30 })
      expect(mockRepo.findByTypeAndScope).toHaveBeenNthCalledWith(1, 'video', 'a@b.com')
      expect(mockRepo.findByTypeAndScope).toHaveBeenNthCalledWith(2, 'video', 'system')
    })

    it('returns hardcoded defaults when no limit exists at all', async () => {
      const mockRepo = {
        findByTypeAndScope: vi.fn().mockResolvedValue(null),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      const videoLimit = await rateLimitService.getLimit('a@b.com', 'video')
      expect(videoLimit).toEqual({ daily: 5, monthly: 30 })
      const comicLimit = await rateLimitService.getLimit('a@b.com', 'comic')
      expect(comicLimit).toEqual({ daily: 10, monthly: 60 })
    })
  })

  describe('checkAndThrow', () => {
    it('passes when usage is under limits', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 2 }])
        .mockResolvedValueOnce([{ cnt: 10 }])
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      await expect(rateLimitService.checkAndThrow('a@b.com', 'video')).resolves.toBeUndefined()
    })

    it('throws when daily limit exceeded', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 5 }])
        .mockResolvedValueOnce([{ cnt: 10 }])
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService, RateLimitError } = await import('../rateLimitService')
      await expect(rateLimitService.checkAndThrow('a@b.com', 'video')).rejects.toThrow(RateLimitError)
    })

    it('throws when monthly limit exceeded', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 2 }])
        .mockResolvedValueOnce([{ cnt: 30 }])
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService, RateLimitError } = await import('../rateLimitService')
      await expect(rateLimitService.checkAndThrow('a@b.com', 'video')).rejects.toThrow(RateLimitError)
    })
  })
})
