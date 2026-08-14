import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpDreamRepository } from '../HttpDreamRepository'
import { useAuthStore } from '../../../stores/authStore'
import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../../../../shared/types/dream'

describe('HttpDreamRepository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    useAuthStore.setState({ token: 'test-token-123', user: null, isAuthenticated: true })
  })

  it('includes Authorization header when token is available in authStore', async () => {
    const mockDream: Dream = {
      id: 'd1',
      email: 'test@example.com',
      date: '2026-08-10',
      description: 'Dream test',
      title: 'Title',
      tags: [],
      visibility: 'public',
      created_at: '2026-08-10T00:00:00Z',
      updated_at: '2026-08-10T00:00:00Z',
    }

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockDream), { status: 200 }))

    const repo = new HttpDreamRepository()
    const result = await repo.findById('d1')

    expect(fetch).toHaveBeenCalledWith('/api/dreams/d1', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123',
      },
    })
    expect(result).toEqual(mockDream)
  })

  it('omits Authorization header when token is null', async () => {
    useAuthStore.setState({ token: null })
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 404 }))

    const repo = new HttpDreamRepository()
    const result = await repo.findById('d2')

    expect(fetch).toHaveBeenCalledWith('/api/dreams/d2', {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(result).toBeNull()
  })

  it('findAllByEmail calls GET /api/dreams with email parameter', async () => {
    const mockDreams: Dream[] = []
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockDreams), { status: 200 }))

    const repo = new HttpDreamRepository()
    const result = await repo.findAllByEmail('user@test.com')

    expect(fetch).toHaveBeenCalledWith('/api/dreams?email=user%40test.com', expect.anything())
    expect(result).toEqual([])
  })

  it('findByDate calls GET /api/dreams with email and date parameters', async () => {
    const mockDream: Dream = {
      id: 'd3',
      email: 'user@test.com',
      date: '2026-08-10',
      description: 'Date test',
      title: 'Title',
      tags: [],
      visibility: 'private',
      created_at: '2026-08-10T00:00:00Z',
      updated_at: '2026-08-10T00:00:00Z',
    }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockDream), { status: 200 }))

    const repo = new HttpDreamRepository()
    const result = await repo.findByDate('user@test.com', '2026-08-10')

    expect(fetch).toHaveBeenCalledWith('/api/dreams?email=user%40test.com&date=2026-08-10', expect.anything())
    expect(result).toEqual(mockDream)
  })

  it('findByMonth calls GET /api/dreams with email, year, and month parameters', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    const repo = new HttpDreamRepository()
    const result = await repo.findByMonth('user@test.com', 2026, 7)

    expect(fetch).toHaveBeenCalledWith('/api/dreams?email=user%40test.com&year=2026&month=7', expect.anything())
    expect(result).toEqual([])
  })

  it('findPublicPage calls GET /api/dreams/public with cursor and limit', async () => {
    const mockResponse = { items: [], nextCursor: 'next-123' }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }))

    const repo = new HttpDreamRepository()
    const result = await repo.findPublicPage('cursor-1', 5)

    expect(fetch).toHaveBeenCalledWith('/api/dreams/public?cursor=cursor-1&limit=5', expect.anything())
    expect(result).toEqual(mockResponse)
  })

  it('create sends POST request with input payload', async () => {
    const input: CreateDreamInput = {
      email: 'user@test.com',
      date: '2026-08-10',
      description: 'New dream',
      visibility: 'public' as const,
    }
    const mockCreated: Dream = {
      id: 'd_new',
      ...input,
      visibility: 'public',
      title: '',
      tags: [],
      created_at: '2026-08-10T00:00:00Z',
      updated_at: '2026-08-10T00:00:00Z',
    }

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockCreated), { status: 201 }))

    const repo = new HttpDreamRepository()
    const result = await repo.create(input)

    expect(fetch).toHaveBeenCalledWith('/api/dreams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123',
      },
      body: JSON.stringify(input),
    })
    expect(result).toEqual(mockCreated)
  })

  it('update sends PUT request with updated data', async () => {
    const updateInput: UpdateDreamInput = {
      title: 'Updated Title',
    }
    const mockUpdated: Dream = {
      id: 'd1',
      email: 'user@test.com',
      date: '2026-08-10',
      description: 'Desc',
      title: 'Updated Title',
      tags: [],
      visibility: 'public',
      created_at: '2026-08-10T00:00:00Z',
      updated_at: '2026-08-10T00:01:00Z',
    }

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockUpdated), { status: 200 }))

    const repo = new HttpDreamRepository()
    const result = await repo.update('d1', updateInput)

    expect(fetch).toHaveBeenCalledWith('/api/dreams/d1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123',
      },
      body: JSON.stringify(updateInput),
    })
    expect(result).toEqual(mockUpdated)
  })

  it('delete sends DELETE request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    const repo = new HttpDreamRepository()
    await repo.delete('d1', 'user@test.com')

    expect(fetch).toHaveBeenCalledWith('/api/dreams/d1?email=user%40test.com', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123',
      },
    })
  })
})
