import { useMemo } from 'react'
import { motion as m } from 'framer-motion'
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDate,
} from '../../utils/dateUtils'
import { DayCell } from './DayCell'
import { useDreamStore } from '../../stores/dreamStore'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const container = {
  animate: {
    transition: { staggerChildren: 0.012 },
  },
}

export function CalendarGrid() {
  const { currentMonth, dreams, dreamsWithVideo, selectedDate, setSelectedDate } = useDreamStore()
  const { year, month } = currentMonth
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const today = new Date()
  const todayStr = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  const dreamMap = useMemo(() => {
    const map = new Map<string, (typeof dreams)[0]>()
    for (const d of dreams) map.set(d.date, d)
    return map
  }, [dreams])

  const cells = useMemo(() => {
    const result: React.ReactNode[] = []
    for (let i = 0; i < firstDay; i++) {
      result.push(<div key={`empty-${i}`} />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d)
      const dream = dreamMap.get(dateStr)
      result.push(
        <m.div
          key={d}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <DayCell
            day={d}
            hasDream={!!dream}
            hasVideo={!!dream && dreamsWithVideo.includes(dream.id)}
            isSelected={selectedDate === dateStr}
            isToday={todayStr === dateStr}
            onSelect={() => setSelectedDate(dateStr)}
          />
        </m.div>,
      )
    }
    return result
  }, [
    daysInMonth,
    firstDay,
    dreamMap,
    selectedDate,
    todayStr,
    year,
    month,
    setSelectedDate,
  ])

  return (
    <m.div
      variants={container}
      initial="initial"
      animate="animate"
      className="grid grid-cols-7 gap-y-1"
    >
      {WEEKDAYS.map((w) => (
        <div
          key={w}
          className="text-center text-[11px] text-gray-300 tracking-wider py-1"
        >
          {w}
        </div>
      ))}
      {cells}
    </m.div>
  )
}
