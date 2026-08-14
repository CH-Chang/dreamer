import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRepository } from '../UserRepository'
import * as alaSqlService from '../../../lib/alaSqlService'
import * as googleSheetsClient from '../../../lib/googleSheetsClient'

vi.mock('../../../lib/alaSqlService', () => ({
  query: vi.fn(),
}))

vi.mock('../../../lib/googleSheetsClient', () => ({
  appendSheetRow: vi.fn(),
  fetchSheetAsRows: vi.fn(),
  updateSheetRow: vi.fn(),
}))

describe('UserRepository', () => {
  let repo: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new UserRepository()
  })

  describe('findByEmail', () => {
    it('returns user with explicit language preference', async () => {
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([
        {
          email: 'en@example.com',
          name: 'EN User',
          avatar_url: 'http://avatar.jpg',
          role: 'user',
          created_at: '2026-08-14T00:00:00.000Z',
          language: 'en-US',
        },
      ] as any)

      const user = await repo.findByEmail('en@example.com')
      expect(user).not.toBeNull()
      expect(user?.language).toBe('en-US')
      expect(alaSqlService.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?',
        ['en@example.com'],
      )
    })

    it('falls back to zh-TW if language is not set or empty', async () => {
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([
        {
          email: 'tw@example.com',
          name: 'TW User',
          avatar_url: '',
          role: 'user',
          created_at: '2026-08-14T00:00:00.000Z',
          language: '',
        },
      ] as any)

      const user = await repo.findByEmail('tw@example.com')
      expect(user).not.toBeNull()
      expect(user?.language).toBe('zh-TW')
    })

    it('returns null when user is not found', async () => {
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([] as any)

      const user = await repo.findByEmail('notfound@example.com')
      expect(user).toBeNull()
    })

    it('returns null on query exception', async () => {
      vi.mocked(alaSqlService.query).mockRejectedValueOnce(new Error('DB Error'))

      const user = await repo.findByEmail('error@example.com')
      expect(user).toBeNull()
    })
  })

  describe('create', () => {
    it('creates user with specified language', async () => {
      vi.mocked(googleSheetsClient.appendSheetRow).mockResolvedValueOnce()
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([] as any)

      const created = await repo.create({
        email: 'new_cn@example.com',
        name: 'CN User',
        avatar_url: 'http://pic.jpg',
        role: 'user',
        language: 'zh-CN',
      })

      expect(created.language).toBe('zh-CN')
      expect(created.email).toBe('new_cn@example.com')
      expect(googleSheetsClient.appendSheetRow).toHaveBeenCalledWith(
        'users',
        expect.arrayContaining([
          expect.arrayContaining(['new_cn@example.com', 'CN User', 'http://pic.jpg', 'user', expect.any(String), 'zh-CN']),
        ]),
      )
      expect(alaSqlService.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, name, avatar_url, role, created_at, language) VALUES (?, ?, ?, ?, ?, ?)',
        ['new_cn@example.com', 'CN User', 'http://pic.jpg', 'user', expect.any(String), 'zh-CN'],
      )
    })

    it('creates user with default zh-TW when language is omitted', async () => {
      vi.mocked(googleSheetsClient.appendSheetRow).mockResolvedValueOnce()
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([] as any)

      const created = await repo.create({
        email: 'default@example.com',
        name: 'Default User',
        role: 'user',
      })

      expect(created.language).toBe('zh-TW')
      expect(googleSheetsClient.appendSheetRow).toHaveBeenCalledWith(
        'users',
        expect.arrayContaining([
          expect.arrayContaining(['default@example.com', 'Default User', '', 'user', expect.any(String), 'zh-TW']),
        ]),
      )
    })
  })

  describe('update', () => {
    it('updates user language and sheets row', async () => {
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([] as any)
      vi.mocked(googleSheetsClient.fetchSheetAsRows).mockResolvedValueOnce([
        ['email', 'name', 'avatar_url', 'role', 'created_at', 'language'],
        ['test@example.com', 'Test User', '', 'user', '2026-08-14T00:00:00Z', 'zh-TW'],
      ])
      vi.mocked(googleSheetsClient.updateSheetRow).mockResolvedValueOnce()

      await repo.update('test@example.com', { language: 'en-US' })

      expect(alaSqlService.query).toHaveBeenCalledWith(
        'UPDATE users SET language = ? WHERE email = ?',
        ['en-US', 'test@example.com'],
      )
      expect(googleSheetsClient.updateSheetRow).toHaveBeenCalledWith(
        'users',
        2,
        ['test@example.com', 'Test User', '', 'user', '2026-08-14T00:00:00Z', 'en-US'],
      )
    })

    it('updates multiple fields including language', async () => {
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([] as any)
      vi.mocked(googleSheetsClient.fetchSheetAsRows).mockResolvedValueOnce([
        ['email', 'name', 'avatar_url', 'role', 'created_at', 'language'],
        ['test@example.com', 'Old Name', 'old_avatar', 'user', '2026-08-14T00:00:00Z', 'zh-TW'],
      ])
      vi.mocked(googleSheetsClient.updateSheetRow).mockResolvedValueOnce()

      await repo.update('test@example.com', {
        name: 'New Name',
        language: 'zh-CN',
      })

      expect(alaSqlService.query).toHaveBeenCalledWith(
        'UPDATE users SET name = ?, language = ? WHERE email = ?',
        ['New Name', 'zh-CN', 'test@example.com'],
      )
      expect(googleSheetsClient.updateSheetRow).toHaveBeenCalledWith(
        'users',
        2,
        ['test@example.com', 'New Name', 'old_avatar', 'user', '2026-08-14T00:00:00Z', 'zh-CN'],
      )
    })
  })

  describe('findCount', () => {
    it('returns count from query result', async () => {
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([{ cnt: 5 }] as any)
      const count = await repo.findCount()
      expect(count).toBe(5)
    })

    it('returns 0 if count query fails or is empty', async () => {
      vi.mocked(alaSqlService.query).mockResolvedValueOnce([] as any)
      const count = await repo.findCount()
      expect(count).toBe(0)
    })
  })
})
