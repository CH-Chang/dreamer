import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../../index'
import { setDreamRepository } from '../../repositories/factory'
import type { IDreamRepository } from '../../../../shared/interfaces/IDreamRepository'
import type { Dream } from '../../../../shared/types/dream'

// Mock Google Auth Library using ES class syntax
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
  }
})

describe('Dreams Routes', () => {
  const mockDream: Dream = {
    id: 'dream-1',
    email: 'test@example.com',
    date: '2026-08-10',
    description: 'A flying dream',
    title: 'Flying High',
    tags: ['flying', 'sky'],
    visibility: 'public',
    created_at: '2026-08-10T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
  }

  let mockRepo: IDreamRepository

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn().mockImplementation(async (id: string) => (id === 'dream-1' ? mockDream : null)),
      findAllByEmail: vi.fn().mockImplementation(async () => [mockDream]),
      findByDate: vi.fn().mockImplementation(async () => mockDream),
      findByMonth: vi.fn().mockImplementation(async () => [mockDream]),
      findPublicPage: vi.fn().mockImplementation(async () => ({ items: [mockDream] })),
      create: vi.fn().mockImplementation(async (input) => ({ ...mockDream, ...input, id: 'new-dream-id' })),
      update: vi.fn().mockImplementation(async (id, input) => ({ ...mockDream, ...input, id })),
      delete: vi.fn().mockImplementation(async () => {}),
    }
    setDreamRepository(mockRepo)
  })

  it('GET /api/dreams returns public page by default', async () => {
    const res = await app.request('/api/dreams')
    expect(res.status).toBe(200)
    const json = await res.json() as { items: Dream[] }
    expect(json).toEqual({ items: [mockDream] })
    expect(mockRepo.findPublicPage).toHaveBeenCalled()
  })

  it('GET /api/dreams?email=test@example.com returns user dreams', async () => {
    const res = await app.request('/api/dreams?email=test@example.com')
    expect(res.status).toBe(200)
    const json = await res.json() as Dream[]
    expect(json).toEqual([mockDream])
    expect(mockRepo.findAllByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('GET /api/dreams/:id returns dream by id', async () => {
    const res = await app.request('/api/dreams/dream-1')
    expect(res.status).toBe(200)
    const json = await res.json() as Dream
    expect(json).toEqual(mockDream)
  })

  it('GET /api/dreams/:id returns 404 if dream not found', async () => {
    const res = await app.request('/api/dreams/non-existent')
    expect(res.status).toBe(404)
    const json = await res.json() as { error: string }
    expect(json).toEqual({ error: 'Dream not found' })
  })

  it('POST /api/dreams returns 401 without auth header', async () => {
    const res = await app.request('/api/dreams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-08-10', description: 'New dream' }),
    })
    expect(res.status).toBe(401)
  })

  it('POST /api/dreams creates dream with valid auth', async () => {
    const res = await app.request('/api/dreams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ date: '2026-08-10', description: 'New dream' }),
    })
    expect(res.status).toBe(201)
    const json = await res.json() as Dream
    expect(json.description).toBe('New dream')
    expect(json.email).toBe('test@example.com')
  })

  it('PUT /api/dreams/:id updates dream with valid auth', async () => {
    const res = await app.request('/api/dreams/dream-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ title: 'Updated Title' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json() as Dream
    expect(json.title).toBe('Updated Title')
  })

  it('DELETE /api/dreams/:id deletes dream with valid auth', async () => {
    const res = await app.request('/api/dreams/dream-1', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json() as { success: boolean }
    expect(json).toEqual({ success: true })
    expect(mockRepo.delete).toHaveBeenCalledWith('dream-1', 'test@example.com')
  })
})
