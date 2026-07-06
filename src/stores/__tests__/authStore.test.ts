import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'
import type { User } from '../../types/user'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('sets session with user and token', () => {
    const user: User = {
      email: 'test@example.com',
      name: 'Test User',
      created_at: '2026-01-01T00:00:00Z',
    }
    useAuthStore.getState().setSession(user, 'test-token')
    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.token).toBe('test-token')
    expect(state.isAuthenticated).toBe(true)
  })

  it('clears session on logout', () => {
    const user: User = {
      email: 'test@example.com',
      name: 'Test User',
      created_at: '2026-01-01T00:00:00Z',
    }
    useAuthStore.getState().setSession(user, 'test-token')
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})
