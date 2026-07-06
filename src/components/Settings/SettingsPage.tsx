import { motion as m } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'
import { ConnectionTest } from './ConnectionTest'
import { Link } from 'react-router-dom'

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
}

const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
}

export function SettingsPage() {
  const { settings, setSettings } = useSettingsStore()

  return (
    <div className="min-h-screen bg-[#fcfcf9]">
      <m.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
        className="flex items-center justify-between px-8 py-5"
      >
        <Link to="/" className="text-lg tracking-[0.3em] font-light text-gray-600">
          夢貘
        </Link>
      </m.header>

      <m.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="max-w-md mx-auto px-6 pt-12 pb-20"
      >
        <m.h1
          variants={slideUp}
          className="text-2xl font-serif text-gray-600 tracking-wider mb-10"
        >
          設定
        </m.h1>

        <div className="space-y-8">
          <m.div variants={slideUp}>
            <label className="block text-xs tracking-wider text-gray-400 mb-2">
              試算表網址
            </label>
            <input
              type="url"
              value={settings.googleSheetsUrl}
              onChange={(e) => setSettings({ googleSheetsUrl: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm text-gray-600
                         placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </m.div>

          <m.div variants={slideUp}>
            <label className="block text-xs tracking-wider text-gray-400 mb-2">
              應用程式代號
            </label>
            <p className="text-[10px] text-gray-300 mb-2">Google 登入用，從 Google Cloud Console 取得</p>
            <input
              type="text"
              value={settings.googleClientId}
              onChange={(e) => setSettings({ googleClientId: e.target.value })}
              placeholder="123456789-xxxxx.apps.googleusercontent.com"
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm text-gray-600
                         placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </m.div>

          <m.div variants={slideUp}>
            <label className="block text-xs tracking-wider text-gray-400 mb-2">
              GCP 專案 ID
            </label>
            <p className="text-[10px] text-gray-300 mb-2">Vertex AI 用，從 Google Cloud Console 取得</p>
            <input
              type="text"
              value={settings.gcpProjectId}
              onChange={(e) => setSettings({ gcpProjectId: e.target.value })}
              placeholder="my-project-123"
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm text-gray-600
                         placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </m.div>

          <m.div variants={slideUp}>
            <label className="block text-xs tracking-wider text-gray-400 mb-2">
              Vertex AI 地區
            </label>
            <p className="text-[10px] text-gray-300 mb-2">預設 us-central1，非必要不需修改</p>
            <input
              type="text"
              value={settings.gcpLocation}
              onChange={(e) => setSettings({ gcpLocation: e.target.value })}
              placeholder="us-central1"
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm text-gray-600
                         placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </m.div>

          <m.div variants={slideUp}>
            <label className="block text-xs tracking-wider text-gray-400 mb-2">
              Drive 資料夾
            </label>
            <p className="text-[10px] text-gray-300 mb-2">影片存放在 Google Drive 的資料夾，自動建立</p>
            <input
              type="text"
              value={settings.driveFolderName}
              onChange={(e) => setSettings({ driveFolderName: e.target.value })}
              placeholder="夢貘 Videos"
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm text-gray-600
                         placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </m.div>

          <m.div variants={slideUp}>
            <ConnectionTest />
          </m.div>

          <m.div variants={slideUp} className="pt-4">
            <Link
              to="/"
              className="inline-block text-xs tracking-wider text-gray-300 hover:text-gray-500 transition-colors"
            >
              &larr; 返回
            </Link>
          </m.div>
        </div>
      </m.div>
    </div>
  )
}
