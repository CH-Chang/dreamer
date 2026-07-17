import { useState, useEffect, useCallback, useRef } from 'react'
import { motion as m } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { getDreamRepository, getUserRepository } from '../../repositories/factory'
import { rateLimitService } from '../../lib/rateLimitService'
import { uploadImage } from '../../lib/googleDriveClient'
import type { Dream } from '../../types/dream'

const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
}

const AVATAR_FOLDER = '夢貘 Avatars'

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) { height *= maxSize / width; width = maxSize }
      } else {
        if (height > maxSize) { width *= maxSize / height; height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context not available')); return }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = blobUrl
  })
}

export function ProfilePage() {
  const { user, setSession, token } = useAuthStore()
  const [dreams, setDreams] = useState<Dream[]>([])
  const [myQuota, setMyQuota] = useState<Record<string, { daily_used: number; daily_limit: number; monthly_used: number; monthly_limit: number }> | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadDreams = useCallback(async () => {
    if (!user) return
    const repo = getDreamRepository()
    const all = await repo.findAllByEmail(user.email)
    setDreams(all)
  }, [user])

  const loadQuota = useCallback(async () => {
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

  useEffect(() => { loadDreams().catch(console.error) }, [loadDreams])
  useEffect(() => { loadQuota().catch(console.error) }, [loadQuota])

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalDreams = dreams.length
  const monthDreams = dreams.filter(d => d.date.startsWith(thisMonth)).length
  const publicDreams = dreams.filter(d => d.visibility === 'public').length
  const dreamsWithMedia = '—' // placeholder, will count from videos/comics in future

  const handlePhotoClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !token) return
    setUploading(true)
    try {
      const base64 = await resizeImage(file, 400)
      const ext = file.name.split('.').pop() || 'jpg'
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
      const fileName = `profile-${user.email.replace(/[@.]/g, '_')}.${ext}`
      const fileId = await uploadImage(base64, mimeType, fileName, AVATAR_FOLDER)
      const driveUrl = `drive://${fileId}`
      const repo = getUserRepository()
      await repo.update(user.email, { avatar_url: driveUrl })
      setSession({ ...user, avatar_url: driveUrl }, token)
    } catch (err) {
      console.error('Failed to upload avatar:', err)
      alert('上傳照片失敗，請稍後再試')
    } finally {
      setUploading(false)
    }
  }

  if (!user) return null

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <Link
        to="/calendar"
        className="inline-block text-xs tracking-wider text-gray-300 hover:text-gray-500 transition-colors mb-10"
      >
        &larr; 返回日曆
      </Link>

      <div className="max-w-xl mx-auto space-y-10">
        {/* User Info Card */}
        <m.div variants={slideUp} initial="initial" animate="animate" className="flex items-center gap-6">
          <div className="relative">
            <div
              onClick={handlePhotoClick}
              className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-gray-300">{user.name?.[0] || '?'}</span>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-serif text-gray-600 tracking-wider">{user.name}</h1>
            <p className="text-xs text-gray-400 mt-1">{user.email}</p>
            <p className="text-xs text-gray-300 mt-0.5">加入於 {new Date(user.created_at).toLocaleDateString('zh-TW')}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </m.div>

        {/* Dream Statistics */}
        <m.div variants={slideUp} initial="initial" animate="animate">
          <h2 className="text-sm tracking-wider text-gray-500 mb-4">夢境統計</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '總夢境數', value: totalDreams },
              { label: '本月夢境數', value: monthDreams },
              { label: '公開夢境數', value: publicDreams },
              { label: '有媒體的夢境', value: dreamsWithMedia },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-gray-50 rounded">
                <p className="text-xs tracking-wider text-gray-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-serif text-gray-600">{stat.value}</p>
              </div>
            ))}
          </div>
        </m.div>

        {/* Quota Display */}
        {myQuota && (
          <m.div variants={slideUp} initial="initial" animate="animate">
            <h2 className="text-sm tracking-wider text-gray-500 mb-4">我的配額使用</h2>
            <div className="p-4 bg-gray-50 rounded space-y-2">
              <p className="text-xs text-gray-500">影片：今日 {myQuota.video.daily_used}/{myQuota.video.daily_limit} · 本月 {myQuota.video.monthly_used}/{myQuota.video.monthly_limit}</p>
              <p className="text-xs text-gray-500">漫畫：今日 {myQuota.comic.daily_used}/{myQuota.comic.daily_limit} · 本月 {myQuota.comic.monthly_used}/{myQuota.comic.monthly_limit}</p>
            </div>
          </m.div>
        )}
      </div>
    </m.div>
  )
}
