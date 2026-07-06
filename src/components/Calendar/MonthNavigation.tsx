import { getMonthName } from '../../utils/dateUtils'

interface Props {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export function MonthNavigation({ year, month, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onPrev}
        className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
      >
        ‹
      </button>
      <h2 className="font-serif tracking-widest text-gray-600 text-lg">
        {getMonthName(year, month)}
      </h2>
      <button
        onClick={onNext}
        className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
      >
        ›
      </button>
    </div>
  )
}
