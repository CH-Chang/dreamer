import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as m, AnimatePresence } from 'framer-motion'
import type { FeedItem as FeedItemType } from '../../lib/feedService'
import { getVideoBlob } from '../../lib/videoBlobCache'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  item: FeedItemType
  isActive: boolean
}

export function FeedItem({ item, isActive }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(true)
  const [comicObjectUrl, setComicObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    let currentObjectUrl: string | null = null

    if (item.type === 'video') {
      if (!item.mediaUrl.startsWith('drive://')) {
        setVideoObjectUrl(item.mediaUrl)
        setVideoLoading(false)
        return
      }
      getVideoBlob(item.mediaUrl)
        .then(blob => {
          if (!cancelled) {
            currentObjectUrl = URL.createObjectURL(blob)
            setVideoObjectUrl(currentObjectUrl)
            setVideoLoading(false)
          }
        })
        .catch(() => setError(true))
    } else {
      if (!item.mediaUrl.startsWith('drive://')) {
        setComicObjectUrl(item.mediaUrl)
        return
      }
      const token = useAuthStore.getState().token
      if (!token) return
      const fileId = item.mediaUrl.replace('drive://', '')
      fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => { if (!res.ok) throw new Error(`Drive fetch failed: ${res.status}`); return res.blob() })
        .then(blob => { if (!cancelled) { currentObjectUrl = URL.createObjectURL(blob); setComicObjectUrl(currentObjectUrl) } })
        .catch(() => setError(true))
    }

    return () => {
      cancelled = true
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
    }
  }, [item])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isActive) {
      el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [isActive, videoLoading])

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {error ? (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <p className="text-white/40 text-xs tracking-widest">載入失敗</p>
        </div>
      ) : item.type === 'video' ? (
        videoLoading ? (
          <span className="text-white/40 text-xs tracking-widest">載入中...</span>
        ) : (
          <video
            ref={videoRef}
            src={videoObjectUrl!}
            className="w-full h-full object-cover"
            playsInline
            loop
            muted
            autoPlay
          />
        )
      ) : (
        comicObjectUrl ? (
          <img src={comicObjectUrl} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-white/40 text-xs tracking-widest">載入中...</span>
        )
      )}

      <AnimatePresence>
        {expanded && (
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 z-10 bg-black/75"
          />
        )}
      </AnimatePresence>

      <m.div
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className={`absolute bottom-0 left-0 right-0 z-20 flex justify-center ${expanded ? 'bg-black/75 px-6 pb-8 pt-4' : 'bg-gradient-to-t from-black/70 to-transparent px-6 pb-8 pt-16'}`}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-2">
            {item.author.avatar_url && (
              <img src={item.author.avatar_url} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/30" />
            )}
            <span className="text-white/80 text-xs tracking-wider">{item.author.name}</span>
          </div>
          {item.dream.title && (
            <h3 className="text-white/90 text-sm font-medium mb-1">{item.dream.title}</h3>
          )}
          <p className={`text-white/60 text-xs leading-relaxed mb-1 ${expanded ? '' : 'line-clamp-2'}`}>
            {item.dream.description}
          </p>
          <span className="text-white/40 text-[10px] tracking-wider">{new Date(item.dream.created_at).toLocaleDateString('zh-TW')}</span>
          <div className="flex items-center gap-3 mt-2">
            {item.dream.description && item.dream.description.length > 80 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-white/50 hover:text-white/80 text-[10px] tracking-wider transition-colors"
              >
                {expanded ? '收起 ↑' : '展開 ↓'}
              </button>
            )}
            <button
              onClick={() => navigate(`/dream/${item.dream.id}`)}
              className="text-white/50 hover:text-white/80 text-[10px] tracking-wider transition-colors"
            >
              more &rarr;
            </button>
          </div>
        </div>
      </m.div>

      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 text-white/60 hover:text-white/90 text-xl leading-none transition-colors z-10"
      >
        &times;
      </button>
    </div>
  )
}
