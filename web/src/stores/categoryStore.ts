import { create } from 'zustand'
import type { Category } from '../types/category'
import { getCategoryRepository } from '../repositories/factory'
import { useAuthStore } from './authStore'

interface CategoryState {
  categories: Category[]
  loading: boolean
  loadCategories: () => Promise<void>
  createCategory: (name: string, color: string, icon: string) => Promise<void>
  updateCategory: (id: string, data: { name?: string; color?: string; icon?: string }) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  loadCategories: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ loading: true })
    const repo = getCategoryRepository()
    const categories = await repo.findAll(user.email)
    set({ categories, loading: false })
  },
  createCategory: async (name, color, icon) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const repo = getCategoryRepository()
    const category = await repo.create({ name, color, icon, email: user.email })
    set((s) => ({ categories: [...s.categories, category] }))
  },
  updateCategory: async (id, data) => {
    const repo = getCategoryRepository()
    const updated = await repo.update(id, data)
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },
  deleteCategory: async (id) => {
    await getCategoryRepository().delete(id)
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
  },
}))
