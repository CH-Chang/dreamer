import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../types/dream'

export interface IDreamRepository {
  findById(id: string): Promise<Dream | null>
  findAllByEmail(email: string): Promise<Dream[]>
  findByDate(email: string, date: string): Promise<Dream | null>
  findByMonth(email: string, year: number, month: number): Promise<Dream[]>
  findPublicPage(cursor?: string, limit?: number): Promise<{ items: Dream[]; nextCursor?: string }>
  create(input: CreateDreamInput): Promise<Dream>
  update(id: string, data: UpdateDreamInput): Promise<Dream>
}
