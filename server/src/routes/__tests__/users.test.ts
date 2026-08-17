import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../../index'

const mockFindByEmail = vi.fn()
const mockFindCount = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../../repositories/factory', () => ({
  getUserRepository: () => ({
    findByEmail: mockFindByEmail,
    findCount: mockFindCount,
    create: mockCreate,
    update: mockUpdate,
  }),
}))

vi.mock('google-auth-library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('google-auth-library')>()
  return {
    ...actual,
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        }),
      }),
    })),
  }
})

describe('Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/users/me returns profile and authUser with valid auth', async () => {
    mockFindByEmail.mockResolvedValue({
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      role: 'user',
      language: 'zh-TW',
    })
    const res = await app.request('/api/users/me', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data.user.email).toBe('test@example.com')
    expect(data.authUser.email).toBe('test@example.com')
  })

  it('GET /api/users/count returns user count', async () => {
    mockFindCount.mockResolvedValue(5)
    const res = await app.request('/api/users/count')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ count: 5 })
  })

  it('GET /api/users/:email returns user profile when exists', async () => {
    mockFindByEmail.mockResolvedValue({
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      role: 'user',
    })
    const res = await app.request('/api/users/test%40example.com')
    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data.email).toBe('test@example.com')
  })

  it('PUT /api/users/:email updates user profile with valid auth', async () => {
    mockFindByEmail
      .mockResolvedValueOnce({
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/old.jpg',
        role: 'user',
        language: 'zh-TW',
      })
      .mockResolvedValueOnce({
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'drive://new-avatar-id',
        role: 'user',
        language: 'en-US',
      })

    mockUpdate.mockResolvedValue(undefined)

    const res = await app.request('/api/users/test%40example.com', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-test-token',
      },
      body: JSON.stringify({
        avatar_url: 'drive://new-avatar-id',
        language: 'en-US',
      }),
    })

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith('test@example.com', expect.objectContaining({
      avatar_url: 'drive://new-avatar-id',
      language: 'en-US',
    }))
  })
})
