import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getDreamRepository } from '../repositories/factory'
import type { CreateDreamInput, UpdateDreamInput } from '../../../shared/types/dream'

export const dreamsRoute = new Hono<AuthEnv>()

dreamsRoute.get('/', async (c) => {
  const repo = getDreamRepository()
  const email = c.req.query('email')
  const date = c.req.query('date')
  const year = c.req.query('year')
  const month = c.req.query('month')
  const cursor = c.req.query('cursor')
  const limit = c.req.query('limit')

  if (email && date) {
    const dream = await repo.findByDate(email, date)
    return dream ? c.json(dream) : c.json({ error: 'Dream not found' }, 404)
  }

  if (email && year !== undefined && month !== undefined) {
    const dreams = await repo.findByMonth(email, Number(year), Number(month))
    return c.json(dreams)
  }

  if (email) {
    const dreams = await repo.findAllByEmail(email)
    return c.json(dreams)
  }

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
  const body = await c.req.json<CreateDreamInput>()
  if (!body.date || !body.description) {
    return c.json({ error: 'Missing required fields: date and description' }, 400)
  }

  const repo = getDreamRepository()
  const created = await repo.create({
    ...body,
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
