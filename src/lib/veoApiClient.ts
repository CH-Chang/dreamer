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

interface GenerateVideoOptions {
  prompt: string
  aspectRatio?: string
  resolution?: string
}

class VeoApiClient {
  private model = 'veo-3.1-lite-generate-001'

  async generateVideo(options: GenerateVideoOptions): Promise<VeoGenerateResponse> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')

    const { gcpProjectId, gcpLocation } = useSettingsStore.getState().settings
    if (!gcpProjectId) throw new Error('GCP Project ID not configured')

    const parameters: Record<string, string> = {}
    if (options.aspectRatio) parameters.aspectRatio = options.aspectRatio
    if (options.resolution) parameters.resolution = options.resolution

    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${this.model}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          instances: [{ prompt: options.prompt }],
          parameters,
        }),
      },
    )

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

    const url = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${this.model}:fetchPredictOperation`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ operationName: name }),
    })
    if (!res.ok) throw new Error('Failed to get operation status')
    return res.json()
  }}

export const veoApiClient = new VeoApiClient()
