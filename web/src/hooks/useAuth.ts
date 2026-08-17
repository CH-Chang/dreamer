import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getUserRepository } from '../repositories/factory'
import type { User, SupportedLanguage } from '../types/user'

export interface GoogleUserInfo {
  email: string
  name: string
  picture?: string
}

export type AuthLoginResult =
  | { status: 'logged_in'; user: User }
  | { status: 'needs_terms'; userInfo: GoogleUserInfo; accessToken: string }

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLoginToken = async (accessToken: string): Promise<AuthLoginResult> => {
    useAuthStore.setState({ token: accessToken })
    const res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      throw new Error('Authentication failed')
    }

    const data = (await res.json()) as {
      user: User | null
      authUser: GoogleUserInfo
    }

    if (data.user) {
      // Existing user: Log in directly!
      useAuthStore.getState().setSession(data.user, accessToken)
      prefetchAvatar(data.user, accessToken)
      navigate('/calendar')
      return { status: 'logged_in', user: data.user }
    }

    // New user: Needs explicit Privacy Policy consent!
    return { status: 'needs_terms', userInfo: data.authUser, accessToken }
  }

  const completeRegistration = async (
    userInfo: GoogleUserInfo,
    accessToken: string,
    language: SupportedLanguage = 'zh-TW',
  ): Promise<User> => {
    useAuthStore.setState({ token: accessToken })
    const repo = getUserRepository()
    const count = await repo.findCount()
    const newUser = await repo.create({
      email: userInfo.email,
      name: userInfo.name,
      avatar_url: userInfo.picture,
      role: count === 0 ? 'admin' : 'user',
      language,
    })

    useAuthStore.getState().setSession(newUser, accessToken)
    prefetchAvatar(newUser, accessToken)
    navigate('/calendar')
    return newUser
  }

  return {
    user,
    isAuthenticated,
    handleLoginToken,
    completeRegistration,
    logout,
  }
}

function prefetchAvatar(user: User, accessToken: string) {
  const state = useAuthStore.getState()
  if (user.avatar_url && !state.avatarBase64) {
    const avatarUrl = user.avatar_url
    const fetchAndCache = async (url: string, token: string) => {
      try {
        const res = await fetch(
          url,
          avatarUrl.startsWith('drive://')
            ? { headers: { Authorization: `Bearer ${token}` } }
            : {},
        )
        const blob = await res.blob()
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          if (base64) {
            useAuthStore.getState().setAvatarBase64(base64)
          }
        }
        reader.readAsDataURL(blob)
      } catch (err) {
        console.warn('Failed to prefetch avatar cache:', err)
      }
    }
    if (avatarUrl.startsWith('drive://')) {
      const fileId = avatarUrl.replace('drive://', '')
      fetchAndCache(`/api/media/${fileId}`, accessToken)
    } else if (avatarUrl.startsWith('http')) {
      fetchAndCache(avatarUrl, accessToken)
    }
  }
}
