import { useMemo } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import { useDreamStore } from '../../stores/dreamStore'
import { DreamPreview } from './DreamPreview'
import { DreamForm } from './DreamForm'

export function DreamMemoPanel() {
  const { dreams, selectedDate } = useDreamStore()

  const selectedDream = useMemo(
    () => dreams.find((d) => d.date === selectedDate),
    [dreams, selectedDate],
  )

  return (
    <div className="mt-8">
      <AnimatePresence mode="wait">
        {!selectedDate ? (
          <m.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-gray-300 tracking-wider py-8"
          >
            選擇日期查看或記錄夢境
          </m.div>
        ) : selectedDream ? (
          <m.div
            key={selectedDream.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <DreamPreview dream={selectedDream} />
          </m.div>
        ) : (
          <m.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <DreamForm date={selectedDate} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
