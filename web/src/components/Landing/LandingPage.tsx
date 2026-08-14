import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useAuth } from '../../hooks/useAuth'
import type { GoogleUserInfo } from '../../hooks/useAuth'
import type { SupportedLanguage } from '../../types/user'
import { LoginButton } from './LoginButton'
import { PrivacyTermsModal } from '../Auth/PrivacyTermsModal'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const { completeRegistration } = useAuth()
  const [pendingTerms, setPendingTerms] = useState<{
    userInfo: GoogleUserInfo
    accessToken: string
  } | null>(null)

  const handleAcceptTerms = async (language: SupportedLanguage) => {
    if (!pendingTerms) return
    try {
      await completeRegistration(pendingTerms.userInfo, pendingTerms.accessToken, language)
    } finally {
      setPendingTerms(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcf9] flex flex-col">
      <m.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        className="flex items-center justify-between px-8 py-5 relative z-10"
      >
        <Link to="/" className="text-lg tracking-[0.3em] font-light text-gray-600">
          夢貘
        </Link>
        <nav className="flex items-center gap-8 text-xs tracking-widest text-gray-400">
          {isAuthenticated ? (
            <Link to="/calendar" className="hover:text-gray-600 transition-colors">
              前往日曆
            </Link>
          ) : (
            <Link to="/about" className="hover:text-gray-600 transition-colors">
              關於
            </Link>
          )}
        </nav>
      </m.header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <m.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-6xl mb-6"
        >
          🌙
        </m.div>

        <m.h1
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-5xl sm:text-6xl font-serif tracking-widest text-gray-700 mb-4"
        >
          夢貘
        </m.h1>

        <m.p
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-sm text-gray-400 tracking-[0.3em] mb-10 font-light"
        >
          記錄夢境，編織故事
        </m.p>

        <m.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
        >
          {isAuthenticated ? (
            <Link
              to="/calendar"
              className="inline-block px-9 py-3 bg-gray-800 text-white text-xs tracking-[0.25em] hover:bg-gray-700 transition-colors font-light"
            >
              進入我的夢境日曆
            </Link>
          ) : (
            <LoginButton
              buttonText="開始使用"
              onNeedsTerms={(userInfo, accessToken) =>
                setPendingTerms({ userInfo, accessToken })
              }
            />
          )}
        </m.div>

        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-[11px] text-gray-300 mt-12 text-center max-w-xs leading-relaxed"
        >
          讓每天的夢，都能被好好記住
        </m.p>
      </div>

      <m.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="py-6 text-center text-[10px] tracking-[0.3em] text-gray-200"
      >
        夢貘
      </m.footer>

      {/* Privacy Policy & Terms Modal for New Users */}
      {pendingTerms && (
        <PrivacyTermsModal
          open={!!pendingTerms}
          userEmail={pendingTerms.userInfo.email}
          userName={pendingTerms.userInfo.name}
          onAccept={handleAcceptTerms}
          onCancel={() => setPendingTerms(null)}
        />
      )}
    </div>
  )
}
