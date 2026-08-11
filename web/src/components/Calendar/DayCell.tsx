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
      className={`relative flex flex-col items-center w-full px-2 py-2 transition-colors cursor-pointer rounded
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
    >
      <span
        className={`text-sm leading-none ${
          isToday ? 'text-gray-700 font-medium' : hasDream ? 'text-gray-800' : 'text-gray-400'
        } ${isSelected ? 'text-gray-900 font-medium' : ''}`}
      >
        {day}
      </span>
      <div className="flex items-center gap-1 mt-1.5 h-1.5">
        {/* Left Dot: Video indicator (Purple/Indigo dot when video exists) */}
        <span
          title={hasVideo ? '包含生成影片' : undefined}
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            hasVideo ? 'bg-indigo-500 shadow-sm scale-110' : 'bg-gray-200'
          }`}
        />
        {/* Right Dot: Comic indicator (Amber/Golden dot when comic exists) */}
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
