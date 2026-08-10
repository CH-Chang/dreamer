import type { MiddlewareHandler } from 'hono'
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client()

export interface AuthUser {
  email: string
  name: string
  picture: string
}

export type AuthEnv = {
  Variables: {
    user: AuthUser
  }
}

export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.substring(7)
  if (!token) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return c.json({ error: 'Unauthorized: Invalid token' }, 401)
    }

    c.set('user', {
      email: payload.email,
      name: payload.name ?? '',
      picture: payload.picture ?? '',
    })

    await next()
  } catch (err) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401)
  }
}
