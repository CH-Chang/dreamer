import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getComicRepository, getDreamRepository, getRateLimitRepository } from '../repositories/factory'
import { generateComicImage } from '../services/aiService'
import { config } from '../config'
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
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const body = await c.req.json<{
    dream_id: string
    with_character?: boolean
    language?: string
    mode?: 'system' | 'custom'
    custom_gcp_project_id?: string
    custom_gcp_location?: string
  }>()

  const mode = body.mode || user.ai_mode || 'system'
  if (mode === 'system') {
    const allowed = await getRateLimitRepository().checkLimit(user.email, 'comic')
    if (!allowed) {
      return c.json({ error: 'Rate limit exceeded' }, 429)
    }
  }

  const custom_gcp_project_id = body.custom_gcp_project_id || user.custom_gcp_project_id
  const gcpProjectId = mode === 'custom' ? (custom_gcp_project_id || config.systemGcpProjectId) : config.systemGcpProjectId

  const comicRepo = getComicRepository()
  const dreamRepo = getDreamRepository()

  const dream = await dreamRepo.findById(body.dream_id)
  const description = dream?.description || '夢境描述'

  const created = await comicRepo.create({
    dream_id: body.dream_id,
    email: user.email,
    with_character: body.with_character,
  })

  try {
    const lang = body.language || user.language || 'zh-TW'
    const promptPrefix = lang === 'en-US' ? 'Dream comic illustration style: ' : (lang === 'zh-CN' ? '梦境连环漫画插画风格：' : '夢境連環漫畫插畫風格：')
    const prompt = `${promptPrefix}${description}`
    const { getServerAccessToken } = await import('../lib/googleAuth')
    const serverToken = await getServerAccessToken()
    const { bytesBase64Encoded, mimeType } = await generateComicImage(
      prompt,
      undefined,
      { gcpProjectId, token: serverToken || token },
    )

    const { uploadBase64ToDrive } = await import('../lib/driveClient')
    const fileId = await uploadBase64ToDrive(
      `dream-comic-${created.id}.png`,
      bytesBase64Encoded,
      mimeType,
      undefined,
      token,
    )
    const imageUrl = `drive://${fileId}`

    const updated = await comicRepo.updateStatus(created.id, 'done', imageUrl)
    return c.json(updated, 201)
  } catch (err) {
    console.error('Comic generation failed error:', err)
    const updated = await comicRepo.updateStatus(created.id, 'failed')
    return c.json(updated, 201)
  }
})

comicsRoute.put('/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status: ComicStatus; image_url?: string }>()
  const repo = getComicRepository()
  const updated = await repo.updateStatus(id, body.status, body.image_url)
  return c.json(updated)
})
