import { useState, useEffect, useCallback } from 'react'
import { getVideoRepository } from '../../repositories/factory'
import { VideoStatusBadge } from './VideoStatusBadge'
import { VideoPlayer } from './VideoPlayer'
import { GenerateVideoButton } from './GenerateVideoButton'
import type { Video } from '../../types/video'

interface Props {
  dreamId: string
  title?: string
  description: string
}

export function VideoSection({ dreamId, title, description }: Props) {
  const [videos, setVideos] = useState<Video[]>([])

  const loadVideos = useCallback(async () => {
    const repo = getVideoRepository()
    const all = await repo.findAllByDreamId(dreamId)
    setVideos(all)
  }, [dreamId])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  return (
    <div>
      <h2 className="text-xs tracking-wider text-gray-400 mb-3">影片</h2>
      {videos.length > 0 ? (
        <div className="space-y-4">
          {videos.map((video, i) => (
            <div key={video.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-gray-300 tracking-wider">
                  生成 #{videos.length - i}
                </span>
                <VideoStatusBadge status={video.status} />
              </div>
              {video.status === 'done' && video.video_url && (
                <VideoPlayer url={video.video_url} dreamId={dreamId} title={title} description={description} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 tracking-wider mb-3">尚未生成影片</p>
      )}
      <div className="mt-3">
        <GenerateVideoButton
          dreamId={dreamId}
          description={description}
          onCreated={loadVideos}
        />
      </div>
    </div>
  )
}
