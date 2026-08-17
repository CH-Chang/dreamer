import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  description?: string
}

export interface CustomSelectProps<T extends string = string> {
  id?: string
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  className?: string
  buttonClassName?: string
  dropdownClassName?: string
  'aria-label'?: string
  disabled?: boolean
}

export function CustomSelect<T extends string = string>({
  id,
  value,
  onChange,
  options,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  'aria-label': ariaLabel,
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value) || options[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (val: T) => {
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`} id={id}>
      <button
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded text-gray-700 hover:border-gray-300 focus:outline-none focus:border-gray-400 transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="truncate font-light">{selectedOption?.label || value}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-gray-600' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 8l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            tabIndex={-1}
            className={`absolute right-0 z-50 mt-1 min-w-[140px] w-full bg-white border border-gray-100 rounded shadow-lg py-1 overflow-hidden focus:outline-none ${dropdownClassName}`}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-gray-50 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-[10px] text-gray-400 font-normal">{option.description}</span>
                    )}
                  </div>
                  {isSelected && (
                    <svg
                      className="w-3.5 h-3.5 text-gray-700 shrink-0 ml-2"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M5 10l3 3 7-7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
