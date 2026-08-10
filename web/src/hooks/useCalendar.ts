import { useCallback } from 'react'
import { useDreamStore } from '../stores/dreamStore'
import { useAuthStore } from '../stores/authStore'
import { getDreamRepository } from '../repositories/factory'

export function useCalendar() {
  const { user } = useAuthStore()
  const { currentMonth, setCurrentMonth, setDreams, dreams } = useDreamStore()

  const loadMonth = useCallback(async () => {
    if (!user) return
    const repo = getDreamRepository()
    const monthDreams = await repo.findByMonth(
      user.email,
      currentMonth.year,
      currentMonth.month,
    )
    setDreams(monthDreams)
  }, [user, currentMonth.year, currentMonth.month, setDreams])

  const goToPrevMonth = () => {
    const { year, month } = currentMonth
    if (month === 0) setCurrentMonth(year - 1, 11)
    else setCurrentMonth(year, month - 1)
  }

  const goToNextMonth = () => {
    const { year, month } = currentMonth
    if (month === 11) setCurrentMonth(year + 1, 0)
    else setCurrentMonth(year, month + 1)
  }

  return { currentMonth, dreams, loadMonth, goToPrevMonth, goToNextMonth }
}
