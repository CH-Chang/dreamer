import { useState, useRef, useEffect } from 'react'
import type { CreateCommentInput } from '../../types/comment'
import { getCommentRepository } from '../../repositories/factory'

export interface Participant {
  email: string
  name: string
  avatar_url?: string
}

interface Props {
  dreamId: string
  targetType: 'dream' | 'video' | 'comic'
  targetId: string
  parentId?: string
  participants: Participant[]
  currentEmail: string
  onCommentCreated: () => void
  onCancel?: () => void
  placeholder?: string
}

export function CommentForm({ dreamId, targetType, targetId, parentId, participants, currentEmail, onCommentCreated, onCancel, placeholder }: Props) {
  const [text, setText] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIdx, setMentionIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const lastAtPos = useRef(-1)

  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    const handler = (e: Event) => {
      const inputEvent = e as InputEvent
      if (!inputEvent.isComposing) {
        const pos = el.selectionStart
        const before = text.slice(0, pos)
        const atIdx = before.lastIndexOf('@')
        if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === ' ')) {
          const afterAt = before.slice(atIdx + 1)
          if (!afterAt.includes(' ')) {
            lastAtPos.current = atIdx
            setMentionQuery(afterAt)
            setMentionOpen(true)
            setMentionIdx(0)
            return
          }
        }
        setMentionOpen(false)
      }
    }
    el.addEventListener('input', handler)
    return () => el.removeEventListener('input', handler)
  }, [text])

  const insertMention = (p: Participant) => {
    const pos = lastAtPos.current
    if (pos < 0) return
    const before = text.slice(0, pos)
    const after = text.slice(pos + 1 + mentionQuery.length)
    const newText = `${before}@${p.name} ${after}`
    setText(newText)
    setMentionOpen(false)
    taRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!mentionOpen) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && mentionOpen) {
      e.preventDefault()
      if (filtered[mentionIdx]) insertMention(filtered[mentionIdx])
    }
    if (e.key === 'Escape') { setMentionOpen(false) }
  }

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      const input: CreateCommentInput = {
        dream_id: dreamId,
        target_type: targetType,
        target_id: targetId,
        email: currentEmail,
        content: trimmed,
        parent_id: parentId,
      }
      await getCommentRepository().create(input)
      setText('')
      onCommentCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? '輸入留言...'}
          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white/80 text-xs resize-none h-20 focus:outline-none focus:border-white/20"
          rows={2}
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white/70 text-xs px-3 py-1 rounded transition-colors"
          >
            送出
          </button>
          {onCancel && (
            <button onClick={onCancel} className="text-white/40 hover:text-white/60 text-[10px]">
              取消
            </button>
          )}
        </div>
      </div>

      {mentionOpen && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 bg-gray-900 border border-white/10 rounded overflow-hidden shadow-lg z-30 max-h-32 overflow-y-auto">
          {filtered.map((p, i) => (
            <button
              key={p.email}
              onClick={() => insertMention(p)}
              className={`block w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 transition-colors ${i === mentionIdx ? 'bg-white/10' : ''}`}
            >
              {p.avatar_url && <img src={p.avatar_url} className="w-4 h-4 rounded-full inline mr-1.5" />}
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
