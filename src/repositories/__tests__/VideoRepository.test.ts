import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VideoRepository } from '../sheets/VideoRepository'
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

describe('VideoRepository', () => {
  const repo = new VideoRepository()

  it('finds video by dream ID', async () => {
    const video = {
      id: 'v1', dream_id: 'd1', email: 'a@b.com',
      status: 'done' as const, video_url: 'https://example.com/video.mp4',
      created_at: '2026-01-01T00:00:00Z',
    }
    mockQuery.mockResolvedValue([video])

    const result = await repo.findByDreamId('d1')
    expect(result).toEqual(video)
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM videos WHERE dream_id = ? ORDER BY created_at DESC',
      ['d1'],
    )
  })

  it('returns null when no video for dream', async () => {
    mockQuery.mockResolvedValue([])
    const result = await repo.findByDreamId('nonexistent')
    expect(result).toBeNull()
  })

  it('creates a new video record', async () => {
    mockAppend.mockResolvedValue(undefined)

    const result = await repo.create({ dream_id: 'd1', email: 'a@b.com' })
    expect(result.dream_id).toBe('d1')
    expect(result.email).toBe('a@b.com')
    expect(result.status).toBe('pending')
    expect(result.id).toBeDefined()
    expect(mockAppend).toHaveBeenCalledTimes(1)
  })

  it('updates video status and persists to sheets', async () => {
    const headers = ['id', 'dream_id', 'email', 'status', 'video_url', 'created_at', 'updated_at']
    const existingRow = ['v1', 'd1', 'a@b.com', 'pending', '', '2026-01-01T00:00:00Z', '']
    mockFetchRows.mockResolvedValue([headers, existingRow])
    mockUpdateSheet.mockResolvedValue(undefined)

    const result = await repo.updateStatus('v1', 'done', 'https://example.com/video.mp4')
    expect(result.status).toBe('done')
    expect(result.video_url).toBe('https://example.com/video.mp4')
    expect(mockUpdateSheet).toHaveBeenCalledTimes(1)
    expect(mockUpdateSheet).toHaveBeenCalledWith('videos', 2, expect.arrayContaining(['done']))
  })
})
