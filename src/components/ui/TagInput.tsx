import { useState, useRef, useEffect } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import type { Category } from '../../types/category'
import { getCategoryRepository } from '../../repositories/factory'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  selected: string[]
  onChange: (ids: string[]) => void
}

export function TagInput({ selected, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const user = useAuthStore.getState().user
    if (!user) return
    getCategoryRepository().findAll(user.email).then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = query.replace(/^#/, '')
  const filtered = categories.filter(
    (c) => !selected.includes(c.id) && c.name.toLowerCase().includes(q.toLowerCase()),
  )

  const select = (cat: Category) => {
    onChange([...selected, cat.id])
    setQuery('')
    inputRef.current?.focus()
  }

  const remove = (catId: string) => {
    onChange(selected.filter((id) => id !== catId))
  }

  const selectedCats = categories.filter((c) => selected.includes(c.id))

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {selectedCats.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] tracking-wider"
            style={{ backgroundColor: cat.color + '20', color: cat.color }}
          >
            {cat.icon} {cat.name}
            <button
              onClick={() => remove(cat.id)}
              className="ml-0.5 hover:opacity-60 transition-opacity"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (e.target.value.startsWith('#')) setOpen(true) }}
        onFocus={() => { if (query.startsWith('#')) setOpen(true) }}
        placeholder={selected.length === 0 ? '# 輸入標籤名稱...' : ''}
        className="w-full text-xs tracking-wider text-gray-500 bg-transparent border-b border-gray-200 pb-1 focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-200"
      />
      <AnimatePresence>
        {open && query.startsWith('#') && filtered.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto"
          >
            {filtered.map((cat) => (
              <button
                key={cat.id}
                onClick={() => select(cat)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <span>{cat.icon}</span>
                <span style={{ color: cat.color }}>{cat.name}</span>
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
