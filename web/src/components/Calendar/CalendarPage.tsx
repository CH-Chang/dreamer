import { useEffect, useState } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import { MonthNavigation } from './MonthNavigation'
import { CalendarGrid } from './CalendarGrid'
import { DreamMemoPanel } from '../Dream/DreamMemoPanel'
import { useCalendar } from '../../hooks/useCalendar'
import { initDatabase } from '../../lib/alaSqlService'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
}

const loadingDots = {
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: { duration: 1.2, repeat: Infinity },
  },
}

export function CalendarPage() {
  const { currentMonth, loadMonth, goToPrevMonth, goToNextMonth } = useCalendar()
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    initDatabase()
      .then(() => {
        setDbReady(true)
        return loadMonth()
      })
      .catch((err) => setDbError(err.message))
  }, [loadMonth])

  useEffect(() => {
    if (dbReady) loadMonth()
  }, [currentMonth.year, currentMonth.month, dbReady, loadMonth])

  if (dbError) {
    return (
      <div className="text-center py-20">
        <p className="text-xs text-gray-400 tracking-wider">資料庫初始化失敗</p>
        <p className="text-[11px] text-gray-300 mt-2">{dbError}</p>
        <p className="text-[11px] text-gray-300 mt-1">
          請確認設定中的資料是否正確
        </p>
      </div>
    )
  }

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <m.div
          variants={loadingDots}
          animate="animate"
          className="text-xs tracking-widest text-gray-300"
        >
          LOADING
        </m.div>
      </div>
    )
  }

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <MonthNavigation
        year={currentMonth.year}
        month={currentMonth.month}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
      />

      <AnimatePresence mode="wait">
        <m.div
          key={`${currentMonth.year}-${currentMonth.month}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <CalendarGrid />
        </m.div>
      </AnimatePresence>

      <DreamMemoPanel />
    </m.div>
  )
}
