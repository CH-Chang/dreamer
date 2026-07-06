import { useParams, Link } from 'react-router-dom'
import { motion as m } from 'framer-motion'
import { useDreamStore } from '../../stores/dreamStore'
import { DreamContent } from './DreamContent'
import { VideoSection } from '../Video/VideoSection'

export function DreamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { dreams } = useDreamStore()
  const dream = dreams.find((d) => d.id === id)

  if (!dream) {
    return (
      <div className="text-center py-20">
        <p className="text-xs text-gray-400 tracking-wider">找不到夢境記錄</p>
        <Link
          to="/calendar"
          className="text-xs text-gray-400 hover:text-gray-600 mt-3 inline-block tracking-wider transition-colors"
        >
          ← 返回日曆
        </Link>
      </div>
    )
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <Link
        to="/calendar"
        className="text-xs text-gray-400 hover:text-gray-600 tracking-wider transition-colors inline-block mb-6"
      >
        ← 返回日曆
      </Link>
      <DreamContent dream={dream} />
      <div className="mt-8 pt-8 border-t border-gray-200">
        <VideoSection dreamId={dream.id} description={dream.description} />
      </div>
    </m.div>
  )
}
