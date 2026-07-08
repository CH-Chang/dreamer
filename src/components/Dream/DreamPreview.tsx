import { Link } from 'react-router-dom'
import type { Dream } from '../../types/dream'
import { useCategoryStore } from '../../stores/categoryStore'

interface Props {
  dream: Dream
}

export function DreamPreview({ dream }: Props) {
  const { categories } = useCategoryStore()
  return (
    <Link
      to={`/dream/${dream.id}`}
      className="block group"
    >
      <p className="text-xs text-gray-400 tracking-wider mb-2">
        {dream.date}
      </p>
      <h3 className="text-sm text-gray-600 font-medium group-hover:text-gray-800 transition-colors">
        {dream.title || '無標題'}
      </h3>
      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
        {dream.description}
      </p>
      {dream.tags && dream.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {dream.tags.map((tagId) => {
            const cat = categories.find((c) => c.id === tagId)
            return cat ? (
              <span
                key={tagId}
                className="inline-flex items-center gap-0.5 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: cat.color + '20', color: cat.color }}
              >
                {cat.icon} {cat.name}
              </span>
            ) : (
              <span key={tagId} className="inline-flex items-center gap-0.5 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-300">
                ???
              </span>
            )
          })}
        </div>
      )}
    </Link>
  )
}
