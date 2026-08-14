import { Hono } from 'hono'

export const mediaRoute = new Hono()

mediaRoute.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId')
  const authHeader = c.req.header('Authorization') || ''
  const queryToken = c.req.query('token') || ''
  const userToken = (authHeader.replace('Bearer ', '') || queryToken).trim()
  const fallbackToken = process.env.GOOGLE_ACCESS_TOKEN || ''

  try {
    let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    })

    if (res.status === 401 && fallbackToken && userToken !== fallbackToken) {
      res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${fallbackToken}` },
      })
    }

    if (res.status === 401 && userToken) {
      res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`)
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error(`Media proxy failed for file ${fileId} (status ${res.status}):`, errText)
      return c.text(`Drive fetch failed: ${errText}`, res.status as any)
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await res.arrayBuffer()
    return c.body(arrayBuffer, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    })
  } catch (err) {
    console.error(`Media proxy error for file ${fileId}:`, err)
    return c.text('Failed to proxy media', 500)
  }
})
