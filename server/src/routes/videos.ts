import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getVideoRepository, getDreamRepository, getRateLimitRepository } from '../repositories/factory'
import { triggerVeoVideo } from '../services/aiService'
import { config } from '../config'
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
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const body = await c.req.json<{
    dream_id: string
    with_character?: boolean
    mode?: 'system' | 'custom'
    custom_gcp_project_id?: string
    custom_gcp_location?: string
  }>()

  const mode = body.mode || user.ai_mode || 'system'
  if (mode === 'system') {
    const allowed = await getRateLimitRepository().checkLimit(user.email, 'video')
    if (!allowed) {
      return c.json({ error: 'Rate limit exceeded' }, 429)
    }
  }

  const custom_gcp_project_id = body.custom_gcp_project_id || user.custom_gcp_project_id
  const custom_gcp_location = body.custom_gcp_location || user.custom_gcp_location
  const gcpProjectId = mode === 'custom' ? (custom_gcp_project_id || config.systemGcpProjectId) : config.systemGcpProjectId
  const gcpLocation = mode === 'custom' ? (custom_gcp_location || config.systemGcpLocation) : config.systemGcpLocation

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
    await triggerVeoVideo(prompt, {
      aspectRatio: '16:9',
      resolution: '720p',
      gcpProjectId,
      gcpLocation,
      token,
    })
  } catch (err) {
    console.error('Video generation failed error:', err)
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
