import { useState, useEffect, useCallback } from 'react'
import { motion as m } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAuthStore } from '../../stores/authStore'
import { ConnectionTest } from './ConnectionTest'
import { MessageBox } from '../ui/MessageBox'
import { getRateLimitRepository } from '../../repositories/factory'
import { rateLimitService } from '../../lib/rateLimitService'
import type { RateLimit } from '../../types/rateLimit'

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
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [connectionTested, setConnectionTested] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDaily, setEditDaily] = useState('')
  const [editMonthly, setEditMonthly] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newType, setNewType] = useState<'video' | 'comic'>('video')
  const [newDaily, setNewDaily] = useState('')
  const [newMonthly, setNewMonthly] = useState('')
  const [myQuota, setMyQuota] = useState<Record<string, { daily_used: number; daily_limit: number; monthly_used: number; monthly_limit: number }> | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const loadRateLimits = useCallback(async () => {
    const repo = getRateLimitRepository()
    setRateLimits(await repo.findAll())
  }, [])

  useEffect(() => { loadRateLimits() }, [loadRateLimits])

  const loadMyQuota = useCallback(async () => {
    if (!user) return
    const [videoUsage, comicUsage, videoLimit, comicLimit] = await Promise.all([
      rateLimitService.getUsage(user.email, 'video'),
      rateLimitService.getUsage(user.email, 'comic'),
      rateLimitService.getLimit(user.email, 'video'),
      rateLimitService.getLimit(user.email, 'comic'),
    ])
    setMyQuota({
      video: { daily_used: videoUsage.daily, daily_limit: videoLimit.daily, monthly_used: videoUsage.monthly, monthly_limit: videoLimit.monthly },
      comic: { daily_used: comicUsage.daily, daily_limit: comicLimit.daily, monthly_used: comicUsage.monthly, monthly_limit: comicLimit.monthly },
    })
  }, [user])

  useEffect(() => { loadMyQuota() }, [loadMyQuota])

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
            {myQuota && (
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <p className="text-xs tracking-wider text-gray-400 mb-2">我的配額使用</p>
                <p className="text-xs text-gray-500 mb-1">影片：今日 {myQuota.video.daily_used}/{myQuota.video.daily_limit} · 本月 {myQuota.video.monthly_used}/{myQuota.video.monthly_limit}</p>
                <p className="text-xs text-gray-500">漫畫：今日 {myQuota.comic.daily_used}/{myQuota.comic.daily_limit} · 本月 {myQuota.comic.monthly_used}/{myQuota.comic.monthly_limit}</p>
              </div>
            )}
            <h2 className="text-sm tracking-wider text-gray-500 mb-4">配額管理</h2>
            {rateLimits.filter(r => r.scope === 'system').map(r => (
              <div key={r.id} className="mb-6 p-4 bg-gray-50 rounded">
                <p className="text-xs tracking-wider text-gray-400 mb-3">{r.type === 'video' ? '影片' : '漫畫'} — 系統預設</p>
                {editingId === r.id ? (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">每日</label>
                    <input type="number" value={editDaily} onChange={e => setEditDaily(e.target.value)}
                      className="w-20 px-2 py-1 text-xs border border-gray-200 rounded" />
                    <label className="text-xs text-gray-400">每月</label>
                    <input type="number" value={editMonthly} onChange={e => setEditMonthly(e.target.value)}
                      className="w-20 px-2 py-1 text-xs border border-gray-200 rounded" />
                    <button onClick={async () => {
                      if (!editDaily || !editMonthly) return
                      const repo = getRateLimitRepository()
                      try {
                        await repo.update(r.id, { daily_limit: Number(editDaily), monthly_limit: Number(editMonthly) })
                        setEditingId(null)
                        loadRateLimits()
                      } catch (err) {
                        console.error('Failed to update rate limit:', err)
                      }
                    }} className="px-3 py-1 text-xs bg-gray-800 text-white rounded">更新</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-gray-400">取消</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">每日 {r.daily_limit} · 每月 {r.monthly_limit}</span>
                    <button onClick={() => { setEditingId(r.id); setEditDaily(String(r.daily_limit)); setEditMonthly(String(r.monthly_limit)) }}
                      className="text-xs text-gray-400 hover:text-gray-600">編輯</button>
                  </div>
                )}
              </div>
            ))}

            {rateLimits.filter(r => r.scope !== 'system').map(r => (
              <div key={r.id} className="mb-3 flex items-center gap-3">
                <span className="text-xs text-gray-500 w-40 truncate">{r.scope}</span>
                <span className="text-xs text-gray-400 w-8">{r.type === 'video' ? '影片' : '漫畫'}</span>
                <span className="text-xs text-gray-400">每日 {r.daily_limit} · 每月 {r.monthly_limit}</span>
                <button onClick={async () => {
                  const repo = getRateLimitRepository()
                  try {
                    await repo.delete(r.id)
                    loadRateLimits()
                  } catch (err) {
                    console.error('Failed to delete rate limit:', err)
                  }
                }} className="text-xs text-red-300 hover:text-red-500">刪除</button>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400 mb-2">新增使用者覆寫</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="email" placeholder="user@email.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-200 rounded w-44" />
                <select value={newType} onChange={e => setNewType(e.target.value as 'video' | 'comic')}
                  className="px-2 py-1 text-xs border border-gray-200 rounded">
                  <option value="video">影片</option>
                  <option value="comic">漫畫</option>
                </select>
                <input type="number" placeholder="每日" value={newDaily} onChange={e => setNewDaily(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-200 rounded w-16" />
                <input type="number" placeholder="每月" value={newMonthly} onChange={e => setNewMonthly(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-200 rounded w-16" />
                <button onClick={async () => {
                  if (!newUserEmail || !newDaily || !newMonthly) return
                  const repo = getRateLimitRepository()
                  try {
                    await repo.create({ type: newType, scope: newUserEmail, daily_limit: Number(newDaily), monthly_limit: Number(newMonthly) })
                    setNewUserEmail(''); setNewDaily(''); setNewMonthly('')
                    loadRateLimits()
                  } catch (err) {
                    console.error('Failed to create rate limit:', err)
                  }
                }} className="px-3 py-1 text-xs bg-gray-800 text-white rounded">新增</button>
              </div>
            </div>
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
