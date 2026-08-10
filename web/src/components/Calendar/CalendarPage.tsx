import { useEffect } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import { MonthNavigation } from './MonthNavigation'
import { CalendarGrid } from './CalendarGrid'
import { DreamMemoPanel } from '../Dream/DreamMemoPanel'
import { useCalendar } from '../../hooks/useCalendar'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
}

export function CalendarPage() {
  const { currentMonth, loadMonth, goToPrevMonth, goToNextMonth } = useCalendar()

  useEffect(() => {
    loadMonth()
  }, [currentMonth.year, currentMonth.month, loadMonth])

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
