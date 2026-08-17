import { Hono } from 'hono'
import { getServerAccessToken } from '../lib/googleAuth'
import { authMiddleware, type AuthEnv } from '../middleware/auth'
import { ensureDriveFolder, uploadBase64ToDrive } from '../lib/driveClient'
import { config } from '../config'

export const mediaRoute = new Hono<AuthEnv>()

mediaRoute.post('/upload', authMiddleware, async (c) => {
  const body = await c.req.json<{
    base64Data: string
    mimeType: string
    filename: string
    folderName?: string
  }>()

  if (!body.base64Data || !body.mimeType || !body.filename) {
    return c.json({ error: 'Missing required upload fields: base64Data, mimeType, filename' }, 400)
  }

  try {
    const folderName = body.folderName || config.driveFolderName
    const folderId = await ensureDriveFolder(folderName)
    const fileId = await uploadBase64ToDrive(body.filename, body.base64Data, body.mimeType, folderId)

    return c.json({
      fileId,
      driveUrl: `drive://${fileId}`,
    })
  } catch (err) {
    console.error('Failed to upload media to drive:', err)
    return c.json({ error: 'Failed to upload media' }, 500)
  }
})

mediaRoute.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId')
  const authHeader = c.req.header('Authorization') || ''
  const queryToken = c.req.query('token') || ''
  const userToken = (authHeader.replace('Bearer ', '') || queryToken).trim()
  const serverToken = await getServerAccessToken()
  const token = serverToken || userToken || process.env.GOOGLE_ACCESS_TOKEN || ''

  try {
    let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.ok && userToken && userToken !== token) {
      res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
    }

    if (!res.ok) {
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

