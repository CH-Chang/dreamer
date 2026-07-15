import { useState, useEffect, useCallback, useRef } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { FeedService, type FeedItem as FeedItemType } from '../../lib/feedService'
import { FeedItem } from './FeedItem'

const SWIPE_THRESHOLD = 80
const WHEEL_THRESHOLD = 50

export function FeedPage() {
  const [items, setItems] = useState<FeedItemType[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const loadingRef = useRef(false)
  const wheelAccum = useRef(0)
  const service = useRef(new FeedService()).current
  const indexRef = useRef(index)
  const itemsRef = useRef(items)
  const cursorRef = useRef(cursor)
  indexRef.current = index
  itemsRef.current = items
  cursorRef.current = cursor

  const loadPage = useCallback(async (c?: string) => {
    setLoading(true)
    try {
      const page = await service.findPublicPage(c)
      if (c) {
        setItems(prev => [...prev, ...page.items])
      } else {
        setItems(page.items)
      }
      setCursor(page.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => { loadPage() }, [loadPage])

  const goNext = useCallback(() => {
    const idx = indexRef.current
    if (idx < itemsRef.current.length - 1) {
      setDirection(1)
      setIndex(i => i + 1)
    } else if (cursorRef.current) {
      if (!loadingRef.current) {
        loadingRef.current = true
        loadPage(cursorRef.current).finally(() => { loadingRef.current = false })
      }
    }
  }, [loadPage])

  const goPrev = useCallback(() => {
    if (indexRef.current > 0) {
      setDirection(-1)
      setIndex(i => i - 1)
    }
  }, [])

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.y) < SWIPE_THRESHOLD) return
    if (info.offset.y > 0) goPrev()
    else goNext()
  }

  const handleWheel = (e: React.WheelEvent) => {
    wheelAccum.current += e.deltaY
    if (Math.abs(wheelAccum.current) >= WHEEL_THRESHOLD) {
      if (wheelAccum.current > 0) goNext()
      else goPrev()
      wheelAccum.current = 0
    }
  }

  useEffect(() => {
    const idx = indexRef.current
    const nextIdx = idx + 1
    if (nextIdx < itemsRef.current.length) {
      const next = itemsRef.current[nextIdx]
      if (next.type === 'video' && next.mediaUrl.startsWith('drive://')) {
        import('../../lib/videoBlobCache').then(m => m.getVideoBlob(next.mediaUrl)).catch(() => {})
      }
    }
  }, [index])

  const currentItem = items[index]

  if (error) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <p className="text-white/40 text-xs tracking-widest">{error}</p>
      </div>
    )
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <p className="text-white/40 text-xs tracking-widest">尚無公開貼文</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden" onWheel={handleWheel}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        {currentItem && (
          <m.div
            key={currentItem.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({ y: d * 100, opacity: 0 }),
              center: { y: 0, opacity: 1 },
              exit: (d: number) => ({ y: d * -100, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
          >
            <FeedItem item={currentItem} isActive />
          </m.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <span className="text-white/40 text-[10px] tracking-widest">載入中...</span>
        </div>
      )}
    </div>
  )
}
