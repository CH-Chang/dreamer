import { useState } from 'react'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useDreamStore } from '../../stores/dreamStore'
import { getDreamRepository } from '../../repositories/factory'
import { geminiTextClient } from '../../lib/geminiTextClient'
import { Switch } from '../ui/Switch'

interface Props {
  date: string
}

export function DreamForm({ date }: Props) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
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
        visibility,
      })

      try {
        const systemPrompt = '你是一個為夢境筆記產生標題的助手。根據以下夢境描述，產生 3 個簡潔、有意境的繁體中文標題（每個不超過 15 字），以換行分隔。只回傳標題，不需要編號。'
        const result = await geminiTextClient.generate(description.trim(), systemPrompt)
        const candidates = result.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
        if (candidates.length > 0) {
          const updated = await repo.update(dream.id, { title_candidates: candidates })
          addDream(updated)
        } else {
          addDream(dream)
        }
      } catch (err) {
        console.error('Failed to generate title candidates:', err)
        addDream(dream)
      }

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
      <div className="flex items-center justify-between mt-3">
        <Switch checked={visibility === 'public'} onChange={(v) => setVisibility(v ? 'public' : 'private')} />
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
