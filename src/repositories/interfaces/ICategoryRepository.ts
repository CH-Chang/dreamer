import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../types/category'

export interface ICategoryRepository {
  findAll(email: string): Promise<Category[]>
  create(input: CreateCategoryInput): Promise<Category>
  update(id: string, data: UpdateCategoryInput): Promise<Category>
  delete(id: string): Promise<void>
}
