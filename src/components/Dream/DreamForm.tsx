import { useState } from 'react'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useDreamStore } from '../../stores/dreamStore'
import { getDreamRepository } from '../../repositories/factory'

interface Props {
  date: string
}

export function DreamForm({ date }: Props) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuthStore()
  const { addDream } = useDreamStore()

  const handleSave = async () => {
    if (!description.trim() || !user || saving) return
    setSaving(true)
    try {
      const repo = getDreamRepository()
      const dream = await repo.create({
        email: user.email,
        date,
        description: description.trim(),
      })
      addDream(dream)
      setDescription('')
    } catch (err) {
      console.error('Failed to save dream:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey && e.key === 'Enter') {
      handleSave()
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-400 tracking-wider mb-3">
        {date}
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="記錄你的夢境..."
        rows={4}
        className="w-full resize-none bg-transparent border-b border-gray-200 text-sm text-gray-600 placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors pb-3"
      />
      <div className="flex justify-end mt-3">
        <m.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || !description.trim()}
          className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '儲存中...' : '儲存'}
        </m.button>
      </div>
    </div>
  )
}
