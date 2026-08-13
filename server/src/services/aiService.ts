import { config } from '../config'

export async function generateTitleSuggestions(
  description: string,
  options: { gcpProjectId?: string; gcpLocation?: string; token?: string } = {},
): Promise<string[]> {
  const gcpProjectId = options.gcpProjectId || config.systemGcpProjectId
  const prompt = `請根據以下夢境內容，產生 3 個簡短、富有詩意或吸引人的夢境標題（繁體中文），每行一個標題，不要有編號或額外說明：\n${description}`
  const systemPrompt = '你是一個夢境解析與命名大師。請只輸出 3 行標題。'

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    system_instruction: { parts: [{ text: systemPrompt }] },
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const model = 'gemini-3.5-flash'
  const res = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/${model}:generateContent`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Gemini title generation failed: ${errorText}`)
  }

  const data = (await res.json()) as any
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text
    .split('\n')
    .map((line: string) => line.replace(/^[\d\s.、-]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

export async function generateComicImage(
  prompt: string,
  referenceImage?: { bytesBase64Encoded: string; mimeType: string },
  options: { gcpProjectId?: string; token?: string } = {},
): Promise<{ bytesBase64Encoded: string; mimeType: string }> {
  const gcpProjectId = options.gcpProjectId || config.systemGcpProjectId
  const parts: Array<Record<string, unknown>> = [{ text: prompt }]

  if (referenceImage) {
    parts.push({
      inlineData: {
        mimeType: referenceImage.mimeType,
        data: referenceImage.bytesBase64Encoded,
      },
    })
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const model = 'gemini-3.1-flash-image'
  const res = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/global/publishers/google/models/${model}:generateContent`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: { role: 'user', parts },
        generation_config: { response_modalities: ['TEXT', 'IMAGE'] },
      }),
    },
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Imagen API request failed: ${errorText}`)
  }

  const data = (await res.json()) as any
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
    throw new Error('Imagen returned no image data')
  }

  return { bytesBase64Encoded, mimeType: mimeType || 'image/png' }
}

export async function triggerVeoVideo(
  prompt: string,
  options: {
    aspectRatio?: string
    resolution?: string
    referenceImage?: { bytesBase64Encoded: string; mimeType: string }
    gcpProjectId?: string
    gcpLocation?: string
    token?: string
  } = {},
): Promise<{ name: string }> {
  const gcpProjectId = options.gcpProjectId || config.systemGcpProjectId
  const gcpLocation = options.gcpLocation || config.systemGcpLocation

  const parameters: Record<string, string> = {}
  if (options.aspectRatio) parameters.aspectRatio = options.aspectRatio
  if (options.resolution) parameters.resolution = options.resolution

  const instance: Record<string, unknown> = { prompt }
  if (options.referenceImage) {
    instance.referenceImages = [
      {
        referenceType: 'asset',
        image: {
          bytesBase64Encoded: options.referenceImage.bytesBase64Encoded,
          mimeType: options.referenceImage.mimeType,
        },
      },
    ]
    parameters.personGeneration = 'allow'
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const model = 'veo-3.1-fast-generate-001'
  const res = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${model}:predictLongRunning`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instances: [instance],
        parameters,
      }),
    },
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Veo API request failed: ${errorText}`)
  }

  return (await res.json()) as { name: string }
}

export async function pollVeoOperation(
  operationName: string,
  options: { gcpProjectId?: string; gcpLocation?: string; token?: string } = {}
): Promise<{ bytesBase64Encoded: string; mimeType: string }> {
  const gcpProjectId = options.gcpProjectId || config.systemGcpProjectId
  const gcpLocation = options.gcpLocation || config.systemGcpLocation
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }
  
  while (true) {
    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/${operationName}`,
      { headers }
    )
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to poll operation: ${errorText}`)
    }
    const data = await res.json() as any
    if (data.done) {
      if (data.error) throw new Error(data.error.message || 'Operation failed')
      
      let base64 = ''
      let mime = ''
      
      const genSamples = data.response?.generateVideoResponse?.generatedSamples
      if (genSamples && genSamples.length > 0 && genSamples[0].video?.bytesBase64Encoded) {
        base64 = genSamples[0].video.bytesBase64Encoded
        mime = genSamples[0].video.mimeType || 'video/mp4'
      } else if (data.response?.videos && data.response.videos.length > 0) {
        base64 = data.response.videos[0].bytesBase64Encoded
        mime = data.response.videos[0].mimeType || 'video/mp4'
      }
      
      if (!base64) {
        throw new Error('No video data found in operation response')
      }
      
      return { bytesBase64Encoded: base64, mimeType: mime }
    }
    
    // Wait 10 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
}

