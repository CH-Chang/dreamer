import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { getUserRepository } from '../repositories/factory'
import type { User } from '../../../shared/types/user'

export const usersRoute = new Hono<AuthEnv>()

usersRoute.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  const repo = getUserRepository()
  const profile = await repo.findByEmail(user.email)
  return c.json({
    user: profile || null,
    authUser: {
      email: user.email,
      name: user.name,
      picture: user.picture,
      language: user.language,
    },
  })
})

usersRoute.get('/count', async (c) => {
  const repo = getUserRepository()
  const count = await repo.findCount()
  return c.json({ count })
})

usersRoute.get('/:email', async (c) => {
  const email = decodeURIComponent(c.req.param('email'))
  const repo = getUserRepository()
  const profile = await repo.findByEmail(email)
  if (!profile) {
    return c.json({ error: 'User profile not found' }, 404)
  }
  return c.json(profile)
})

usersRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<Partial<User>>()
  const repo = getUserRepository()

  const existing = await repo.findByEmail(user.email)
  if (existing) {
    await repo.update(user.email, {
      name: body.name ?? user.name,
      avatar_url: body.avatar_url ?? user.picture,
      role: body.role ?? existing.role,
      language: body.language ?? existing.language,
      ai_mode: body.ai_mode ?? existing.ai_mode,
      custom_gcp_project_id: body.custom_gcp_project_id ?? existing.custom_gcp_project_id,
      custom_gcp_location: body.custom_gcp_location ?? existing.custom_gcp_location,
    })
    const updated = await repo.findByEmail(user.email)
    return c.json(updated)
  } else {
    const count = await repo.findCount()
    const created = await repo.create({
      email: user.email,
      name: body.name || user.name || '',
      avatar_url: body.avatar_url || user.picture || '',
      role: body.role || (count === 0 ? 'admin' : 'user'),
      language: body.language || 'zh-TW',
    })
    return c.json(created, 201)
  }
})

usersRoute.put('/:email', authMiddleware, async (c) => {
  const user = c.get('user')
  const email = decodeURIComponent(c.req.param('email'))

  if (user.email !== email) {
    const adminCheck = await getUserRepository().findByEmail(user.email)
    if (adminCheck?.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const body = await c.req.json<Partial<User>>()
  const repo = getUserRepository()
  const existing = await repo.findByEmail(email)
  if (!existing) {
    return c.json({ error: 'User profile not found' }, 404)
  }

  await repo.update(email, {
    name: body.name ?? existing.name,
    avatar_url: body.avatar_url ?? existing.avatar_url,
    role: body.role ?? existing.role,
    language: body.language ?? existing.language,
    ai_mode: body.ai_mode ?? existing.ai_mode,
    custom_gcp_project_id: body.custom_gcp_project_id ?? existing.custom_gcp_project_id,
    custom_gcp_location: body.custom_gcp_location ?? existing.custom_gcp_location,
  })

  const updated = await repo.findByEmail(email)
  return c.json(updated)
})
