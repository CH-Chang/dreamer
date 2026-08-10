import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getVideoRepository } from '../repositories/factory'
import type { VideoStatus } from '../../../shared/types/video'

export const videosRoute = new Hono<AuthEnv>()

videosRoute.get('/by-dream/:dreamId', async (c) => {
  const dreamId = c.req.param('dreamId')
  const repo = getVideoRepository()
  const video = await repo.findByDreamId(dreamId)
  return video ? c.json(video) : c.json(null)
})

videosRoute.get('/', async (c) => {
  const dreamId = c.req.query('dream_id') || ''
  const repo = getVideoRepository()
  const list = await repo.findAllByDreamId(dreamId)
  return c.json(list)
})

videosRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ dream_id: string; with_character?: boolean }>()
  const repo = getVideoRepository()
  const created = await repo.create({
    dream_id: body.dream_id,
    email: user.email,
    with_character: body.with_character,
  })
  return c.json(created, 201)
})

videosRoute.put('/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status: VideoStatus; video_url?: string }>()
  const repo = getVideoRepository()
  const updated = await repo.updateStatus(id, body.status, body.video_url)
  return c.json(updated)
})
