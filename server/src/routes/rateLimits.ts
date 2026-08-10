import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getRateLimitRepository } from '../repositories/factory'
import type { RateLimitType, RateLimitScope, CreateRateLimitInput, UpdateRateLimitInput } from '../../../shared/types/rateLimit'

export const rateLimitsRoute = new Hono<AuthEnv>()

rateLimitsRoute.get('/', async (c) => {
  const type = c.req.query('type') as RateLimitType | undefined
  const scope = c.req.query('scope') as RateLimitScope | undefined
  const repo = getRateLimitRepository()

  if (type && scope) {
    const item = await repo.findByTypeAndScope(type, scope)
    return item ? c.json(item) : c.json(null)
  }

  const list = await repo.findAll()
  return c.json(list)
})

rateLimitsRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<CreateRateLimitInput>()
  const repo = getRateLimitRepository()
  const created = await repo.create(body)
  return c.json(created, 201)
})

rateLimitsRoute.put('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<UpdateRateLimitInput>()
  const repo = getRateLimitRepository()
  const updated = await repo.update(id, body)
  return c.json(updated)
})

rateLimitsRoute.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const repo = getRateLimitRepository()
  await repo.delete(id)
  return c.json({ success: true })
})
