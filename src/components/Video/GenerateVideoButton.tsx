import { useState } from 'react'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getVideoRepository } from '../../repositories/factory'
import { veoApiClient } from '../../lib/veoApiClient'
import { uploadVideo } from '../../lib/googleDriveClient'
import type { VideoStatus } from '../../types/video'

interface Props {
  dreamId: string
  description: string
  onCreated: () => void
}

async function pollOperation(
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

      // Handle Vertex AI :fetchPredictOperation format (base64)
      const videoData = result.response?.videos?.[0]
      if (videoData?.bytesBase64Encoded) {
        const fileId = await uploadVideo(
          videoData.bytesBase64Encoded,
          videoData.mimeType,
          `dream-${dreamId}-${Date.now()}.mp4`,
          folderName,
        )
        return { videoUrl: `drive://${fileId}` }
      }

      // Handle Gemini API format (URI)
      const videoUri = result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
      if (videoUri) return { videoUrl: videoUri }

      return {}
    }
    await onUpdate('generating')
  }
  throw new Error('Video generation timed out')
}

export function GenerateVideoButton({ dreamId, description, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()

  const handleGenerate = async () => {
    if (!user || loading) return
    setLoading(true)
    try {
      const repo = getVideoRepository()

      const video = await repo.create({ dream_id: dreamId, email: user.email })

      await repo.updateStatus(video.id, 'generating')
      onCreated()

      const { name } = await veoApiClient.generateVideo({
        prompt: `Dream-like cinematic scene: ${description}`,
        aspectRatio: '16:9',
        resolution: '720p',
      })

      const { driveFolderName } = useSettingsStore.getState().settings
      const pollResult = await pollOperation(name, async (status) => {
        await repo.updateStatus(video.id, status)
        onCreated()
      }, dreamId, driveFolderName)
      await repo.updateStatus(
        video.id,
        pollResult.videoUrl ? 'done' : 'failed',
        pollResult.videoUrl,
      )
      onCreated()
    } catch (err) {
      console.error('Failed to generate video:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <m.button
      whileTap={{ scale: 0.97 }}
      onClick={handleGenerate}
      disabled={loading}
      className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? '生成中...' : '生成影片'}
    </m.button>
  )
}
