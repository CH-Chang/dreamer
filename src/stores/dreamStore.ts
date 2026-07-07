import { create } from 'zustand'
import type { Dream } from '../types/dream'

interface DreamState {
  dreams: Dream[]
  selectedDate: string | null
  setDreams: (dreams: Dream[]) => void
  setSelectedDate: (date: string | null) => void
  addDream: (dream: Dream) => void
  updateDream: (dream: Dream) => void
  currentMonth: { year: number; month: number }
  setCurrentMonth: (year: number, month: number) => void
  dreamsWithVideo: string[]
  setDreamsWithVideo: (ids: string[]) => void
}

export const useDreamStore = create<DreamState>((set) => ({
  dreams: [],
  selectedDate: (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })(),
  currentMonth: (() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })(),
  setDreams: (dreams) => set({ dreams }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  addDream: (dream) => set((s) => ({ dreams: [...s.dreams, dream] })),
  updateDream: (dream) =>
    set((s) => ({
      dreams: s.dreams.map((d) => (d.id === dream.id ? dream : d)),
    })),
  setCurrentMonth: (year, month) => set({ currentMonth: { year, month } }),
  dreamsWithVideo: [],
  setDreamsWithVideo: (ids) => set({ dreamsWithVideo: ids }),
}))
