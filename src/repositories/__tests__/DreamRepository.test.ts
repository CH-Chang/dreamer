import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DreamRepository } from '../sheets/DreamRepository'
import * as alaSqlService from '../../lib/alaSqlService'
import * as sheetsClient from '../../lib/googleSheetsClient'

vi.mock('../../lib/alaSqlService', () => ({
  query: vi.fn(),
}))

vi.mock('../../lib/googleSheetsClient', () => ({
  appendSheetRow: vi.fn(),
  updateSheetRow: vi.fn(),
  fetchSheetAsRows: vi.fn(),
}))

const mockQuery = vi.mocked(alaSqlService.query)
const mockAppend = vi.mocked(sheetsClient.appendSheetRow)
const mockUpdateSheet = vi.mocked(sheetsClient.updateSheetRow)
const mockFetchRows = vi.mocked(sheetsClient.fetchSheetAsRows)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DreamRepository', () => {
  const repo = new DreamRepository()

  it('finds dream by date', async () => {
    const dream = {
      id: '1', email: 'a@b.com', date: '2026-07-05',
      description: 'nice dream', title: '', category: '',
      edit_log: '', created_at: '', updated_at: '',
    }
    mockQuery.mockResolvedValue([dream])

    const result = await repo.findByDate('a@b.com', '2026-07-05')
    expect(result).toEqual(dream)
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM dreams WHERE email = ? AND date = ?',
      ['a@b.com', '2026-07-05'],
    )
  })

  it('returns null when no dream found', async () => {
    mockQuery.mockResolvedValue([])
    const result = await repo.findByDate('a@b.com', '2026-07-05')
    expect(result).toBeNull()
  })

  it('finds dreams by month', async () => {
    mockQuery.mockResolvedValue([])
    await repo.findByMonth('a@b.com', 2026, 6)
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM dreams WHERE email = ? AND date LIKE ?',
      ['a@b.com', '2026-07%'],
    )
  })

  it('creates a new dream', async () => {
    mockAppend.mockResolvedValue(undefined)

    const result = await repo.create({
      email: 'a@b.com',
      date: '2026-07-05',
      description: 'new dream',
    })

    expect(result.email).toBe('a@b.com')
    expect(result.date).toBe('2026-07-05')
    expect(result.id).toBeDefined()
    expect(mockAppend).toHaveBeenCalledTimes(1)
  })

  it('updates a dream and persists to sheets', async () => {
    const headers = ['id', 'email', 'date', 'description', 'title', 'category', 'edit_log', 'created_at', 'updated_at']
    const existingRow = ['1', 'a@b.com', '2026-07-05', 'original', 'original title', '', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z']
    mockFetchRows.mockResolvedValue([headers, existingRow])
    mockUpdateSheet.mockResolvedValue(undefined)

    const result = await repo.update('1', { title: 'new title' })

    expect(result.title).toBe('new title')
    expect(result.updated_at).not.toBe(existingRow[8])
    expect(mockUpdateSheet).toHaveBeenCalledTimes(1)
    expect(mockUpdateSheet).toHaveBeenCalledWith('dreams', 2, expect.arrayContaining(['new title']))
  })

  it('throws when updating non-existent dream', async () => {
    mockFetchRows.mockResolvedValue([['id']])
    await expect(repo.update('nonexistent', { title: 'x' })).rejects.toThrow(
      'Dream not found',
    )
  })

  it('finds public dreams with cursor pagination', async () => {
    const dreams = [
      { id: '1', email: 'a@b.com', date: '2026-07-15', description: 'd1', title: '', tags: [], visibility: 'public', edit_log: '', created_at: '2026-07-15T10:00:00Z', updated_at: '' },
      { id: '2', email: 'b@c.com', date: '2026-07-14', description: 'd2', title: '', tags: [], visibility: 'public', edit_log: '', created_at: '2026-07-14T10:00:00Z', updated_at: '' },
    ]
    mockQuery.mockResolvedValue(dreams)

    const result = await repo.findPublicPage(undefined, 10)

    expect(result.items).toEqual(dreams)
    expect(result.nextCursor).toBe('2026-07-14T10:00:00Z')
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('visibility = \'public\''),
      [10],
    )
  })

  it('finds public dreams with cursor', async () => {
    const dreams = [
      { id: '3', email: 'c@d.com', date: '2026-07-10', description: 'd3', title: '', tags: [], visibility: 'public', edit_log: '', created_at: '2026-07-10T10:00:00Z', updated_at: '' },
    ]
    mockQuery.mockResolvedValue(dreams)

    const result = await repo.findPublicPage('2026-07-14T10:00:00Z', 10)

    expect(result.items).toEqual(dreams)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('created_at < ?'),
      ['2026-07-14T10:00:00Z', 10],
    )
  })

  it('returns empty page when no results', async () => {
    mockQuery.mockResolvedValue([])
    const result = await repo.findPublicPage(undefined, 10)
    expect(result.items).toEqual([])
    expect(result.nextCursor).toBeUndefined()
  })
})
