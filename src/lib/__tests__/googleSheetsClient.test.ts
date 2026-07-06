import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../../stores/authStore'
import {
  ensureSheetsExist,
  fetchSheetAsRows,
  appendSheetRow,
  parseRowsToObjects,
} from '../googleSheetsClient'

const TEST_URL = 'https://docs.google.com/spreadsheets/d/abc123xyz/edit'

beforeEach(() => {
  localStorage.setItem('dreamer_sheet_url', TEST_URL)
  vi.restoreAllMocks()
  useAuthStore.setState({ token: 'test-token', user: null, isAuthenticated: true })
})

describe('parseRowsToObjects', () => {
  it('parses rows with headers into objects', () => {
    const rows = [
      ['name', 'email'],
      ['Alice', 'alice@test.com'],
      ['Bob', 'bob@test.com'],
    ]
    const result = parseRowsToObjects(rows)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'Alice', email: 'alice@test.com' })
    expect(result[1]).toEqual({ name: 'Bob', email: 'bob@test.com' })
  })

  it('returns empty array for header-only rows', () => {
    expect(parseRowsToObjects([['col1']])).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(parseRowsToObjects([])).toEqual([])
  })
})

describe('fetchSheetAsRows', () => {
  it('fetches rows from Sheets API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ values: [['a', 'b'], ['1', '2']] }),
    })

    const result = await fetchSheetAsRows('users')
    expect(result).toEqual([['a', 'b'], ['1', '2']])
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sheets.googleapis.com/v4/spreadsheets/abc123xyz/values/users'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    )
  })

  it('returns empty array when sheet has no values', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const result = await fetchSheetAsRows('users')
    expect(result).toEqual([])
  })

  it('throws on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('error'),
    })
    await expect(fetchSheetAsRows('users')).rejects.toThrow('Sheets API error')
  })
})

describe('appendSheetRow', () => {
  it('calls Sheets API append endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
    })

    await appendSheetRow('dreams', [['id1', 'desc']])
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sheets.googleapis.com/v4/spreadsheets/abc123xyz/values/dreams:append'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ values: [['id1', 'desc']] }),
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      }),
    )
  })

  it('throws on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('API error'),
    })
    await expect(appendSheetRow('test', [['v']])).rejects.toThrow(
      'Failed to append row: API error',
    )
  })
})

describe('ensureSheetsExist', () => {
  it('creates missing sheets with headers', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sheets: [{ properties: { title: 'users' } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      })

    await ensureSheetsExist(['users', 'dreams'])

    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })
})
