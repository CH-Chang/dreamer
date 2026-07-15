import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  useEffect(() => {
    if (item.type === 'video') {
      if (!item.mediaUrl.startsWith('drive://')) {
        setVideoObjectUrl(item.mediaUrl)
        setVideoLoading(false)
        return
      }
      getVideoBlob(item.mediaUrl)
        .then(blob => { setVideoObjectUrl(URL.createObjectURL(blob)); setVideoLoading(false) })
        .catch(console.error)
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
        .then(res => res.blob())
        .then(blob => setComicObjectUrl(URL.createObjectURL(blob)))
        .catch(console.error)
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
  }, [isActive])

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {item.type === 'video' ? (
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
          />
        )
      ) : (
        comicObjectUrl ? (
          <img src={comicObjectUrl} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-white/40 text-xs tracking-widest">載入中...</span>
        )
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-8 pt-16">
        <div className="flex items-center gap-2 mb-2">
          {item.author.avatar_url && (
            <img src={item.author.avatar_url} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/30" />
          )}
          <span className="text-white/80 text-xs tracking-wider">{item.author.name}</span>
        </div>
        {item.dream.title && (
          <h3 className="text-white/90 text-sm font-medium mb-1">{item.dream.title}</h3>
        )}
        <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-1">
          {item.dream.description}
        </p>
        <span className="text-white/40 text-[10px] tracking-wider">{new Date(item.dream.created_at).toLocaleDateString('zh-TW')}</span>
        <button
          onClick={() => navigate(`/dream/${item.dream.id}`)}
          className="block mt-2 text-white/50 hover:text-white/80 text-[10px] tracking-wider transition-colors"
        >
          more &rarr;
        </button>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 text-white/60 hover:text-white/90 text-xl leading-none transition-colors z-10"
      >
        &times;
      </button>
    </div>
  )
}
