import { useState, useEffect } from 'react'
import { motion as m } from 'framer-motion'
import type { Dream, UpdateDreamInput } from '../../types/dream'
import type { EditLogEntry } from '../../types/editLog'
import { useDreamStore } from '../../stores/dreamStore'
import { getDreamRepository, getEditLogRepository } from '../../repositories/factory'
import { geminiTextClient } from '../../lib/geminiTextClient'
import { TagInput } from '../ui/TagInput'
import { Switch } from '../ui/Switch'
import { MicButton } from '../ui/MicButton'
import { Spinner } from '../ui/Spinner'
import { Skeleton } from '../ui/Skeleton'
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
  const [polishing, setPolishing] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private'>(dream.visibility || 'public')
  const [showEditLog, setShowEditLog] = useState(false)
  const [editLogs, setEditLogs] = useState<EditLogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [selectingTitle, setSelectingTitle] = useState(false)
  const updateDream = useDreamStore((s) => s.updateDream)
  const { categories } = useCategoryStore()

  const fieldLabels: Record<string, string> = {
    title: '標題',
    tags: '標籤',
    visibility: '可見度',
    description: '內文',
    title_candidates: '標題候選',
  }

  useEffect(() => {
    if (showEditLog && editLogs.length === 0) {
      setLoadingLogs(true)
      getEditLogRepository().findByDreamId(dream.id)
        .then(setEditLogs)
        .catch(() => setEditLogs([]))
        .finally(() => setLoadingLogs(false))
    }
  }, [showEditLog, dream.id, editLogs.length])

  const handlePolish = async () => {
    if (!description.trim() || polishing) return
    setPolishing(true)
    try {
      const systemPrompt = '你是一個夢境日記的編輯助手。請潤飾以下夢境內文，保持原意、改善流暢度與可讀性，使用繁體中文。只回傳潤飾後的內文。'
      const result = await geminiTextClient.generate(description.trim(), systemPrompt)
      setDescription(result.trim())
    } catch (err) {
      console.error('Failed to polish description:', err)
    } finally {
      setPolishing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const repo = getDreamRepository()
      const data: UpdateDreamInput = {}
      if (title !== (dream.title || '')) data.title = title
      if (JSON.stringify(tags) !== JSON.stringify(dream.tags || [])) data.tags = tags
      if (visibility !== (dream.visibility || 'public')) data.visibility = visibility
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
    setVisibility(dream.visibility || 'public')
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
        {dream.title_candidates && dream.title_candidates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 mt-1">
            {dream.title_candidates.map((candidate, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTitle(candidate)}
                className={`text-xs tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
                  title === candidate
                    ? 'border-gray-800 bg-gray-800 text-white'
                    : 'border-gray-200 text-gray-400 hover:border-gray-400'
                }`}
              >
                {candidate}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <TagInput selected={tags} onChange={setTags} />
          </div>
          <Switch checked={visibility === 'public'} onChange={(v) => setVisibility(v ? 'public' : 'private')} />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="記錄你的夢境..."
          rows={6}
          className="w-full resize-none bg-transparent border-b border-gray-200 text-sm text-gray-500 placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors pb-3 leading-relaxed"
        />
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePolish}
              disabled={polishing || !description.trim()}
              className="text-xs tracking-wider px-3 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {polishing ? (
                <>
                  <Spinner size="xs" variant="gray" />
                  <span>潤飾中...</span>
                </>
              ) : (
                '✨ 潤飾'
              )}
            </button>
            <MicButton onTranscript={(text) => setDescription((prev) => prev + text)} disabled={saving || polishing} />
          </div>
          <div className="flex gap-3">
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
              className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Spinner size="xs" variant="light" />
                  <span>儲存中...</span>
                </>
              ) : (
                '儲存'
              )}
            </m.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs text-gray-400 tracking-wider mb-3">
            {dream.date}
            <span className="ml-2">· {dream.visibility === 'public' ? '公開' : '私有'}</span>
          </p>
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
          {dream.title_candidates && dream.title_candidates.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {selectingTitle ? (
                <div className="inline-flex items-center gap-1.5 py-0.5">
                  <Spinner size="xs" variant="gray" />
                  <span className="text-[10px] tracking-wider text-gray-400">選取中...</span>
                </div>
              ) : (
                <>
                  <span className="text-[10px] tracking-wider text-gray-300 mr-1">快速選標題：</span>
                  {dream.title_candidates.map((candidate, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={async () => {
                        setSelectingTitle(true)
                        try {
                          const repo = getDreamRepository()
                          const updated = await repo.update(dream.id, { title: candidate, title_candidates: [] })
                          updateDream(updated)
                        } catch (err) {
                          console.error('Failed to select title candidate:', err)
                        } finally {
                          setSelectingTitle(false)
                        }
                      }}
                      className={`text-[11px] tracking-wider px-2.5 py-0.5 rounded-full border transition-colors ${
                        dream.title === candidate
                          ? 'border-gray-800 bg-gray-800 text-white'
                          : 'border-gray-200 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {candidate}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setShowEditLog(true)}
            className="text-[10px] tracking-wider text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap"
          >
            紀錄
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] tracking-wider text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap"
          >
            編輯
          </button>
        </div>
      </div>
      <p className="mt-6 text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
        {dream.description}
      </p>

      {showEditLog && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowEditLog(false)}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-xs tracking-wider text-gray-500">編輯紀錄</span>
              <button
                onClick={() => setShowEditLog(false)}
                className="text-gray-300 hover:text-gray-500 text-sm leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {loadingLogs ? (
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ) : editLogs.length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-4">尚無編輯紀錄</p>
              ) : (
                editLogs.map((log) => (
                  <div key={log.id} className="border-b border-gray-50 pb-3 last:border-b-0">
                    <p className="text-[10px] text-gray-300 tracking-wider mb-1">
                      {new Date(log.edited_at).toLocaleString('zh-TW')}
                    </p>
                    {Object.entries(log.changes).map(([field, change]) => (
                      <p key={field} className="text-xs text-gray-500 leading-relaxed">
                        <span className="text-gray-700">{fieldLabels[field] || field}</span>
                        ：{change.from || '（空）'} → {change.to || '（空）'}
                      </p>
                    ))}
                  </div>
                ))
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </div>
  )
}
