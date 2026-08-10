import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getUserRepository } from '../repositories/factory'

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const onLoginSuccess = async (accessToken: string) => {
    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v1/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const userInfo: { email: string; name: string; picture?: string } =
      await userInfoRes.json()

    useAuthStore.getState().setSession({ email: userInfo.email, name: userInfo.name, avatar_url: userInfo.picture ?? '', role: 'user', created_at: '' }, accessToken)

    const repo = getUserRepository()
    let existingUser = await repo.findByEmail(userInfo.email)
    if (!existingUser) {
      const count = await repo.findCount()
      existingUser = await repo.create({
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.picture,
        role: count === 0 ? 'admin' : 'user',
      })
    }
    useAuthStore.getState().setSession(existingUser, accessToken)

    const state = useAuthStore.getState()
    if (existingUser.avatar_url && !state.avatarBase64) {
      const avatarUrl = existingUser.avatar_url
      const fetchAndCache = async (url: string, token: string) => {
        try {
          const res = await fetch(url, avatarUrl.startsWith('drive://')
            ? { headers: { Authorization: `Bearer ${token}` } }
            : {})
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

    navigate('/calendar')
  }

  return { user, isAuthenticated, onLoginSuccess, logout }
}
