import { useEffect, useRef, useState } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import { getVideoBlob } from '../../lib/videoBlobCache'

interface Props {
  url: string
  dreamId?: string
  description?: string
  title?: string
  preloadedSrc?: string
}

export function VideoPlayer({ url, dreamId, description, title, preloadedSrc }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(preloadedSrc ?? null)
  const [loading, setLoading] = useState(!preloadedSrc)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (preloadedSrc) return

    if (!url.startsWith('drive://')) {
      setObjectUrl(url)
      setLoading(false)
      return
    }

    let cancelled = false

    getVideoBlob(url, (pct) => {
      if (!cancelled) setProgress(pct)
    })
      .then((blob) => {
        if (!cancelled) {
          setObjectUrl(URL.createObjectURL(blob))
          setLoading(false)
        }
      })
      .catch(console.error)

    return () => { cancelled = true }
  }, [url, preloadedSrc])

  if (loading) {
    const pct = Math.round(progress * 100)
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-3 overflow-hidden">
        <span className="text-xs text-gray-300 tracking-widest tabular-nums">{pct}%</span>
        <div className="w-1/2 h-0.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-400 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return <VideoPlayerInner src={objectUrl!} url={url} dreamId={dreamId} title={title} description={description} />
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function VideoPlayerInner({ src, url, dreamId, description, title }: { src: string; url: string; dreamId?: string; description?: string; title?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

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

      <div
        className="absolute top-2 right-2 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <ShareIcons url={url} dreamId={dreamId} description={description} title={title} />
      </div>

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

function openIntent(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function shareText(description?: string): string {
  const prefix = '我做了一個夢⋯'
  const body = description ? description.slice(0, 80) : ''
  return [prefix, body, '', '#夢貘'].filter(Boolean).join('\n')
}

function ShareIcons({ url, dreamId, description, title }: { url: string; dreamId?: string; description?: string; title?: string }) {
  const [sharing, setSharing] = useState(false)

  const handleDownload = async () => {
    try {
      const blob = await getVideoBlob(url)
      const fileId = url.replace('drive://', '')
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${title || 'dream'}-${fileId}.mp4`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleShareIG = async () => {
    if (!navigator.share) {
      await navigator.clipboard.writeText(shareText(description))
      return
    }
    setSharing(true)
    try {
      const blob = await getVideoBlob(url)
      const fileId = url.replace('drive://', '')
      const file = new File([blob], `${fileId}.mp4`, { type: 'video/mp4' })
      await navigator.share({ files: [file], text: shareText(description) })
    } catch {
      // user cancelled
    } finally {
      setSharing(false)
    }
  }

  const text = shareText(description)
  const appUrl = dreamId ? `${window.location.origin}/dreamer/dream/${dreamId}` : window.location.href
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(appUrl)

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleDownload} title="下載影片" className="text-white/80 hover:text-white transition-colors">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v9M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1 11v2h12v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button onClick={() => openIntent(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)} title="分享到 X" className="text-white/80 hover:text-white transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>
      <button onClick={() => openIntent(`https://www.threads.net/intent/post?text=${encodedText}%0A${encodedUrl}`)} title="分享到 Threads" className="text-white/80 hover:text-white transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.108 22.4c-2.059 0-3.934-.448-5.394-1.294-1.384-.801-2.483-1.982-3.198-3.45-.72-1.476-1.092-3.22-1.092-5.12 0-1.901.372-3.645 1.092-5.121.715-1.458 1.814-2.639 3.198-3.46C8.174 2.449 10.05 2 12.108 2c2.069 0 3.939.449 5.389 1.285 1.394.831 2.488 2.017 3.198 3.48.71 1.461 1.082 3.2 1.082 5.1 0 1.9-.372 3.644-1.082 5.12-.72 1.468-1.814 2.649-3.198 3.45-1.45.846-3.32 1.294-5.389 1.294v.671Zm0-.68c2.023 0 3.866-.44 5.301-1.271 1.36-.79 2.441-1.95 3.145-3.394.705-1.454 1.07-3.166 1.07-5.035 0-1.87-.365-3.582-1.07-5.036-.704-1.444-1.785-2.604-3.145-3.394-1.435-.83-3.278-1.27-5.3-1.27-2.033 0-3.871.44-5.301 1.27-1.36.79-2.442 1.95-3.146 3.394-.704 1.454-1.069 3.166-1.069 5.036 0 1.869.365 3.581 1.069 5.035.704 1.444 1.786 2.604 3.146 3.394 1.43.83 3.268 1.271 5.3 1.271Z"/>
        </svg>
      </button>
      <button onClick={() => openIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`)} title="分享到 Facebook" className="text-white/80 hover:text-white transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </button>
      <button onClick={handleShareIG} disabled={sharing} title="分享到 Instagram" className="text-white/80 hover:text-white disabled:opacity-40 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="5"/>
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      </button>
    </div>
  )
}
