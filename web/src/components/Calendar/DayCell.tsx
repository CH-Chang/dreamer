interface Props {
  day: number
  hasDream: boolean
  hasVideo: boolean
  isSelected: boolean
  isToday: boolean
  onSelect: (day: number) => void
}

export function DayCell({
  day,
  hasDream,
  hasVideo,
  isSelected,
  isToday,
  onSelect,
}: Props) {
  return (
    <button
      onClick={() => onSelect(day)}
      className={`relative flex flex-col items-center w-full px-2 py-2 transition-colors cursor-pointer rounded
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}
        ${isToday ? '' : ''}`}
    >
      <span
        className={`text-sm leading-none ${
          isToday ? 'text-gray-700 font-medium' : 'text-gray-600'
        } ${isSelected ? 'text-gray-800' : ''}`}
      >
        {day}
      </span>
      <div className="flex gap-1 mt-1">
        <span
          className={`w-1 h-1 rounded-full ${hasDream ? 'bg-gray-500' : 'bg-gray-200'}`}
        />
        <span
          className={`w-1 h-1 rounded-full ${hasVideo ? 'bg-gray-600' : 'bg-gray-200'}`}
        />
      </div>
    </button>
  )
}
