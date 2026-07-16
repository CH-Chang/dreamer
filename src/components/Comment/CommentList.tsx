import type { Comment } from '../../types/comment'
import type { Participant } from './CommentForm'
import { CommentItem } from './CommentItem'

interface Props {
  comments: Comment[]
  participants: Participant[]
  currentEmail: string
  onReply: (parentId: string) => void
  onDelete: (id: string) => void
}

export function CommentList({ comments, participants, currentEmail, onReply, onDelete }: Props) {
  const roots = comments.filter(c => !c.parent_id)
  const repliesByParent = new Map<string, Comment[]>()
  for (const c of comments) {
    if (c.parent_id) {
      const arr = repliesByParent.get(c.parent_id) ?? []
      arr.push(c)
      repliesByParent.set(c.parent_id, arr)
    }
  }

  if (comments.length === 0) {
    return <p className="text-gray-400 text-[10px] tracking-wider py-4">尚無留言</p>
  }

  return (
    <div className="space-y-1">
      {roots.map(root => (
        <div key={root.id}>
          <CommentItem
            comment={root}
            participants={participants}
            currentEmail={currentEmail}
            onReply={onReply}
            onDelete={onDelete}
          />
          {(repliesByParent.get(root.id) ?? []).map(reply => (
            <div key={reply.id} className="ml-6 pl-3 border-l border-gray-100">
              <CommentItem
                comment={reply}
                participants={participants}
                currentEmail={currentEmail}
                onReply={() => {}}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
