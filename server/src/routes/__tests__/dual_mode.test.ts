import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../../index'
import { setRateLimitRepository, setVideoRepository, setComicRepository, setDreamRepository } from '../../repositories/factory'
import type { IRateLimitRepository } from '../../../../shared/interfaces/IRateLimitRepository'

// Mock Google Auth Library
vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: class {
      async verifyIdToken({ idToken }: { idToken: string }) {
        if (idToken === 'valid-token') {
          return {
            getPayload: () => ({
              email: 'test@example.com',
              name: 'Test User',
              picture: 'http://example.com/avatar.jpg',
            }),
          }
        }
        throw new Error('Invalid token')
      }
    },
    GoogleAuth: class {
      async getClient() {
        return {
          getAccessToken: async () => ({ token: 'mock-token' }),
        }
      }
    },
  }
})

// Mock AI Service calls
vi.mock('../../services/aiService', () => {
  return {
    triggerVeoVideo: vi.fn().mockResolvedValue({ name: 'operations/op-123' }),
    pollVeoOperation: vi.fn().mockResolvedValue({ bytesBase64Encoded: 'fakebase64', mimeType: 'video/mp4' }),
    generateComicImage: vi.fn().mockResolvedValue({ bytesBase64Encoded: 'fakebase64', mimeType: 'image/png' }),
    generateTitleSuggestions: vi.fn().mockResolvedValue(['Title 1', 'Title 2', 'Title 3']),
  }
})

describe('Dual-Mode Backend Proxy & Rate Limiting', () => {
  let mockRateLimitRepo: IRateLimitRepository

  beforeEach(() => {
    mockRateLimitRepo = {
      findByTypeAndScope: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async (input) => ({ id: '1', ...input, created_at: '' })),
      update: vi.fn().mockImplementation(async (id, input) => ({ id, type: 'video', scope: 'system', daily_limit: 10, monthly_limit: 100, created_at: '', ...input })),
      delete: vi.fn().mockResolvedValue(undefined),
      checkLimit: vi.fn().mockResolvedValue(true),
    }
    setRateLimitRepository(mockRateLimitRepo)

    setDreamRepository({
      findById: vi.fn().mockResolvedValue({ id: 'dream-1', description: 'Sample dream' }),
      findAllByEmail: vi.fn().mockResolvedValue([]),
      findByDate: vi.fn().mockResolvedValue(null),
      findByMonth: vi.fn().mockResolvedValue([]),
      findPublicPage: vi.fn().mockResolvedValue({ items: [] }),
      create: vi.fn().mockResolvedValue({ id: 'dream-1' } as any),
      update: vi.fn().mockResolvedValue({ id: 'dream-1' } as any),
      delete: vi.fn().mockResolvedValue(undefined),
    })

    setVideoRepository({
      findByDreamId: vi.fn().mockResolvedValue(null),
      findAllByDreamId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async (input) => ({ id: 'video-1', ...input, status: 'pending', created_at: '' })),
      updateStatus: vi.fn().mockImplementation(async (id, status, video_url) => ({ id, status, video_url })),
    })

    setComicRepository({
      findAllByDreamId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async (input) => ({ id: 'comic-1', ...input, status: 'pending', created_at: '' })),
      updateStatus: vi.fn().mockImplementation(async (id, status, image_url) => ({ id, status, image_url })),
    })
  })

  describe('POST /api/videos dual-mode', () => {
    it('bypasses rate limit when mode is custom', async () => {
      vi.spyOn(mockRateLimitRepo, 'checkLimit').mockResolvedValue(false) // rate limit exceeded if checked

      const res = await app.request('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          dream_id: 'dream-1',
          mode: 'custom',
          custom_gcp_project_id: 'user-project-123',
        }),
      })

      expect(res.status).toBe(201)
      expect(mockRateLimitRepo.checkLimit).not.toHaveBeenCalled()
    })

    it('performs rate limit check when mode is system and returns 429 when exceeded', async () => {
      vi.spyOn(mockRateLimitRepo, 'checkLimit').mockResolvedValue(false)

      const res = await app.request('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          dream_id: 'dream-1',
          mode: 'system',
        }),
      })

      expect(res.status).toBe(429)
      const json = await res.json() as { error: string }
      expect(json.error).toBe('Rate limit exceeded')
      expect(mockRateLimitRepo.checkLimit).toHaveBeenCalledWith('test@example.com', 'video')
    })
  })

  describe('POST /api/comics dual-mode', () => {
    it('bypasses rate limit when mode is custom', async () => {
      vi.spyOn(mockRateLimitRepo, 'checkLimit').mockResolvedValue(false)

      const res = await app.request('/api/comics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          dream_id: 'dream-1',
          mode: 'custom',
          custom_gcp_project_id: 'user-project-123',
        }),
      })

      expect(res.status).toBe(201)
      expect(mockRateLimitRepo.checkLimit).not.toHaveBeenCalled()
    })

    it('performs rate limit check when mode is system and returns 429 when exceeded', async () => {
      vi.spyOn(mockRateLimitRepo, 'checkLimit').mockResolvedValue(false)

      const res = await app.request('/api/comics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          dream_id: 'dream-1',
          mode: 'system',
        }),
      })

      expect(res.status).toBe(429)
      const json = await res.json() as { error: string }
      expect(json.error).toBe('Rate limit exceeded')
      expect(mockRateLimitRepo.checkLimit).toHaveBeenCalledWith('test@example.com', 'comic')
    })
  })
})
