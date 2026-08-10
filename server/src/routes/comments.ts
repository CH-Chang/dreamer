import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getCommentRepository } from '../repositories/factory'
import type { CreateCommentInput } from '../../../shared/types/comment'

export const commentsRoute = new Hono<AuthEnv>()

commentsRoute.get('/', async (c) => {
  const dreamId = c.req.query('dream_id')
  const targetType = c.req.query('target_type')
  const targetId = c.req.query('target_id')
  const repo = getCommentRepository()

  if (targetType && targetId) {
    const comments = await repo.findByTarget(targetType, targetId)
    return c.json(comments)
  }

  if (dreamId) {
    const comments = await repo.findByDreamId(dreamId)
    return c.json(comments)
  }

  return c.json({ error: 'Missing dream_id or target_type and target_id query parameters' }, 400)
})

commentsRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<CreateCommentInput>()
  if (!body.content || (!body.dream_id && !body.target_id)) {
    return c.json({ error: 'Missing required comment fields' }, 400)
  }

  const repo = getCommentRepository()
  const comment = await repo.create({
    ...body,
    email: user.email,
  })
  return c.json(comment, 201)
})

commentsRoute.put('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ content: string }>()
  if (!body.content) {
    return c.json({ error: 'Missing content field' }, 400)
  }

  const repo = getCommentRepository()
  try {
    const updated = await repo.update(id, body)
    return c.json(updated)
  } catch (err) {
    return c.json({ error: (err as Error).message || 'Failed to update comment' }, 404)
  }
})

commentsRoute.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const repo = getCommentRepository()
  await repo.delete(id)
  return c.json({ success: true })
})
