import { Link } from 'react-router-dom'
import type { Dream } from '../../types/dream'

interface Props {
  dream: Dream
}

export function DreamPreview({ dream }: Props) {
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
      {dream.category && (
        <span className="inline-block mt-2 text-[10px] tracking-wider text-gray-300">
          {dream.category}
        </span>
      )}
    </Link>
  )
}
