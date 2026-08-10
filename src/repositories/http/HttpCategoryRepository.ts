import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../shared/types/category'
import type { ICategoryRepository } from '../interfaces/ICategoryRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpCategoryRepository implements ICategoryRepository {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const token = useAuthStore.getState().token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async findAll(email: string): Promise<Category[]> {
    const res = await fetch(`/api/categories?email=${encodeURIComponent(email)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create category')
    return res.json()
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update category')
    return res.json()
  }

  async delete(id: string): Promise<void> {
    await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
  }
}
