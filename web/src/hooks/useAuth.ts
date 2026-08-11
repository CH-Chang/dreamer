import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getUserRepository } from '../repositories/factory'
import type { User } from '../types/user'

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
    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v1/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const userInfo: GoogleUserInfo = await userInfoRes.json()

    const repo = getUserRepository()
    const existingUser = await repo.findByEmail(userInfo.email)

    if (existingUser) {
      // Existing user: Log in directly!
      useAuthStore.getState().setSession(existingUser, accessToken)
      prefetchAvatar(existingUser, accessToken)
      navigate('/calendar')
      return { status: 'logged_in', user: existingUser }
    }

    // New user: Needs explicit Privacy Policy consent!
    return { status: 'needs_terms', userInfo, accessToken }
  }

  const completeRegistration = async (userInfo: GoogleUserInfo, accessToken: string): Promise<User> => {
    const repo = getUserRepository()
    const count = await repo.findCount()
    const newUser = await repo.create({
      email: userInfo.email,
      name: userInfo.name,
      avatar_url: userInfo.picture,
      role: count === 0 ? 'admin' : 'user',
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
      fetchAndCache(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, accessToken)
    } else if (avatarUrl.startsWith('http')) {
      fetchAndCache(avatarUrl, accessToken)
    }
  }
}
