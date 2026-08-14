import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getDreamRepository } from '../repositories/factory'
import { generateTitleSuggestions } from '../services/aiService'
import type { CreateDreamInput, UpdateDreamInput } from '../../../shared/types/dream'

export const dreamsRoute = new Hono<AuthEnv>()

dreamsRoute.get('/public', async (c) => {
  const cursor = c.req.query('cursor')
  const limit = c.req.query('limit')
  const repo = getDreamRepository()
  const result = await repo.findPublicPage(cursor, limit ? Number(limit) : 10)
  return c.json(result)
})

dreamsRoute.get('/by-date', async (c) => {
  const email = c.req.query('email') || ''
  const date = c.req.query('date') || ''
  const repo = getDreamRepository()
  const dream = await repo.findByDate(email, date)
  return dream ? c.json(dream) : c.json(null)
})

dreamsRoute.get('/by-month', async (c) => {
  const email = c.req.query('email') || ''
  const year = Number(c.req.query('year'))
  const month = Number(c.req.query('month'))
  const repo = getDreamRepository()
  const dreams = await repo.findByMonth(email, year, month)
  return c.json(dreams)
})

dreamsRoute.get('/', async (c) => {
  const repo = getDreamRepository()
  const email = c.req.query('email')
  if (email) {
    const dreams = await repo.findAllByEmail(email)
    return c.json(dreams)
  }
  const cursor = c.req.query('cursor')
  const limit = c.req.query('limit')
  const result = await repo.findPublicPage(cursor, limit ? Number(limit) : 10)
  return c.json(result)
})

dreamsRoute.get('/:id', async (c) => {
  const id = c.req.param('id')
  const repo = getDreamRepository()
  const dream = await repo.findById(id)
  if (!dream) {
    return c.json({ error: 'Dream not found' }, 404)
  }
  return c.json(dream)
})

dreamsRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const body = await c.req.json<CreateDreamInput>()

  if (!body.date || !body.description) {
    return c.json({ error: 'Missing required fields: date and description' }, 400)
  }

  const repo = getDreamRepository()

  let title = body.title
  let titleCandidates: string[] = body.title_candidates || []

  // Generate 3 candidate titles using Gemini LLM upon dream creation
  if (titleCandidates.length === 0) {
    try {
      const suggestions = await generateTitleSuggestions(body.description, { token })
      if (suggestions.length > 0) {
        titleCandidates = suggestions
        if (!title) {
          title = suggestions[0]
        }
      }
    } catch (err) {
      console.warn('AI title generation error:', err)
    }
  }

  const created = await repo.create({
    ...body,
    title: title || '',
    title_candidates: titleCandidates,
    visibility: body.visibility ?? 'public',
    email: user.email,
  })
  return c.json(created, 201)
})

dreamsRoute.put('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<UpdateDreamInput>()
  const repo = getDreamRepository()

  try {
    const updated = await repo.update(id, body)
    return c.json(updated)
  } catch (err) {
    return c.json({ error: (err as Error).message || 'Failed to update dream' }, 404)
  }
})

dreamsRoute.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const repo = getDreamRepository()
  await repo.delete(id, user.email)
  return c.json({ success: true })
})
