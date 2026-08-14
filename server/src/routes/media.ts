import { Hono } from 'hono'

export const mediaRoute = new Hono()

mediaRoute.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId')
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '') || process.env.GOOGLE_ACCESS_TOKEN || ''

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.ok) {
      const errText = await res.text()
      return c.text(`Drive fetch failed: ${errText}`, res.status as any)
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    return c.text('Failed to proxy media', 500)
  }
})
