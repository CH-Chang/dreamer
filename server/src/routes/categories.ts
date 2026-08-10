import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getCategoryRepository } from '../repositories/factory'
import type { CreateCategoryInput, UpdateCategoryInput } from '../../../shared/types/category'

export const categoriesRoute = new Hono<AuthEnv>()

categoriesRoute.get('/', async (c) => {
  const email = c.req.query('email') || ''
  const repo = getCategoryRepository()
  const list = await repo.findAll(email)
  return c.json(list)
})

categoriesRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<CreateCategoryInput>()
  const repo = getCategoryRepository()
  const created = await repo.create(body)
  return c.json(created, 201)
})

categoriesRoute.put('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<UpdateCategoryInput>()
  const repo = getCategoryRepository()
  const updated = await repo.update(id, body)
  return c.json(updated)
})

categoriesRoute.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const repo = getCategoryRepository()
  await repo.delete(id)
  return c.json({ success: true })
})
