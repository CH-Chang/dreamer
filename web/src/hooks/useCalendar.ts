import { useCallback } from 'react'
import { useDreamStore } from '../stores/dreamStore'
import { useAuthStore } from '../stores/authStore'
import { getDreamRepository, getVideoRepository, getComicRepository } from '../repositories/factory'

export function useCalendar() {
  const { user } = useAuthStore()
  const {
    currentMonth,
    setCurrentMonth,
    setDreams,
    dreams,
    setDreamsWithVideo,
    setDreamsWithComic,
  } = useDreamStore()

  const loadMonth = useCallback(async () => {
    if (!user) return
    const dreamRepo = getDreamRepository()
    const videoRepo = getVideoRepository()
    const comicRepo = getComicRepository()

    const monthDreams = await dreamRepo.findByMonth(
      user.email,
      currentMonth.year,
      currentMonth.month,
    )
    setDreams(monthDreams)

    try {
      const [allVideos, allComics] = await Promise.all([
        videoRepo.findAllByDreamId(''),
        comicRepo.findAllByDreamId(''),
      ])

      const videoDreamIds = allVideos
        .filter((v) => (v.status === 'done' || v.status === 'generating') && v.dream_id)
        .map((v) => v.dream_id)

      const comicDreamIds = allComics
        .filter((c) => (c.status === 'done' || c.status === 'generating') && c.dream_id)
        .map((c) => c.dream_id)

      setDreamsWithVideo(Array.from(new Set(videoDreamIds)))
      setDreamsWithComic(Array.from(new Set(comicDreamIds)))
    } catch {
      // Ignore media load failure
    }
  }, [user, currentMonth.year, currentMonth.month, setDreams, setDreamsWithVideo, setDreamsWithComic])

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
