import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getComicRepository } from '../repositories/factory'
import type { ComicStatus } from '../../../shared/types/comic'

export const comicsRoute = new Hono<AuthEnv>()

comicsRoute.get('/', async (c) => {
  const dreamId = c.req.query('dream_id') || ''
  const repo = getComicRepository()
  const list = await repo.findAllByDreamId(dreamId)
  return c.json(list)
})

comicsRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ dream_id: string; with_character?: boolean }>()
  const repo = getComicRepository()
  const created = await repo.create({
    dream_id: body.dream_id,
    email: user.email,
    with_character: body.with_character,
  })
  return c.json(created, 201)
})

comicsRoute.put('/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status: ComicStatus; image_url?: string }>()
  const repo = getComicRepository()
  const updated = await repo.updateStatus(id, body.status, body.image_url)
  return c.json(updated)
})
