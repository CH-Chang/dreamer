import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserRepository } from '../sheets/UserRepository'
import * as alaSqlService from '../../lib/alaSqlService'
import * as sheetsClient from '../../lib/googleSheetsClient'

vi.mock('../../lib/alaSqlService', () => ({
  query: vi.fn(),
}))

vi.mock('../../lib/googleSheetsClient', () => ({
  appendSheetRow: vi.fn(),
}))

const mockQuery = vi.mocked(alaSqlService.query)
const mockAppend = vi.mocked(sheetsClient.appendSheetRow)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UserRepository', () => {
  const repo = new UserRepository()

  it('finds user by email', async () => {
    const user = {
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.png',
      created_at: '2026-01-01T00:00:00Z',
    }
    mockQuery.mockResolvedValue([user])

    const result = await repo.findByEmail('test@example.com')
    expect(result).toEqual(user)
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE email = ?',
      ['test@example.com'],
    )
  })

  it('returns null when user not found', async () => {
    mockQuery.mockResolvedValue([])
    const result = await repo.findByEmail('unknown@example.com')
    expect(result).toBeNull()
  })

  it('creates a new user', async () => {
    mockAppend.mockResolvedValue(undefined)

    const result = await repo.create({
      email: 'new@example.com',
      name: 'New User',
      avatar_url: 'https://example.com/avatar.png',
      role: 'user',
    })

    expect(result.email).toBe('new@example.com')
    expect(result.name).toBe('New User')
    expect(result.created_at).toBeDefined()
    expect(mockAppend).toHaveBeenCalledWith('users', [
      ['new@example.com', 'New User', 'https://example.com/avatar.png', 'user', expect.any(String)],
    ])
  })
})
