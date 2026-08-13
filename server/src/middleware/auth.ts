import type { MiddlewareHandler } from 'hono'
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client()

export interface AuthUser {
  email: string
  name: string
  picture: string
  ai_mode?: 'system' | 'custom'
  custom_gcp_project_id?: string
  custom_gcp_location?: string
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
    let email = ''
    let name = ''
    let picture = ''

    // Try verifying as Google ID Token first
    try {
      const ticket = await client.verifyIdToken({ idToken: token })
      const payload = ticket.getPayload()
      if (payload && payload.email) {
        email = payload.email
        name = payload.name ?? ''
        picture = payload.picture ?? ''
      }
    } catch {
      // Fallback: Verify as Google OAuth Access Token via userinfo endpoint
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (userinfoRes.ok) {
        const info = (await userinfoRes.json()) as { email?: string; name?: string; picture?: string }
        if (info && info.email) {
          email = info.email
          name = info.name ?? ''
          picture = info.picture ?? ''
        }
      }
    }

    if (!email) {
      return c.json({ error: 'Unauthorized: Invalid token' }, 401)
    }

    c.set('user', {
      email,
      name,
      picture,
    })

    const { requestContext } = await import('../lib/context')
    await requestContext.run({ token }, async () => {
      await next()
    })
  } catch (err) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401)
  }
}

