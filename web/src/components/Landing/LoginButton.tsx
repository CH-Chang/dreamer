import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../hooks/useAuth'

export function LoginButton() {
  const { onLoginSuccess } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError('')
      try {
        await onLoginSuccess(tokenResponse.access_token)
      } catch (e) {
        setError(e instanceof Error ? e.message : '登入失敗')
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError('Google 登入失敗'),
    flow: 'implicit',
  })

  if (loading) {
    return (
      <div className="text-xs text-gray-300 tracking-wider">載入中...</div>
    )
  }

  return (
    <div>
      <button
        onClick={() => login()}
        disabled={loading}
        className="px-8 py-3 border border-gray-300 text-gray-500 text-xs tracking-[0.2em] hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Google 登入
      </button>
      {error && (
        <p className="mt-3 text-xs text-red-400 tracking-wider text-center">{error}</p>
      )}
    </div>
  )
}
