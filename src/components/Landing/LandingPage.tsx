import { Link } from 'react-router-dom'
import { motion as m } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'
import { LoginButton } from './LoginButton'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export function LandingPage() {
  const { settings } = useSettingsStore()
  const isConfigured = !!(settings.googleSheetsUrl && settings.googleClientId)

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
          {isConfigured && (
            <Link to="/calendar" className="hover:text-gray-600 transition-colors">
              日曆
            </Link>
          )}
          <Link
            to="/settings"
            className="hover:text-gray-600 transition-colors cursor-pointer"
          >
            設定
          </Link>
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
          {isConfigured ? (
            <LoginButton />
          ) : (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-4 tracking-wider">
                初次使用？
              </p>
              <Link
                to="/settings"
                className="inline-block px-8 py-3 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 transition-colors"
              >
                開始使用
              </Link>
            </div>
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
    </div>
  )
}
