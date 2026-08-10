import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getEditLogRepository } from '../repositories/factory'
import type { EditLogEntry } from '../../../shared/types/editLog'

export const editLogsRoute = new Hono<AuthEnv>()

editLogsRoute.get('/', async (c) => {
  const dreamId = c.req.query('dream_id') || ''
  const repo = getEditLogRepository()
  const list = await repo.findByDreamId(dreamId)
  return c.json(list)
})

editLogsRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<Partial<EditLogEntry>>()
  const repo = getEditLogRepository()
  const now = new Date().toISOString()
  const created = await repo.create({
    dream_id: body.dream_id || '',
    edited_at: body.edited_at || now,
    changes: body.changes || {},
  })
  return c.json(created, 201)
})
