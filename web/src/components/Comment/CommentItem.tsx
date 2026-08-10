import type { Comment } from '../../types/comment'
import type { Participant } from './CommentForm'

interface Props {
  comment: Comment
  participants: Participant[]
  currentEmail: string
  onReply: (parentId: string) => void
  onDelete: (id: string) => void
}

function renderContent(text: string, participants: Participant[]) {
  const parts = text.split(/(@\S+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1)
      const found = participants.find(p => p.name === name)
      if (found) {
        return <span key={i} className="text-blue-400">{part}</span>
      }
    }
    return <span key={i}>{part}</span>
  })
}

export function CommentItem({ comment, participants, currentEmail, onReply, onDelete }: Props) {
  const isDeleted = comment.content === '[已刪除]'

  return (
    <div className="py-2">
      <div className="flex items-start gap-2">
        {comment.email && participants.find(p => p.email === comment.email)?.avatar_url && (
          <img
            src={participants.find(p => p.email === comment.email)!.avatar_url!}
            className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {comment.email ? (
              <span className="text-gray-600 text-[10px] tracking-wider">
                {participants.find(p => p.email === comment.email)?.name ?? comment.email}
              </span>
            ) : (
              <span className="text-gray-300 text-[10px]">[已刪除]</span>
            )}
            <span className="text-gray-300 text-[9px]">
              {new Date(comment.created_at).toLocaleDateString('zh-TW')}
            </span>
          </div>
          {isDeleted ? (
            <p className="text-gray-300 text-xs italic">[已刪除]</p>
          ) : (
            <p className="text-gray-800 text-xs leading-relaxed break-words">
              {renderContent(comment.content, participants)}
            </p>
          )}
        </div>
      </div>

      {!isDeleted && !comment.parent_id && (
        <button
          onClick={() => onReply(comment.id)}
          className="ml-7 mt-1 text-gray-400 hover:text-gray-600 text-[10px] tracking-wider transition-colors"
        >
          回覆
        </button>
      )}

      {!isDeleted && comment.email === currentEmail && (
        <button
          onClick={() => onDelete(comment.id)}
          className="ml-2 mt-1 text-gray-400 hover:text-red-400 text-[10px] transition-colors"
        >
          刪除
        </button>
      )}
    </div>
  )
}
