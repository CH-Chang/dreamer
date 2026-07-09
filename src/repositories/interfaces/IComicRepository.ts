import type { Comic, ComicStatus } from '../../types/comic'

export interface IComicRepository {
  findAllByDreamId(dreamId: string): Promise<Comic[]>
  create(input: { dream_id: string; email: string }): Promise<Comic>
  updateStatus(id: string, status: ComicStatus, imageUrl?: string): Promise<Comic>
}
