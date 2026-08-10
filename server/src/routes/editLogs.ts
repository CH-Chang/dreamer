import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getEditLogRepository } from '../repositories/factory'

export const editLogsRoute = new Hono<AuthEnv>()

editLogsRoute.get('/', async (c) => {
  const dreamId = c.req.query('dream_id') || ''
  const repo = getEditLogRepository()
  const list = await repo.findByDreamId(dreamId)
  return c.json(list)
})

editLogsRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<{ dream_id: string; user_email: string; action: string }>()
  const repo = getEditLogRepository()
  const created = await repo.create(body)
  return c.json(created, 201)
})
