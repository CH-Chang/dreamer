import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getVideoRepository, getDreamRepository } from '../repositories/factory'
import { triggerVeoVideo } from '../services/aiService'
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
  const videoRepo = getVideoRepository()
  const dreamRepo = getDreamRepository()

  const dream = await dreamRepo.findById(body.dream_id)
  const description = dream?.description || '夢境描述'

  const created = await videoRepo.create({
    dream_id: body.dream_id,
    email: user.email,
    with_character: body.with_character,
  })

  try {
    await videoRepo.updateStatus(created.id, 'generating')
    const prompt = `Dream-like cinematic scene: ${description}`
    await triggerVeoVideo(prompt, { aspectRatio: '16:9', resolution: '720p' })
  } catch {
    // If trigger fails, mark failed
    await videoRepo.updateStatus(created.id, 'failed')
  }

  const result = await videoRepo.findByDreamId(body.dream_id)
  return c.json(result || created, 201)
})

videosRoute.put('/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status: VideoStatus; video_url?: string }>()
  const repo = getVideoRepository()
  const updated = await repo.updateStatus(id, body.status, body.video_url)
  return c.json(updated)
})
