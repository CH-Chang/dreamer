import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion as m } from 'framer-motion'
import { parseSearchQuery } from '../../lib/searchParser'
import { searchDreams } from '../../lib/searchService'
import { useAuthStore } from '../../stores/authStore'
import { DreamPreview } from '../Dream/DreamPreview'
import type { Dream } from '../../types/dream'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const { user } = useAuthStore()
  const [results, setResults] = useState<Dream[]>([])
  const [loading, setLoading] = useState(() => !!(user && q))

  useEffect(() => {
    if (!user || !q) { setLoading(false); return }
    setLoading(true)
    const parsed = parseSearchQuery(q)
    searchDreams(parsed, user.email)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [q, user])

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

      <h1 className="text-lg font-serif tracking-widest text-gray-700 mb-1">
        搜尋結果
      </h1>
      <p className="text-xs text-gray-400 tracking-wider mb-6">{q}</p>

      {loading ? (
        <p className="text-xs text-gray-300 tracking-wider">搜尋中...</p>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-300 tracking-wider">
            共 {results.length} 則
          </p>
          {results.map((dream) => (
            <div key={dream.id} className="border-b border-gray-100 pb-4">
              <DreamPreview dream={dream} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 tracking-wider">找不到符合的夢境</p>
      )}
    </m.div>
  )
}
