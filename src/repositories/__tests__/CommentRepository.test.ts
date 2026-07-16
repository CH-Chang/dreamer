import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('../../lib/alaSqlService', () => ({ query: (...args: unknown[]) => mockQuery(...args) }))

const mockAppendSheetRow = vi.fn()
const mockUpdateSheetRow = vi.fn()
const mockFetchSheetAsRows = vi.fn()
vi.mock('../../lib/googleSheetsClient', () => ({
  appendSheetRow: (...args: unknown[]) => mockAppendSheetRow(...args),
  updateSheetRow: (...args: unknown[]) => mockUpdateSheetRow(...args),
  fetchSheetAsRows: (...args: unknown[]) => mockFetchSheetAsRows(...args),
}))

vi.mock('../../utils/idGenerator', () => ({ generateId: () => 'test-comment-id' }))

import { CommentRepository } from '../sheets/CommentRepository'
import type { CreateCommentInput } from '../../types/comment'

describe('CommentRepository', () => {
  let repo: CommentRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CommentRepository()
  })

  it('findByDreamId queries comments by dream_id', async () => {
    mockQuery.mockResolvedValue([])
    const result = await repo.findByDreamId('dream-1')
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE dream_id = ?'),
      ['dream-1'],
    )
    expect(result).toEqual([])
  })

  it('findByTarget queries comments by target_type and target_id', async () => {
    mockQuery.mockResolvedValue([])
    const result = await repo.findByTarget('video', 'video-1')
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE target_type = ? AND target_id = ?'),
      ['video', 'video-1'],
    )
    expect(result).toEqual([])
  })

  it('create appends sheet row and inserts into AlaSQL', async () => {
    mockAppendSheetRow.mockResolvedValue(undefined)
    mockQuery.mockResolvedValue([])

    const input: CreateCommentInput = {
      dream_id: 'dream-1',
      target_type: 'dream',
      target_id: 'dream-1',
      email: 'a@test.com',
      content: 'Hello',
    }

    const result = await repo.create(input)

    expect(result.id).toBe('test-comment-id')
    expect(result.dream_id).toBe('dream-1')
    expect(result.content).toBe('Hello')
    expect(result.parent_id).toBeNull()
    expect(result.mentions).toEqual([])
    expect(mockAppendSheetRow).toHaveBeenCalledWith('comments', expect.any(Array))
  })

  it('create accepts parent_id for replies', async () => {
    mockAppendSheetRow.mockResolvedValue(undefined)
    mockQuery.mockResolvedValue([])

    const result = await repo.create({
      dream_id: 'dream-1',
      target_type: 'dream',
      target_id: 'dream-1',
      email: 'b@test.com',
      content: 'Reply',
      parent_id: 'root-id',
    })

    expect(result.parent_id).toBe('root-id')
    expect(result.mentions).toEqual([])
  })

  it('create stores mentions when provided', async () => {
    mockAppendSheetRow.mockResolvedValue(undefined)
    mockQuery.mockResolvedValue([])

    const result = await repo.create({
      dream_id: 'dream-1',
      target_type: 'dream',
      target_id: 'dream-1',
      email: 'a@test.com',
      content: '@Bob check this',
      mentions: ['bob@test.com'],
    })

    expect(result.mentions).toEqual(['bob@test.com'])
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.arrayContaining([JSON.stringify(['bob@test.com'])]),
    )
  })

  it('update modifies content', async () => {
    const existing = [{
      id: 'c1', dream_id: 'd1', target_type: 'dream', target_id: 'd1',
      email: 'a@test.com', content: 'Old', parent_id: null,
      mentions: [], created_at: '2026-01-01', updated_at: '2026-01-01',
    }]
    mockQuery.mockResolvedValueOnce(existing).mockResolvedValue(undefined)
    mockFetchSheetAsRows.mockResolvedValue([['id', 'dream_id', 'target_type', 'target_id', 'email', 'content', 'parent_id', 'mentions', 'created_at', 'updated_at']])
    mockUpdateSheetRow.mockResolvedValue(undefined)

    const result = await repo.update('c1', { content: 'New' })
    expect(result.content).toBe('New')
    expect(result.updated_at).not.toBe('2026-01-01')
  })

  it('delete soft-deletes comment', async () => {
    const existing = [{
      id: 'c1', dream_id: 'd1', target_type: 'dream', target_id: 'd1',
      email: 'a@test.com', content: 'Hello', parent_id: null,
      mentions: [], created_at: '2026-01-01', updated_at: '2026-01-01',
    }]
    mockQuery.mockResolvedValueOnce(existing).mockResolvedValue(undefined)
    mockFetchSheetAsRows.mockResolvedValue([['id', 'dream_id', 'target_type', 'target_id', 'email', 'content', 'parent_id', 'mentions', 'created_at', 'updated_at']])
    mockUpdateSheetRow.mockResolvedValue(undefined)

    await repo.delete('c1')
    const updateCall = mockQuery.mock.calls[1]
    expect(updateCall[0]).toContain('UPDATE')
    expect(updateCall[1][0]).toBe('[已刪除]')
    expect(updateCall[1][1]).toBe('')
  })
})
