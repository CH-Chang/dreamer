import { create } from 'zustand'
import type { User } from '../types/user'

const STORAGE_KEY = 'dreamer_auth'

interface PersistedAuth {
  user: User
  token: string
  avatarBase64: string | null
}

function loadPersistedAuth(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistAuth(user: User, token: string, avatarBase64: string | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, avatarBase64 }))
}

function clearPersistedAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  avatarBase64: string | null
  setSession: (user: User, token: string, avatarBase64?: string | null) => void
  setAvatarBase64: (base64: string) => void
  logout: () => void
}

const persisted = loadPersistedAuth()

export const useAuthStore = create<AuthState>((set) => ({
  user: persisted?.user ?? null,
  token: persisted?.token ?? null,
  isAuthenticated: !!persisted,
  avatarBase64: persisted?.avatarBase64 ?? null,
  setSession: (user, token, avatarBase64) => {
    const ab = avatarBase64 ?? null
    persistAuth(user, token, ab)
    set({ user, token, isAuthenticated: true, avatarBase64: ab })
  },
  setAvatarBase64: (base64) => {
    const state = useAuthStore.getState()
    if (state.user && state.token) {
      persistAuth(state.user, state.token, base64)
    }
    set({ avatarBase64: base64 })
  },
  logout: () => {
    clearPersistedAuth()
    set({ user: null, token: null, isAuthenticated: false, avatarBase64: null })
  },
}))
