import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getComicRepository, getDreamRepository } from '../repositories/factory'
import { generateComicImage } from '../services/aiService'
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
    const prompt = `夢境連環漫畫插畫風格：${description}`
    const { bytesBase64Encoded, mimeType } = await generateComicImage(prompt)
    const imageUrl = `data:${mimeType};base64,${bytesBase64Encoded}`

    const updated = await comicRepo.updateStatus(created.id, 'done', imageUrl)
    return c.json(updated, 201)
  } catch (err) {
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
