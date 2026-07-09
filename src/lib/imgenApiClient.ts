import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface GeminiImagePart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiImagePart[]
    }
  }>
}

class ImagenApiClient {
  private model = 'gemini-3.1-flash-lite-image'

  async generateImage(prompt: string): Promise<{ bytesBase64Encoded: string; mimeType: string }> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')
    const { gcpProjectId } = useSettingsStore.getState().settings
    if (!gcpProjectId) throw new Error('GCP Project ID not configured')

    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/global/publishers/google/models/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          contents: {
            role: 'user',
            parts: { text: prompt },
          },
          generation_config: {
            response_modalities: ['TEXT', 'IMAGE'],
          },
        }),
      },
    )

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Imagen API request failed: ${bodyText}`)
    }

    const data: GeminiResponse = await res.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    let bytesBase64Encoded = ''
    let mimeType = ''

    for (const p of parts) {
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

    if (!bytesBase64Encoded) throw new Error('Gemini returned no image data')

    return { bytesBase64Encoded, mimeType: mimeType || 'image/png' }
  }
}

export const imagenApiClient = new ImagenApiClient()
