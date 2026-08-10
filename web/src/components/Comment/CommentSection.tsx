import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '../../types/comment'
import { getCommentRepository, getUserRepository } from '../../repositories/factory'
import { useAuthStore } from '../../stores/authStore'
import { CommentList } from './CommentList'
import { CommentForm } from './CommentForm'
import type { Participant } from './CommentForm'

interface Props {
  dreamId: string
  dreamEmail?: string
}

export function CommentSection({ dreamId, dreamEmail }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const user = useAuthStore(s => s.user)

  const fetchComments = useCallback(async () => {
    const result = await getCommentRepository().findByDreamId(dreamId)
    setComments(result)
    const emails = new Set<string>()
    result.forEach(c => { if (c.email) emails.add(c.email) })
    if (dreamEmail) emails.add(dreamEmail)
    const users = await Promise.all(
      [...emails].map(e => getUserRepository().findByEmail(e).catch(() => null)),
    )
    const participantList: Participant[] = users.filter(Boolean).map(u => ({
      email: u!.email,
      name: u!.name,
      avatar_url: u!.avatar_url,
    }))
    setParticipants(participantList)
  }, [dreamId, dreamEmail])

  useEffect(() => { fetchComments() }, [fetchComments])

  const handleDelete = useCallback(async (id: string) => {
    await getCommentRepository().delete(id)
    setComments(prev => prev.map(c => c.id === id ? { ...c, content: '[已刪除]', email: '' } : c))
  }, [])

  const sortedComments = [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <div>
      <h3 className="text-gray-700 text-xs tracking-widest mb-4">留言</h3>
      <CommentForm
        dreamId={dreamId}
        targetType="dream"
        targetId={dreamId}
        participants={participants}
        currentEmail={user?.email ?? ''}
        onCommentCreated={fetchComments}
        placeholder="留言..."
      />
      <div className="mt-3">
        <CommentList
          comments={sortedComments}
          participants={participants}
          currentEmail={user?.email ?? ''}
          onReply={setReplyTo}
          onDelete={handleDelete}
        />
      </div>
      {replyTo && (
        <div className="ml-6 mt-2">
          <CommentForm
            dreamId={dreamId}
            targetType="dream"
            targetId={dreamId}
            parentId={replyTo}
            participants={participants}
            currentEmail={user?.email ?? ''}
            onCommentCreated={() => { setReplyTo(null); fetchComments() }}
            onCancel={() => setReplyTo(null)}
            placeholder="回覆..."
          />
        </div>
      )}
    </div>
  )
}
