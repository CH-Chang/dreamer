import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getUserRepository } from '../repositories/factory'
import { initDatabase } from '../lib/alaSqlService'

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

    useAuthStore.getState().setSession({ email: userInfo.email, name: userInfo.name, avatar_url: userInfo.picture ?? '', created_at: '' }, accessToken)

    await initDatabase(true)

    const repo = getUserRepository()
    let existingUser = await repo.findByEmail(userInfo.email)
    if (!existingUser) {
      existingUser = await repo.create({
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.picture,
      })
    }
    useAuthStore.getState().setSession(existingUser, accessToken)
    navigate('/calendar')
  }

  return { user, isAuthenticated, onLoginSuccess, logout }
}
