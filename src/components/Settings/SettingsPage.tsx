import { useState, useEffect } from 'react'
import { motion as m } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAuthStore } from '../../stores/authStore'
import { ConnectionTest } from './ConnectionTest'
import { MessageBox } from '../ui/MessageBox'

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
  const { settings, setSettings, loadSettings } = useSettingsStore()
  const { isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [connectionTested, setConnectionTested] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const doSave = () => {
    setSettings(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const save = () => {
    if (connectionTested) {
      doSave()
    } else {
      setConfirmAction(() => doSave)
    }
  }

  const saveAndRelogin = () => {
    if (connectionTested) {
      setSettings(draft)
      logout()
      navigate('/')
    } else {
      setConfirmAction(() => () => {
        setSettings(draft)
        logout()
        navigate('/')
      })
    }
  }

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
              value={draft.googleSheetsUrl}
              onChange={(e) => setDraft({ ...draft, googleSheetsUrl: e.target.value })}
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
              value={draft.googleClientId}
              onChange={(e) => setDraft({ ...draft, googleClientId: e.target.value })}
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
              value={draft.gcpProjectId}
              onChange={(e) => setDraft({ ...draft, gcpProjectId: e.target.value })}
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
              value={draft.gcpLocation}
              onChange={(e) => setDraft({ ...draft, gcpLocation: e.target.value })}
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
              value={draft.driveFolderName}
              onChange={(e) => setDraft({ ...draft, driveFolderName: e.target.value })}
              placeholder="夢貘 Videos"
              className="w-full px-4 py-3 bg-white border border-gray-200 text-sm text-gray-600
                         placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </m.div>

          <m.div variants={slideUp}>
            <div className="flex items-center gap-3">
              <ConnectionTest onTested={() => setConnectionTested(true)} />
              {isAuthenticated ? (
                <button
                  onClick={saveAndRelogin}
                  className="px-6 py-2.5 border border-gray-300 text-xs tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  儲存並重新登入
                </button>
              ) : (
                <button
                  onClick={save}
                  className="px-6 py-2.5 border border-gray-300 text-xs tracking-[0.2em] text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {saved ? '已儲存' : '儲存'}
                </button>
              )}
            </div>
          </m.div>

          <m.div variants={slideUp}>
            <button
              onClick={() => navigate(-1)}
              className="inline-block text-xs tracking-wider text-gray-300 hover:text-gray-500 transition-colors"
            >
              &larr; 放棄儲存
            </button>
          </m.div>
        </div>
      </m.div>

      <MessageBox
        open={!!confirmAction}
        title="未檢查連線"
        message="尚未執行連線檢查，確定要直接儲存嗎？建議先點「檢查連線」確認試算表可以正常讀寫。"
        confirmText="直接儲存"
        onConfirm={() => {
          confirmAction?.()
          setConfirmAction(null)
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
