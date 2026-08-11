import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../hooks/useAuth'
import type { GoogleUserInfo } from '../../hooks/useAuth'

interface Props {
  buttonText?: string
  className?: string
  onNeedsTerms?: (userInfo: GoogleUserInfo, accessToken: string) => void
}

export function LoginButton({ buttonText = '開始使用', className, onNeedsTerms }: Props) {
  const { handleLoginToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError('')
      try {
        const result = await handleLoginToken(tokenResponse.access_token)
        if (result.status === 'needs_terms' && onNeedsTerms) {
          onNeedsTerms(result.userInfo, result.accessToken)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '登入失敗')
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError('Google 登入失敗'),
    flow: 'implicit',
  })

  return (
    <div className="inline-block text-center">
      <button
        onClick={() => login()}
        disabled={loading}
        className={
          className ||
          'px-9 py-3 bg-gray-800 text-white text-xs tracking-[0.25em] hover:bg-gray-700 transition-colors disabled:opacity-50 font-light'
        }
      >
        {loading ? '驗證中...' : buttonText}
      </button>
      {error && (
        <p className="mt-3 text-xs text-red-400 tracking-wider text-center">{error}</p>
      )}
    </div>
  )
}
