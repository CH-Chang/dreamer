import { useState } from 'react'
import { getVideoBlob } from '../../lib/videoBlobCache'

interface Props {
  videoUrl: string
  dreamId: string
  title?: string
  description?: string
}

function shareText(description?: string): string {
  const prefix = '我做了一個夢⋯'
  const body = description ? description.slice(0, 80) : ''
  return [prefix, body, '', '#夢貘'].filter(Boolean).join('\n')
}

function openIntent(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function ShareSection({ videoUrl, dreamId, title, description }: Props) {
  const [sharing, setSharing] = useState(false)

  const handleDownload = async () => {
    try {
      const blob = await getVideoBlob(videoUrl)
      const fileId = videoUrl.replace('drive://', '')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'dream'}-${fileId}.mp4`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const text = shareText(description)
  const appUrl = `${window.location.origin}/dream/${dreamId}`
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(appUrl)

  const handleShareIG = async () => {
    if (navigator.share) {
      setSharing(true)
      try {
        const blob = await getVideoBlob(videoUrl)
        const fileId = videoUrl.replace('drive://', '')
        const file = new File([blob], `${fileId}.mp4`, { type: 'video/mp4' })
        await navigator.share({ files: [file], text })
      } catch {
        // user cancelled or API not available
      } finally {
        setSharing(false)
      }
    } else {
      await navigator.clipboard.writeText(text + '\n' + appUrl)
    }
  }

  return (
    <div className="flex items-center gap-4 pt-2">
      <button
        onClick={handleDownload}
        title="下載影片"
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v9M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1 11v2h12v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <span className="text-gray-200 select-none">|</span>

      <button
        onClick={() => openIntent(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)}
        title="分享到 X"
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>

      <button
        onClick={() => openIntent(`https://www.threads.net/intent/post?text=${encodedText}%0A${encodedUrl}`)}
        title="分享到 Threads"
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.108 22.4c-2.059 0-3.934-.448-5.394-1.294-1.384-.801-2.483-1.982-3.198-3.45-.72-1.476-1.092-3.22-1.092-5.12 0-1.901.372-3.645 1.092-5.121.715-1.458 1.814-2.639 3.198-3.46C8.174 2.449 10.05 2 12.108 2c2.069 0 3.939.449 5.389 1.285 1.394.831 2.488 2.017 3.198 3.48.71 1.461 1.082 3.2 1.082 5.1 0 1.9-.372 3.644-1.082 5.12-.72 1.468-1.814 2.649-3.198 3.45-1.45.846-3.32 1.294-5.389 1.294v.671Zm0-.68c2.023 0 3.866-.44 5.301-1.271 1.36-.79 2.441-1.95 3.145-3.394.705-1.454 1.07-3.166 1.07-5.035 0-1.87-.365-3.582-1.07-5.036-.704-1.444-1.785-2.604-3.145-3.394-1.435-.83-3.278-1.27-5.3-1.27-2.033 0-3.871.44-5.301 1.27-1.36.79-2.442 1.95-3.146 3.394-.704 1.454-1.069 3.166-1.069 5.036 0 1.869.365 3.581 1.069 5.035.704 1.444 1.786 2.604 3.146 3.394 1.43.83 3.268 1.271 5.3 1.271Z"/>
        </svg>
      </button>

      <button
        onClick={() => openIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`)}
        title="分享到 Facebook"
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </button>

      <button
        onClick={handleShareIG}
        disabled={sharing}
        title="分享到 Instagram"
        className="text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="5"/>
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      </button>
    </div>
  )
}
