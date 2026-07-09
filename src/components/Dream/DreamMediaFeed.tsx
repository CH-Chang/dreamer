import { useState, useEffect, useCallback } from 'react'
import { getVideoRepository } from '../../repositories/factory'
import { getComicRepository } from '../../repositories/factory'
import { VideoStatusBadge } from '../Video/VideoStatusBadge'
import { VideoPlayer } from '../Video/VideoPlayer'
import { ComicViewer } from '../Comic/ComicViewer'
import { GenerateMediaButton } from './GenerateMediaButton'
import type { Video } from '../../types/video'
import type { Comic } from '../../types/comic'

type MediaItem =
  | { type: 'video'; data: Video }
  | { type: 'comic'; data: Comic }

interface Props {
  dreamId: string
  title?: string
  description: string
}

export function DreamMediaFeed({ dreamId, title, description }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadMedia = useCallback(async () => {
    setLoading(true)
    try {
      const videoRepo = getVideoRepository()
      const comicRepo = getComicRepository()
      const [videos, comics] = await Promise.all([
        videoRepo.findAllByDreamId(dreamId),
        comicRepo.findAllByDreamId(dreamId),
      ])
      const merged: MediaItem[] = [
        ...videos.map((v) => ({ type: 'video' as const, data: v })),
        ...comics.map((c) => ({ type: 'comic' as const, data: c })),
      ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())
      setItems(merged)
    } finally {
      setLoading(false)
    }
  }, [dreamId])

  useEffect(() => { loadMedia() }, [loadMedia])

  return (
    <div>
      {loading ? (
        <p className="text-xs text-gray-300 tracking-wider">載入中...</p>
      ) : items.length > 0 ? (
        <div className="space-y-6">
          {items.map((item, i) => (
            <div key={item.data.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-300 tracking-wider">
                  生成 #{items.length - i}
                </span>
                {item.type === 'video' ? (
                  <>
                    <span className="text-[10px] text-gray-300 tracking-wider">· 影片</span>
                    <VideoStatusBadge status={item.data.status} />
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-gray-300 tracking-wider">· 漫畫</span>
                    <span className="text-[10px] tracking-wider text-gray-400">
                      {item.data.status === 'pending' && '待生成'}
                      {item.data.status === 'generating' && '生成中...'}
                      {item.data.status === 'done' && '已完成'}
                      {item.data.status === 'failed' && '失敗'}
                    </span>
                  </>
                )}
              </div>
              {item.type === 'video' && item.data.status === 'done' && item.data.video_url && (
                <VideoPlayer url={item.data.video_url} dreamId={dreamId} title={title} description={description} />
              )}
              {item.type === 'comic' && item.data.status === 'done' && item.data.image_url && (
                <ComicViewer imageUrl={item.data.image_url} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 tracking-wider mb-3">尚未產生內容</p>
      )}
      <div className="mt-4">
        <GenerateMediaButton dreamId={dreamId} description={description} onCreated={loadMedia} />
      </div>
    </div>
  )
}
