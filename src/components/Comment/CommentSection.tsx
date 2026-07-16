import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '../../types/comment'
import { getCommentRepository, getVideoRepository, getComicRepository } from '../../repositories/factory'
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
  const [viewMode, setViewMode] = useState<'merged' | 'separate'>('merged')
  const [mediaItems, setMediaItems] = useState<{ type: 'video' | 'comic'; id: string }[]>([])
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const user = useAuthStore(s => s.user)

  const fetchComments = useCallback(async () => {
    const result = await getCommentRepository().findByDreamId(dreamId)
    setComments(result)
    const emails = new Set<string>()
    result.forEach(c => { if (c.email) emails.add(c.email) })
    if (dreamEmail) emails.add(dreamEmail)
    const participantList: Participant[] = [...emails].map(e => ({
      email: e,
      name: e.split('@')[0],
    }))
    setParticipants(participantList)
  }, [dreamId, dreamEmail])

  useEffect(() => { fetchComments() }, [fetchComments])

  useEffect(() => {
    const load = async () => {
      const [videos, comics] = await Promise.all([
        getVideoRepository().findAllByDreamId(dreamId).catch(() => []),
        getComicRepository().findAllByDreamId(dreamId).catch(() => []),
      ])
      const items: { type: 'video' | 'comic'; id: string }[] = [
        ...videos.map((v: any) => ({ type: 'video' as const, id: v.id })),
        ...comics.map((c: any) => ({ type: 'comic' as const, id: c.id })),
      ]
      setMediaItems(items)
    }
    load()
  }, [dreamId])

  const handleDelete = useCallback(async (id: string) => {
    await getCommentRepository().delete(id)
    setComments(prev => prev.map(c => c.id === id ? { ...c, content: '[已刪除]', email: '' } : c))
  }, [])

  const dreamComments = comments.filter(c => c.target_type === 'dream' && c.target_id === dreamId)
  const mediaComments = (type: string, id: string) =>
    comments.filter(c => c.target_type === type && c.target_id === id)

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/70 text-xs tracking-widest">留言</h3>
        {mediaItems.length > 0 && (
          <div className="flex gap-1 bg-white/5 rounded p-0.5">
            <button
              onClick={() => setViewMode('merged')}
              className={`text-[10px] px-2 py-0.5 rounded tracking-wider transition-colors ${viewMode === 'merged' ? 'bg-white/10 text-white/80' : 'text-white/40 hover:text-white/60'}`}
            >
              全部留言
            </button>
            <button
              onClick={() => setViewMode('separate')}
              className={`text-[10px] px-2 py-0.5 rounded tracking-wider transition-colors ${viewMode === 'separate' ? 'bg-white/10 text-white/80' : 'text-white/40 hover:text-white/60'}`}
            >
              按媒體分類
            </button>
          </div>
        )}
      </div>

      {viewMode === 'merged' ? (
        <div>
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
              comments={dreamComments}
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
      ) : (
        <div className="space-y-6">
          <div>
            <h4 className="text-white/50 text-[10px] tracking-widest mb-2">夢境留言</h4>
            <CommentForm
              dreamId={dreamId}
              targetType="dream"
              targetId={dreamId}
              participants={participants}
              currentEmail={user?.email ?? ''}
              onCommentCreated={fetchComments}
              placeholder="留言..."
            />
            <div className="mt-2">
              <CommentList
                comments={dreamComments}
                participants={participants}
                currentEmail={user?.email ?? ''}
                onReply={setReplyTo}
                onDelete={handleDelete}
              />
            </div>
          </div>
          {mediaItems.map(m => (
            <div key={`${m.type}-${m.id}`}>
              <h4 className="text-white/50 text-[10px] tracking-widest mb-2">
                {m.type === 'video' ? '影片' : '漫畫'}留言
              </h4>
              <CommentForm
                dreamId={dreamId}
                targetType={m.type}
                targetId={m.id}
                participants={participants}
                currentEmail={user?.email ?? ''}
                onCommentCreated={fetchComments}
                placeholder="留言..."
              />
              <div className="mt-2">
                <CommentList
                  comments={mediaComments(m.type, m.id)}
                  participants={participants}
                  currentEmail={user?.email ?? ''}
                  onReply={setReplyTo}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
