import { useState } from 'react'
import { motion as m } from 'framer-motion'
import type { Dream, UpdateDreamInput } from '../../types/dream'
import { useDreamStore } from '../../stores/dreamStore'
import { getDreamRepository } from '../../repositories/factory'
import { TagInput } from '../ui/TagInput'
import { useCategoryStore } from '../../stores/categoryStore'

interface Props {
  dream: Dream
}

export function DreamContent({ dream }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(dream.title || '')
  const [tags, setTags] = useState<string[]>(dream.tags || [])
  const [description, setDescription] = useState(dream.description)
  const [saving, setSaving] = useState(false)
  const updateDream = useDreamStore((s) => s.updateDream)
  const { categories } = useCategoryStore()

  const handleSave = async () => {
    setSaving(true)
    try {
      const repo = getDreamRepository()
      const data: UpdateDreamInput = {}
      if (title !== (dream.title || '')) data.title = title
      if (JSON.stringify(tags) !== JSON.stringify(dream.tags || [])) data.tags = tags
      if (description !== dream.description) data.description = description
      if (Object.keys(data).length === 0) {
        setEditing(false)
        return
      }
      const updated = await repo.update(dream.id, data)
      updateDream(updated)
      setEditing(false)
    } catch (err) {
      console.error('Failed to update dream:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle(dream.title || '')
    setTags(dream.tags || [])
    setDescription(dream.description)
    setEditing(false)
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs text-gray-400 tracking-wider mb-3">{dream.date}</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="標題（選填）"
          className="w-full font-serif tracking-widest text-gray-700 text-xl bg-transparent border-b border-gray-200 pb-1 mb-4 focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-200"
        />
        <div className="mb-4">
          <TagInput selected={tags} onChange={setTags} />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="記錄你的夢境..."
          rows={6}
          className="w-full resize-none bg-transparent border-b border-gray-200 text-sm text-gray-500 placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors pb-3 leading-relaxed"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-xs tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
          >
            取消
          </button>
          <m.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '儲存中...' : '儲存'}
          </m.button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs text-gray-400 tracking-wider mb-3">{dream.date}</p>
          <h1 className="text-xl font-serif tracking-widest text-gray-700">
            {dream.title || '無標題'}
          </h1>
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
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-[10px] tracking-wider text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap mt-1"
        >
          編輯
        </button>
      </div>
      <p className="mt-6 text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
        {dream.description}
      </p>
    </div>
  )
}
