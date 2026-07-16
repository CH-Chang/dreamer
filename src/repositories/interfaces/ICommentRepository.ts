import type { Comment, CreateCommentInput } from '../../types/comment'

export interface ICommentRepository {
  findByDreamId(dreamId: string): Promise<Comment[]>
  findByTarget(targetType: string, targetId: string): Promise<Comment[]>
  create(input: CreateCommentInput): Promise<Comment>
  update(id: string, data: { content?: string }): Promise<Comment>
  delete(id: string): Promise<void>
}
