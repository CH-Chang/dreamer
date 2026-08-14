import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../../index'
import { setRateLimitRepository, setVideoRepository, setComicRepository, setDreamRepository } from '../../repositories/factory'
import { generateComicImage, triggerVeoVideo, generateTitleSuggestions } from '../../services/aiService'

let mockUserLanguage: string | undefined = undefined

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
              language: mockUserLanguage,
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

vi.mock('../../services/aiService', () => {
  return {
    triggerVeoVideo: vi.fn().mockResolvedValue({ name: 'operations/op-123' }),
    pollVeoOperation: vi.fn().mockResolvedValue({ bytesBase64Encoded: 'fakebase64', mimeType: 'video/mp4' }),
    generateComicImage: vi.fn().mockResolvedValue({ bytesBase64Encoded: 'fakebase64', mimeType: 'image/png' }),
    generateTitleSuggestions: vi.fn().mockResolvedValue(['夢境標題 1', '夢境標題 2', '夢境標題 3']),
  }
})

describe('Server Route Prompt Localization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserLanguage = undefined

    setRateLimitRepository({
      findByTypeAndScope: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async (input) => ({ id: '1', ...input, created_at: '' })),
      update: vi.fn().mockImplementation(async (id, input) => ({ id, type: 'video', scope: 'system', daily_limit: 10, monthly_limit: 100, created_at: '', ...input })),
      delete: vi.fn().mockResolvedValue(undefined),
      checkLimit: vi.fn().mockResolvedValue(true),
    })

    setDreamRepository({
      findById: vi.fn().mockResolvedValue({ id: 'dream-1', description: 'Walking on Mars' }),
      findAllByEmail: vi.fn().mockResolvedValue([]),
      findByDate: vi.fn().mockResolvedValue(null),
      findByMonth: vi.fn().mockResolvedValue([]),
      findPublicPage: vi.fn().mockResolvedValue({ items: [] }),
      create: vi.fn().mockImplementation(async (input) => ({ id: 'dream-1', ...input })),
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

  describe('POST /api/comics prompt localization', () => {
    it('uses Traditional Chinese prefix by default when language is unset or zh-TW', async () => {
      mockUserLanguage = undefined
      const res = await app.request('/api/comics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ dream_id: 'dream-1' }),
      })

      expect(res.status).toBe(201)
      expect(generateComicImage).toHaveBeenCalledWith(
        '夢境連環漫畫插畫風格：Walking on Mars',
        undefined,
        expect.anything()
      )
    })

    it('uses English prefix when user language is en-US', async () => {
      mockUserLanguage = 'en-US'
      const res = await app.request('/api/comics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ dream_id: 'dream-1' }),
      })

      expect(res.status).toBe(201)
      expect(generateComicImage).toHaveBeenCalledWith(
        'Dream comic illustration style: Walking on Mars',
        undefined,
        expect.anything()
      )
    })

    it('uses Simplified Chinese prefix when user language is zh-CN', async () => {
      mockUserLanguage = 'zh-CN'
      const res = await app.request('/api/comics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ dream_id: 'dream-1' }),
      })

      expect(res.status).toBe(201)
      expect(generateComicImage).toHaveBeenCalledWith(
        '梦境连环漫画插画风格：Walking on Mars',
        undefined,
        expect.anything()
      )
    })
  })

  describe('POST /api/videos prompt localization', () => {
    it('uses Traditional Chinese prefix by default when language is unset or zh-TW', async () => {
      mockUserLanguage = undefined
      const res = await app.request('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ dream_id: 'dream-1' }),
      })

      expect(res.status).toBe(201)
      expect(triggerVeoVideo).toHaveBeenCalledWith(
        '夢境般唯美電影鏡頭場景：Walking on Mars',
        expect.anything()
      )
    })

    it('uses English prefix when user language is en-US', async () => {
      mockUserLanguage = 'en-US'
      const res = await app.request('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ dream_id: 'dream-1' }),
      })

      expect(res.status).toBe(201)
      expect(triggerVeoVideo).toHaveBeenCalledWith(
        'Dream-like cinematic scene: Walking on Mars',
        expect.anything()
      )
    })
  })

  describe('POST /api/dreams candidate title generation', () => {
    it('calls generateTitleSuggestions upon dream creation if candidates not provided', async () => {
      const res = await app.request('/api/dreams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          date: '2026-08-14',
          description: 'A vivid dream about neon dragons',
        }),
      })

      expect(res.status).toBe(201)
      expect(generateTitleSuggestions).toHaveBeenCalledWith(
        'A vivid dream about neon dragons',
        { token: 'valid-token' }
      )
    })
  })
})
