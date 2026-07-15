import { useState, useEffect, useCallback, useRef } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import { FeedService, type FeedItem as FeedItemType } from '../../lib/feedService'
import { FeedItem } from './FeedItem'

const SWIPE_THRESHOLD = 80

export function FeedPage() {
  const [items, setItems] = useState<FeedItemType[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const loadingRef = useRef(false)
  const service = new FeedService()

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
  }, [])

  useEffect(() => { loadPage() }, [loadPage])

  const handleDragEnd = (_: any, info: { offset: { y: number } }) => {
    if (Math.abs(info.offset.y) < SWIPE_THRESHOLD) return
    if (info.offset.y > 0 && index > 0) {
      setDirection(-1)
      setIndex(i => i - 1)
    } else if (info.offset.y < 0) {
      if (index < items.length - 1) {
        setDirection(1)
        setIndex(i => i + 1)
      } else if (cursor && index >= items.length - 2) {
        if (!loadingRef.current) {
          loadingRef.current = true
          loadPage(cursor).finally(() => { loadingRef.current = false })
        }
      }
    }
  }

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
    <div className="h-screen w-screen bg-black overflow-hidden">
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
