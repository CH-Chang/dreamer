import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface VeoGenerateResponse {
  name: string
}

interface VeoOperationResponse {
  name?: string
  done: boolean
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          uri: string
        }
      }>
    }
    videos?: Array<{
      bytesBase64Encoded: string
      mimeType: string
    }>
  }
  error?: { message: string }
}

interface ReferenceImage {
  bytesBase64Encoded: string
  mimeType: string
}

interface GenerateVideoOptions {
  prompt: string
  aspectRatio?: string
  resolution?: string
  referenceImage?: ReferenceImage
}

class VeoApiClient {
  async generateVideo(options: GenerateVideoOptions): Promise<VeoGenerateResponse> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')

    const { gcpProjectId, gcpLocation } = useSettingsStore.getState().settings

    const res = await fetch('/api/ai/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...options,
        gcpProjectId,
        gcpLocation,
      }),
    })

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Veo API request failed: ${bodyText}`)
    }
    return res.json()
  }

  async getOperation(name: string): Promise<VeoOperationResponse> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')

    const { gcpProjectId, gcpLocation } = useSettingsStore.getState().settings

    const res = await fetch('/api/ai/video-operation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        operationName: name,
        gcpProjectId,
        gcpLocation,
      }),
    })

    if (!res.ok) throw new Error('Failed to get operation status')
    return res.json()
  }
}

export const veoApiClient = new VeoApiClient()
