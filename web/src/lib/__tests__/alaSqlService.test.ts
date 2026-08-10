import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as alaSqlService from '../alaSqlService'
import * as sheetsClient from '../googleSheetsClient'

vi.mock('../googleSheetsClient', async () => {
  const actual = await vi.importActual('../googleSheetsClient')
  return {
    ...actual,
    ensureSheetsExist: vi.fn(),
    fetchSheetAsRows: vi.fn(),
    parseRowsToObjects: vi.fn(),
  }
})

const mockEnsureSheets = vi.mocked(sheetsClient.ensureSheetsExist)
const mockFetchRows = vi.mocked(sheetsClient.fetchSheetAsRows)
const mockParseRows = vi.mocked(sheetsClient.parseRowsToObjects)

beforeEach(() => {
  alaSqlService.reset()
  vi.clearAllMocks()
  mockEnsureSheets.mockResolvedValue(undefined)
})

describe('initDatabase', () => {
  it('initializes database from sheet data', async () => {
    mockFetchRows.mockResolvedValue([['id', 'name'], ['1', 'Alice'], ['2', 'Bob']])
    mockParseRows.mockReturnValue([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ])

    await alaSqlService.initDatabase()

    const result = await alaSqlService.query<{ id: string; name: string }>(
      'SELECT * FROM users',
    )
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Alice')
  })

  it('handles empty sheets gracefully', async () => {
    mockFetchRows.mockResolvedValue([['header1', 'header2']])
    mockParseRows.mockReturnValue([])

    await alaSqlService.initDatabase()
    expect(alaSqlService.isInitialized()).toBe(true)
  })

  it('handles fetch errors gracefully', async () => {
    mockFetchRows.mockRejectedValue(new Error('Network error'))

    await alaSqlService.initDatabase()
    expect(alaSqlService.isInitialized()).toBe(true)
  })
})

describe('query', () => {
  it('throws when database is not initialized', async () => {
    await expect(alaSqlService.query('SELECT 1')).rejects.toThrow(
      'Database not initialized',
    )
  })

  it('executes SQL after initialization', async () => {
    mockFetchRows.mockResolvedValue([['val'], ['hello']])
    mockParseRows.mockReturnValue([{ val: 'hello' }])

    await alaSqlService.initDatabase()

    const result = await alaSqlService.query<{ val: string }>(
      "SELECT * FROM users WHERE val = 'hello'",
    )
    expect(result).toHaveLength(1)
    expect(result[0].val).toBe('hello')
  })
})

describe('reset', () => {
  it('resets database state', async () => {
    mockFetchRows.mockResolvedValue([['val'], ['1']])
    mockParseRows.mockReturnValue([{ val: '1' }])
    await alaSqlService.initDatabase()
    expect(alaSqlService.isInitialized()).toBe(true)

    alaSqlService.reset()
    expect(alaSqlService.isInitialized()).toBe(false)
  })
})
