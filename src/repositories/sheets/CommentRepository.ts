import type { Comment, CreateCommentInput } from '../../types/comment'
import type { ICommentRepository } from '../interfaces/ICommentRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class CommentRepository implements ICommentRepository {
  async findByDreamId(dreamId: string): Promise<Comment[]> {
    return query<Comment>('SELECT * FROM comments WHERE dream_id = ? ORDER BY created_at ASC', [dreamId])
  }

  async findByTarget(targetType: string, targetId: string): Promise<Comment[]> {
    return query<Comment>('SELECT * FROM comments WHERE target_type = ? AND target_id = ? ORDER BY created_at ASC', [targetType, targetId])
  }

  async create(input: CreateCommentInput): Promise<Comment> {
    const now = new Date().toISOString()
    const comment: Comment = {
      id: generateId(),
      dream_id: input.dream_id,
      target_type: input.target_type,
      target_id: input.target_id,
      email: input.email,
      content: input.content,
      parent_id: input.parent_id ?? null,
      mentions: [],
      created_at: now,
      updated_at: now,
    }
    await appendSheetRow('comments', [[
      comment.id, comment.dream_id, comment.target_type, comment.target_id,
      comment.email, comment.content, comment.parent_id ?? '',
      JSON.stringify(comment.mentions), comment.created_at, comment.updated_at,
    ]])
    await query(
      'INSERT INTO comments (id, dream_id, target_type, target_id, email, content, parent_id, mentions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [comment.id, comment.dream_id, comment.target_type, comment.target_id, comment.email, comment.content, comment.parent_id, JSON.stringify(comment.mentions), comment.created_at, comment.updated_at],
    )
    return comment
  }

  async update(id: string, data: { content?: string }): Promise<Comment> {
    const rows = await query<Comment>('SELECT * FROM comments WHERE id = ?', [id])
    if (rows.length === 0) throw new Error('Comment not found')
    const existing = rows[0]
    const updated: Comment = {
      ...existing,
      content: data.content ?? existing.content,
      updated_at: new Date().toISOString(),
    }
    const sheetRows = await fetchSheetAsRows('comments')
    const rowIdx = sheetRows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
    if (rowIdx !== -1) {
      await updateSheetRow('comments', rowIdx + 1, [
        updated.id, updated.dream_id, updated.target_type, updated.target_id,
        updated.email, updated.content, updated.parent_id ?? '',
        JSON.stringify(updated.mentions), updated.created_at, updated.updated_at,
      ])
    }
    await query('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?', [updated.content, updated.updated_at, id])
    return updated
  }

  async delete(id: string): Promise<void> {
    const rows = await query<Comment>('SELECT * FROM comments WHERE id = ?', [id])
    if (rows.length === 0) return
    const existing = rows[0]
    const deleted = { ...existing, content: '[已刪除]', email: '', updated_at: new Date().toISOString() }
    const sheetRows = await fetchSheetAsRows('comments')
    const rowIdx = sheetRows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
    if (rowIdx !== -1) {
      await updateSheetRow('comments', rowIdx + 1, [
        deleted.id, deleted.dream_id, deleted.target_type, deleted.target_id,
        deleted.email, deleted.content, deleted.parent_id ?? '',
        JSON.stringify(deleted.mentions), deleted.created_at, deleted.updated_at,
      ])
    }
    await query('UPDATE comments SET content = ?, email = ?, updated_at = ? WHERE id = ?', [deleted.content, deleted.email, deleted.updated_at, id])
  }
}
