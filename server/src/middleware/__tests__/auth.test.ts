import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { OAuth2Client } from 'google-auth-library'
import { authMiddleware, type AuthEnv } from '../auth'

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 if Authorization header is missing', async () => {
    const app = new Hono<AuthEnv>()
    app.use('/protected', authMiddleware)
    app.get('/protected', (c) => c.text('secret'))

    const res = await app.request('/protected')
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Missing or invalid Authorization header' })
  })

  it('returns 401 if Authorization header does not start with Bearer', async () => {
    const app = new Hono<AuthEnv>()
    app.use('/protected', authMiddleware)
    app.get('/protected', (c) => c.text('secret'))

    const res = await app.request('/protected', {
      headers: { Authorization: 'Basic 12345' },
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Missing or invalid Authorization header' })
  })

  it('returns 401 if Authorization header token is empty', async () => {
    const app = new Hono<AuthEnv>()
    app.use('/protected', authMiddleware)
    app.get('/protected', (c) => c.text('secret'))

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer ' },
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Missing or invalid Authorization header' })
  })

  it('returns 401 if token verification fails', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValueOnce(
      new Error('Invalid token')
    )

    const app = new Hono<AuthEnv>()
    app.use('/protected', authMiddleware)
    app.get('/protected', (c) => c.text('secret'))

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized: Invalid token' })
  })

  it('returns 401 if payload is missing email', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
      getPayload: () => ({
        name: 'No Email User',
      }),
    } as any)

    const app = new Hono<AuthEnv>()
    app.use('/protected', authMiddleware)
    app.get('/protected', (c) => c.text('secret'))

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer token-without-email' },
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized: Invalid token' })
  })

  it('sets user in context and calls handler when token is valid', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
      getPayload: () => ({
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      }),
    } as any)

    const app = new Hono<AuthEnv>()
    app.use('/protected', authMiddleware)
    app.get('/protected', (c) => {
      const user = c.get('user')
      return c.json({ user })
    })

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({
      user: {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      },
    })
  })
})
