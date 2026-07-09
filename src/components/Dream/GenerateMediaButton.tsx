import { useState, useRef, useEffect } from 'react'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getVideoRepository } from '../../repositories/factory'
import { getComicRepository } from '../../repositories/factory'
import { veoApiClient } from '../../lib/veoApiClient'
import { imagenApiClient } from '../../lib/imgenApiClient'
import { uploadVideo, uploadImage } from '../../lib/googleDriveClient'
import type { VideoStatus } from '../../types/video'

interface Props {
  dreamId: string
  description: string
  onCreated: () => void
}

async function pollVideoOperation(
  name: string,
  onUpdate: (status: VideoStatus) => Promise<void>,
  dreamId: string,
  folderName: string,
): Promise<{ videoUrl?: string }> {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const result = await veoApiClient.getOperation(name)
    if (result.done) {
      if (result.error) throw new Error(result.error.message)
      const videoData = result.response?.videos?.[0]
      if (videoData?.bytesBase64Encoded) {
        const fileId = await uploadVideo(videoData.bytesBase64Encoded, videoData.mimeType, `dream-${dreamId}-${Date.now()}.mp4`, folderName)
        return { videoUrl: `drive://${fileId}` }
      }
      const videoUri = result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
      if (videoUri) return { videoUrl: videoUri }
      return {}
    }
    await onUpdate('generating')
  }
  throw new Error('Video generation timed out')
}

async function generateComic(dreamId: string, description: string): Promise<string> {
  const { driveFolderName } = useSettingsStore.getState().settings
  const result = await imagenApiClient.generateImage(`夢境漫畫風格: ${description}`)
  const fileId = await uploadImage(result.bytesBase64Encoded, result.mimeType, `comic-${dreamId}-${Date.now()}.png`, driveFolderName)
  return `drive://${fileId}`
}

export function GenerateMediaButton({ dreamId, description, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'video' | 'comic' | null>(null)
  const { user } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleGenerateVideo = async () => {
    if (!user || loading) return
    setOpen(false)
    setLoading('video')
    try {
      const repo = getVideoRepository()
      const video = await repo.create({ dream_id: dreamId, email: user.email })
      await repo.updateStatus(video.id, 'generating')
      onCreated()
      const { name } = await veoApiClient.generateVideo({ prompt: `Dream-like cinematic scene: ${description}`, aspectRatio: '16:9', resolution: '720p' })
      const pollResult = await pollVideoOperation(name, async (status) => { await repo.updateStatus(video.id, status); onCreated() }, dreamId, useSettingsStore.getState().settings.driveFolderName)
      await repo.updateStatus(video.id, pollResult.videoUrl ? 'done' : 'failed', pollResult.videoUrl)
      onCreated()
    } catch (err) { console.error('Failed to generate video:', err) }
    finally { setLoading(null) }
  }

  const handleGenerateComic = async () => {
    if (!user || loading) return
    setOpen(false)
    setLoading('comic')
    try {
      const repo = getComicRepository()
      const comic = await repo.create({ dream_id: dreamId, email: user.email })
      await repo.updateStatus(comic.id, 'generating')
      onCreated()
      const imageUrl = await generateComic(dreamId, description)
      await repo.updateStatus(comic.id, 'done', imageUrl)
      onCreated()
    } catch (err) { console.error('Failed to generate comic:', err) }
    finally { setLoading(null) }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <m.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(!open)}
        disabled={!!loading}
        className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading === 'video' ? '影片生成中...' : loading === 'comic' ? '漫畫生成中...' : '生成'}
      </m.button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[140px] overflow-hidden">
          <button
            onClick={handleGenerateVideo}
            className="w-full text-left px-4 py-2 text-xs tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
          >
            生成影片
          </button>
          <button
            onClick={handleGenerateComic}
            className="w-full text-left px-4 py-2 text-xs tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
          >
            生成漫畫
          </button>
        </div>
      )}
    </div>
  )
}
