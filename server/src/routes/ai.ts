import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'

export const aiRoute = new Hono<AuthEnv>()

aiRoute.use('*', authMiddleware)

// 1. Generate Text (Gemini)
aiRoute.post('/generate-text', async (c) => {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const { prompt, systemPrompt, gcpProjectId = process.env.GCP_PROJECT_ID || 'dreamer-448202' } = await c.req.json<{
    prompt: string
    systemPrompt?: string
    gcpProjectId?: string
  }>()

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]
  const body: Record<string, unknown> = { contents }
  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] }
  }

  const model = 'gemini-3.5-flash'
  const res = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const errorText = await res.text()
    return c.json({ error: `Gemini API failed: ${errorText}` }, res.status as any)
  }

  const data = await res.json() as any
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    return c.json({ error: 'Gemini returned no text' }, 500)
  }

  return c.json({ text })
})

// 2. Generate Video (Veo)
aiRoute.post('/generate-video', async (c) => {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const {
    prompt,
    aspectRatio,
    resolution,
    referenceImage,
    gcpProjectId = process.env.GCP_PROJECT_ID || 'dreamer-448202',
    gcpLocation = process.env.GCP_LOCATION || 'us-central1',
  } = await c.req.json<{
    prompt: string
    aspectRatio?: string
    resolution?: string
    referenceImage?: { bytesBase64Encoded: string; mimeType: string }
    gcpProjectId?: string
    gcpLocation?: string
  }>()

  const parameters: Record<string, string> = {}
  if (aspectRatio) parameters.aspectRatio = aspectRatio
  if (resolution) parameters.resolution = resolution

  const instance: Record<string, unknown> = { prompt }
  if (referenceImage) {
    instance.referenceImages = [{
      referenceType: 'asset',
      image: {
        bytesBase64Encoded: referenceImage.bytesBase64Encoded,
        mimeType: referenceImage.mimeType,
      },
    }]
    parameters.personGeneration = 'allow'
  }

  const model = 'veo-3.1-fast-generate-001'
  const res = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${model}:predictLongRunning`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        instances: [instance],
        parameters,
      }),
    },
  )

  if (!res.ok) {
    const errorText = await res.text()
    return c.json({ error: `Veo API failed: ${errorText}` }, res.status as any)
  }

  const data = await res.json()
  return c.json(data)
})

// 3. Poll Video Operation (Veo)
aiRoute.post('/video-operation', async (c) => {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const {
    operationName,
    gcpProjectId = process.env.GCP_PROJECT_ID || 'dreamer-448202',
    gcpLocation = process.env.GCP_LOCATION || 'us-central1',
  } = await c.req.json<{
    operationName: string
    gcpProjectId?: string
    gcpLocation?: string
  }>()

  const model = 'veo-3.1-fast-generate-001'
  const url = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${model}:fetchPredictOperation`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ operationName }),
  })

  if (!res.ok) {
    return c.json({ error: 'Failed to fetch video operation status' }, res.status as any)
  }

  const data = await res.json()
  return c.json(data)
})

// 4. Generate Image (Imagen)
aiRoute.post('/generate-image', async (c) => {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const {
    prompt,
    referenceImage,
    gcpProjectId = process.env.GCP_PROJECT_ID || 'dreamer-448202',
  } = await c.req.json<{
    prompt: string
    referenceImage?: { bytesBase64Encoded: string; mimeType: string }
    gcpProjectId?: string
  }>()

  const parts: Array<Record<string, unknown>> = [{ text: prompt }]
  if (referenceImage) {
    parts.push({
      inlineData: {
        mimeType: referenceImage.mimeType,
        data: referenceImage.bytesBase64Encoded,
      },
    })
  }

  const model = 'gemini-3.1-flash-image'
  const res = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/global/publishers/google/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        contents: {
          role: 'user',
          parts,
        },
        generation_config: {
          response_modalities: ['TEXT', 'IMAGE'],
        },
      }),
    },
  )

  if (!res.ok) {
    const errorText = await res.text()
    return c.json({ error: `Imagen API failed: ${errorText}` }, res.status as any)
  }

  const data = await res.json() as any
  const responseParts = data.candidates?.[0]?.content?.parts || []
  let bytesBase64Encoded = ''
  let mimeType = ''

  for (const p of responseParts) {
    if (p.inlineData) {
      bytesBase64Encoded = p.inlineData.data
      mimeType = p.inlineData.mimeType
      break
    }
    if (p.inline_data) {
      bytesBase64Encoded = p.inline_data.data
      mimeType = p.inline_data.mime_type
      break
    }
  }

  if (!bytesBase64Encoded) {
    return c.json({ error: 'Imagen returned no image data' }, 500)
  }

  return c.json({ bytesBase64Encoded, mimeType: mimeType || 'image/png' })
})
