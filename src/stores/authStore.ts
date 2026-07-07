import { create } from 'zustand'
import type { User } from '../types/user'

const STORAGE_KEY = 'dreamer_auth'

interface PersistedAuth {
  user: User
  token: string
}

function loadPersistedAuth(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistAuth(user: User, token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }))
}

function clearPersistedAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setSession: (user: User, token: string) => void
  logout: () => void
}

const persisted = loadPersistedAuth()

export const useAuthStore = create<AuthState>((set) => ({
  user: persisted?.user ?? null,
  token: persisted?.token ?? null,
  isAuthenticated: !!persisted,
  setSession: (user, token) => {
    persistAuth(user, token)
    set({ user, token, isAuthenticated: true })
  },
  logout: () => {
    clearPersistedAuth()
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
