import { useState, useRef, useEffect } from 'react'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { getVideoRepository, getComicRepository } from '../../repositories/factory'
import { rateLimitService } from '../../lib/rateLimitService'
import { Spinner } from '../ui/Spinner'

interface Props {
  dreamId: string
  description: string
  onCreated: () => void
}

export function GenerateMediaButton({ dreamId, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'video' | 'comic' | null>(null)
  const [videoRemaining, setVideoRemaining] = useState<{ daily: number; monthly: number } | null>(null)
  const [comicRemaining, setComicRemaining] = useState<{ daily: number; monthly: number } | null>(null)
  const [withCharacter, setWithCharacter] = useState(false)
  const { user } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!user) return
    Promise.all([
      rateLimitService.getRemaining(user.email, 'video'),
      rateLimitService.getRemaining(user.email, 'comic'),
    ]).then(([v, c]) => {
      setVideoRemaining(v)
      setComicRemaining(c)
    })
  }, [user])

  const handleGenerateVideo = async () => {
    if (!user || loading) return
    setOpen(false)
    setLoading('video')
    try {
      const repo = getVideoRepository()
      await repo.create({ dream_id: dreamId, email: user.email, with_character: withCharacter })
      onCreated()
    } catch (err) {
      console.error('Failed to generate video:', err)
    } finally {
      setLoading(null)
    }
  }

  const handleGenerateComic = async () => {
    if (!user || loading) return
    setOpen(false)
    setLoading('comic')
    try {
      const repo = getComicRepository()
      await repo.create({ dream_id: dreamId, email: user.email, with_character: withCharacter })
      onCreated()
    } catch (err) {
      console.error('Failed to generate comic:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <m.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(!open)}
        disabled={!!loading || (videoRemaining !== null && (videoRemaining.daily <= 0 || videoRemaining.monthly <= 0) && comicRemaining !== null && (comicRemaining.daily <= 0 || comicRemaining.monthly <= 0))}
        className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
      >
        {loading === 'video' ? (
          <>
            <Spinner size="xs" variant="light" />
            <span>影片生成中...</span>
          </>
        ) : loading === 'comic' ? (
          <>
            <Spinner size="xs" variant="light" />
            <span>漫畫生成中...</span>
          </>
        ) : (
          '生成'
        )}
      </m.button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[180px] overflow-hidden">
          <button
            onClick={handleGenerateVideo}
            disabled={loading === 'video' || (videoRemaining !== null && (videoRemaining.daily < (withCharacter ? 2 : 1) || videoRemaining.monthly < (withCharacter ? 2 : 1)))}
            className="w-full text-left px-4 py-2 text-xs tracking-wider text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {videoRemaining !== null && videoRemaining.daily < (withCharacter ? 2 : 1)
              ? '生成影片 · 今日已達上限'
              : videoRemaining !== null && videoRemaining.monthly < (withCharacter ? 2 : 1)
              ? '生成影片 · 本月已達上限'
              : '生成影片'}
          </button>
          <button
            onClick={handleGenerateComic}
            disabled={loading === 'comic' || (comicRemaining !== null && (comicRemaining.daily < (withCharacter ? 2 : 1) || comicRemaining.monthly < (withCharacter ? 2 : 1)))}
            className="w-full text-left px-4 py-2 text-xs tracking-wider text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {comicRemaining !== null && comicRemaining.daily < (withCharacter ? 2 : 1)
              ? '生成漫畫 · 今日已達上限'
              : comicRemaining !== null && comicRemaining.monthly < (withCharacter ? 2 : 1)
              ? '生成漫畫 · 本月已達上限'
              : '生成漫畫'}
          </button>
          <div className="border-t border-gray-100" />
          <div className="relative group">
            <label
              className={`flex items-center justify-between px-4 py-2 text-xs tracking-wider text-gray-400 select-none ${!user?.avatar_url ? 'opacity-40' : 'cursor-pointer hover:bg-gray-50'}`}
            >
              <span>帶入主角形象 ～2</span>
              <input
                type="checkbox"
                checked={withCharacter}
                onChange={(e) => setWithCharacter(e.target.checked)}
                disabled={!user?.avatar_url}
                className="accent-gray-800"
              />
            </label>
            {!user?.avatar_url && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                上傳大頭照即可使用主角形象
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
