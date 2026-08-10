import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as factory from '../../repositories/factory'

vi.mock('../../repositories/factory', async () => {
  const actual = await vi.importActual('../../repositories/factory')
  return {
    ...actual,
    getRateLimitRepository: vi.fn(),
  }
})

const mockGetRepo = vi.mocked(factory.getRateLimitRepository)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rateLimitService', () => {
  it('returns rate limit for video', async () => {
    const mockRepo = {
      findByTypeAndScope: vi.fn().mockResolvedValue({ daily_limit: 10, monthly_limit: 50 }),
    }
    mockGetRepo.mockReturnValue(mockRepo as any)

    const { rateLimitService } = await import('../rateLimitService')
    const limit = await rateLimitService.getLimit('user@test.com', 'video')

    expect(limit).toEqual({ daily: 10, monthly: 50 })
    expect(mockRepo.findByTypeAndScope).toHaveBeenCalledWith('video', 'user@test.com')
  })
})
