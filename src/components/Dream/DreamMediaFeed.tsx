import { useState, useEffect, useCallback, useRef } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { getVideoRepository, getComicRepository } from '../../repositories/factory'
import { VideoStatusBadge } from '../Video/VideoStatusBadge'
import { VideoPlayer } from '../Video/VideoPlayer'
import { ComicViewer } from '../Comic/ComicViewer'
import { GenerateMediaButton } from './GenerateMediaButton'
import { getVideoBlob } from '../../lib/videoBlobCache'
import { useAuthStore } from '../../stores/authStore'
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

const SWIPE_THRESHOLD = 60

export function DreamMediaFeed({ dreamId, title, description }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [mediaSrcMap, setMediaSrcMap] = useState<Record<string, string>>({})
  const fetchingRef = useRef<Set<string>>(new Set())

  const preloadMedia = useCallback(async (item: MediaItem) => {
    const id = item.data.id
    if (mediaSrcMap[id] || fetchingRef.current.has(id)) return
    fetchingRef.current.add(id)
    try {
      let src: string
      if (item.type === 'video') {
        if (!item.data.video_url?.startsWith('drive://')) {
          src = item.data.video_url!
        } else {
          const blob = await getVideoBlob(item.data.video_url)
          src = URL.createObjectURL(blob)
        }
      } else {
        if (!item.data.image_url?.startsWith('drive://')) {
          src = item.data.image_url!
        } else {
          const token = useAuthStore.getState().token
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${item.data.image_url.replace('drive://', '')}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const blob = await res.blob()
          src = URL.createObjectURL(blob)
        }
      }
      setMediaSrcMap(prev => ({ ...prev, [id]: src }))
    } catch {
      // ignore
    } finally {
      fetchingRef.current.delete(id)
    }
  }, [mediaSrcMap])

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

  const doneItems = items.filter(i => i.type === 'video' ? i.data.status === 'done' && i.data.video_url : i.data.status === 'done' && i.data.image_url)

  useEffect(() => {
    doneItems.forEach(preloadMedia)
  }, [doneItems, preloadMedia])

  const goNext = () => { if (index < doneItems.length - 1) { setDirection(1); setIndex(i => i + 1) } }
  const goPrev = () => { if (index > 0) { setDirection(-1); setIndex(i => i - 1) } }

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) < SWIPE_THRESHOLD) return
    if (info.offset.x > 0) goPrev()
    else goNext()
  }

  const current = doneItems[index]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs tracking-wider text-gray-400">媒體</h2>
        <GenerateMediaButton dreamId={dreamId} description={description} onCreated={loadMedia} />
      </div>

      {loading ? (
        <p className="text-xs text-gray-300 tracking-wider">載入中...</p>
      ) : doneItems.length > 0 ? (<>
        <div className="relative">
          <div className="overflow-hidden rounded-lg bg-black aspect-square flex items-center justify-center relative">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <m.div
                key={current.data.id}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d * 200, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -200, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 flex items-center justify-center"
              >
                {current.type === 'video' ? (
                  <VideoPlayer url={current.data.video_url!} dreamId={dreamId} title={title} description={description} />
                ) : (
                  <ComicViewer imageUrl={current.data.image_url!} />
                )}
              </m.div>
            </AnimatePresence>

            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white flex items-center justify-center text-xs transition-colors z-10"
              title="放大檢視"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>

          {doneItems.length > 1 && (
            <>
              {index > 0 && (
                <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center text-sm shadow transition-colors">&lsaquo;</button>
              )}
              {index < doneItems.length - 1 && (
                <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center text-sm shadow transition-colors">&rsaquo;</button>
              )}
              <div className="flex justify-center gap-1.5 mt-3">
                {doneItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i) }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-gray-600 w-3' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-gray-300 tracking-wider">
              生成 #{items.length - items.indexOf(current)}
            </span>
            {current.type === 'video' ? (
              <>
                <span className="text-[10px] text-gray-300 tracking-wider">· 影片</span>
                <VideoStatusBadge status={current.data.status} />
              </>
            ) : (
              <span className="text-[10px] text-gray-300 tracking-wider">· 漫畫</span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {fullscreen && (
            <m.div
              key="dialog-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
              onClick={() => setFullscreen(false)}
            >
              <m.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative bg-black rounded-xl overflow-hidden w-full max-w-2xl max-h-[85vh] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setFullscreen(false)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 text-white/80 hover:text-white flex items-center justify-center text-lg leading-none z-10"
                >
                  &times;
                </button>

                {doneItems.length > 1 && index > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goPrev() }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-lg transition-colors z-10"
                  >
                    &lsaquo;
                  </button>
                )}
                {doneItems.length > 1 && index < doneItems.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goNext() }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-lg transition-colors z-10"
                  >
                    &rsaquo;
                  </button>
                )}

                <div className="w-full max-h-[85vh] flex items-center justify-center">
                  <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <m.div
                      key={current.data.id}
                      custom={direction}
                      variants={{
                        enter: (d: number) => ({ x: d * 300, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (d: number) => ({ x: d * -300, opacity: 0 }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_: any, info: PanInfo) => {
                        if (Math.abs(info.offset.x) < SWIPE_THRESHOLD) return
                        if (info.offset.x > 0) goPrev()
                        else goNext()
                      }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <div onContextMenu={(e) => e.preventDefault()} className="w-full h-full flex items-center justify-center">
                        {current.type === 'video' ? (
                          mediaSrcMap[current.data.id] ? (
                            <video
                              src={mediaSrcMap[current.data.id]}
                              className="w-full max-h-[85vh] object-contain"
                              playsInline
                              loop
                              autoPlay
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          ) : (
                            <VideoPlayer url={current.data.video_url!} dreamId={dreamId} title={title} description={description} />
                          )
                        ) : (
                          mediaSrcMap[current.data.id] ? (
                            <img
                              src={mediaSrcMap[current.data.id]}
                              className="w-full max-h-[85vh] object-contain"
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          ) : (
                            <ComicViewer imageUrl={current.data.image_url!} />
                          )
                        )}
                      </div>
                    </m.div>
                  </AnimatePresence>
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </>) : items.length > 0 ? (
        <div className="space-y-4">
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
                  <span className="text-[10px] tracking-wider text-gray-400">
                    {item.type === 'comic' && (item.data.status === 'pending' ? '待生成' : item.data.status === 'generating' ? '生成中...' : item.data.status === 'failed' ? '失敗' : '已完成')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 tracking-wider">尚未產生內容</p>
      )}
    </div>
  )
}
