interface Props {
  day: number
  hasDream: boolean
  hasVideo: boolean
  hasComic: boolean
  isSelected: boolean
  isToday: boolean
  onSelect: (day: number) => void
}

export function DayCell({
  day,
  hasDream,
  hasVideo,
  hasComic,
  isSelected,
  isToday,
  onSelect,
}: Props) {
  return (
    <button
      onClick={() => onSelect(day)}
      className={`relative flex flex-col items-center w-full px-1.5 py-2 transition-colors cursor-pointer rounded
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
    >
      <span
        className={`text-sm leading-none ${
          isToday ? 'text-gray-700 font-medium' : hasDream ? 'text-gray-800 font-normal' : 'text-gray-400'
        } ${isSelected ? 'text-gray-900 font-medium' : ''}`}
      >
        {day}
      </span>
      <div className="flex items-center justify-center gap-1 mt-1.5 h-1.5">
        {/* Dot 1: Dream recorded indicator (Dark Gray) */}
        <span
          title={hasDream ? '已記錄夢境' : undefined}
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            hasDream ? 'bg-gray-600 shadow-sm' : 'bg-gray-200'
          }`}
        />
        {/* Dot 2: Video generated indicator (Indigo/Purple) */}
        <span
          title={hasVideo ? '包含生成影片' : undefined}
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            hasVideo ? 'bg-indigo-500 shadow-sm scale-110' : 'bg-gray-200'
          }`}
        />
        {/* Dot 3: Comic generated indicator (Amber/Gold) */}
        <span
          title={hasComic ? '包含生成漫畫' : undefined}
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            hasComic ? 'bg-amber-500 shadow-sm scale-110' : 'bg-gray-200'
          }`}
        />
      </div>
    </button>
  )
}
