import { useEffect, useRef, useState } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  url: string
}

export function VideoPlayer({ url }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!url.startsWith('drive://')) {
      setObjectUrl(url)
      return
    }

    const fileId = url.replace('drive://', '')
    let cancelled = false

    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch video from Drive')
        return res.blob()
      })
      .then((blob) => {
        if (!cancelled) setObjectUrl(URL.createObjectURL(blob))
      })
      .catch(console.error)

    return () => { cancelled = true }
  }, [url, token])

  if (!objectUrl) {
    return (
      <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
        <span className="text-xs text-gray-300 tracking-wider">載入中...</span>
      </div>
    )
  }

  return <VideoPlayerInner src={objectUrl} />
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function VideoPlayerInner({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setCurrentTime(el.currentTime)
    const onLoaded = () => setDuration(el.duration)
    const onEnd = () => {
      setPlaying(false)
      setCurrentTime(0)
      el.currentTime = 0
    }

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('ended', onEnd)

    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('ended', onEnd)
    }
  }, [])

  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) { el.play() } else { el.pause() }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.currentTime = ratio * duration
  }

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowControls(true)
  }

  const handleMouseLeave = () => {
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2000)
    }
  }

  const handleMouseMove = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowControls(true)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2000)
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        src={src}
      />

      <AnimatePresence>
        {!playing && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <div className="ml-1 w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent" />
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 px-3 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 bg-gray-800/70 backdrop-blur-sm rounded-md px-3 py-2">
              <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300 transition-colors flex-shrink-0"
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor"/>
                    <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor"/>
                  </svg>
                ) : (
                  <div className="ml-0.5 w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-white border-b-[7px] border-b-transparent" />
                )}
              </button>

              <div
                className="flex-1 h-1 bg-gray-500/50 rounded-full relative cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow"
                  style={{ left: `${progress}%`, marginLeft: '-5px' }}
                />
              </div>

              <span className="text-[10px] text-gray-300 tracking-wider tabular-nums flex-shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
