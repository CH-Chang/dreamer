import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface ImagenGenerateResponse {
  predictions: Array<{
    bytesBase64Encoded: string
    mimeType: string
  }>
}

class ImagenApiClient {
  private model = 'imagen-3.0-generate-001'

  async generateImage(prompt: string): Promise<{ bytesBase64Encoded: string; mimeType: string }> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')
    const { gcpProjectId, gcpLocation } = useSettingsStore.getState().settings
    if (!gcpProjectId) throw new Error('GCP Project ID not configured')

    const res = await fetch(
      `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${this.model}:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      },
    )

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Imagen API request failed: ${bodyText}`)
    }

    const data: ImagenGenerateResponse = await res.json()
    const prediction = data.predictions?.[0]
    if (!prediction?.bytesBase64Encoded) throw new Error('Imagen returned no image data')

    return {
      bytesBase64Encoded: prediction.bytesBase64Encoded,
      mimeType: prediction.mimeType || 'image/png',
    }
  }
}

export const imagenApiClient = new ImagenApiClient()