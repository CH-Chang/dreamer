import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion as m } from 'framer-motion'
import { useDreamStore } from '../../stores/dreamStore'
import { getDreamRepository } from '../../repositories/factory'
import { DreamContent } from './DreamContent'
import { VideoSection } from '../Video/VideoSection'
import type { Dream } from '../../types/dream'

export function DreamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { dreams, addDream } = useDreamStore()
  const [fetchedDream, setFetchedDream] = useState<Dream | null>(null)
  const [loading, setLoading] = useState(false)
  const dream = dreams.find((d) => d.id === id) || fetchedDream

  useEffect(() => {
    if (dream) return
    setLoading(true)
    getDreamRepository()
      .findById(id!)
      .then((d) => {
        if (d) {
          addDream(d)
          setFetchedDream(d)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  if (!dream) {
    return (
      <div className="text-center py-20">
        {loading ? (
          <p className="text-xs text-gray-300 tracking-wider">載入中...</p>
        ) : (
          <>
            <p className="text-xs text-gray-400 tracking-wider">找不到夢境記錄</p>
            <Link
              to="/calendar"
              className="text-xs text-gray-400 hover:text-gray-600 mt-3 inline-block tracking-wider transition-colors"
            >
              ← 返回日曆
            </Link>
          </>
        )}
      </div>
    )
  }

  const appUrl = `${window.location.origin}/dream/${id}`

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <div className="flex items-start justify-between mb-6">
        <Link
          to="/calendar"
          className="text-xs text-gray-400 hover:text-gray-600 tracking-wider transition-colors"
        >
          ← 返回日曆
        </Link>
        <DreamShareButtons title={dream.title || '無標題'} description={dream.description} url={appUrl} />
      </div>
      <DreamContent dream={dream} />
      <div className="mt-8 pt-8 border-t border-gray-200">
        <VideoSection dreamId={dream.id} title={dream.title} description={dream.description} />
      </div>
    </m.div>
  )
}

function openIntent(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function DreamShareButtons({ title, description, url }: { title: string; description: string; url: string }) {
  const text = `我做了一個夢⋯${description ? '\n' + description.slice(0, 100) : ''}\n\n#夢貘`
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)

  return (
    <div className="flex items-center gap-2">
      <button onClick={async () => { await navigator.clipboard.writeText(`${text}\n${url}`) }} title="複製連結" className="text-gray-300 hover:text-gray-500 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
      <button onClick={() => openIntent(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)} title="分享到 X" className="text-gray-300 hover:text-gray-500 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>
      <button onClick={() => openIntent(`https://www.threads.net/intent/post?text=${encodedText}%0A${encodedUrl}`)} title="分享到 Threads" className="text-gray-300 hover:text-gray-500 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.108 22.4c-2.059 0-3.934-.448-5.394-1.294-1.384-.801-2.483-1.982-3.198-3.45-.72-1.476-1.092-3.22-1.092-5.12 0-1.901.372-3.645 1.092-5.121.715-1.458 1.814-2.639 3.198-3.46C8.174 2.449 10.05 2 12.108 2c2.069 0 3.939.449 5.389 1.285 1.394.831 2.488 2.017 3.198 3.48.71 1.461 1.082 3.2 1.082 5.1 0 1.9-.372 3.644-1.082 5.12-.72 1.468-1.814 2.649-3.198 3.45-1.45.846-3.32 1.294-5.389 1.294v.671Zm0-.68c2.023 0 3.866-.44 5.301-1.271 1.36-.79 2.441-1.95 3.145-3.394.705-1.454 1.07-3.166 1.07-5.035 0-1.87-.365-3.582-1.07-5.036-.704-1.444-1.785-2.604-3.145-3.394-1.435-.83-3.278-1.27-5.3-1.27-2.033 0-3.871.44-5.301 1.27-1.36.79-2.442 1.95-3.146 3.394-.704 1.454-1.069 3.166-1.069 5.036 0 1.869.365 3.581 1.069 5.035.704 1.444 1.786 2.604 3.146 3.394 1.43.83 3.268 1.271 5.3 1.271Z"/>
        </svg>
      </button>
      <button onClick={() => openIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`)} title="分享到 Facebook" className="text-gray-300 hover:text-gray-500 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </button>
    </div>
  )
}
