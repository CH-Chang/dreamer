import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface ReferenceImage {
  bytesBase64Encoded: string
  mimeType: string
}

class ImagenApiClient {
  async generateImage(prompt: string, referenceImage?: ReferenceImage): Promise<{ bytesBase64Encoded: string; mimeType: string }> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')
    const { gcpProjectId } = useSettingsStore.getState().settings

    const res = await fetch('/api/ai/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt, referenceImage, gcpProjectId }),
    })

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Imagen API request failed: ${bodyText}`)
    }

    const data = await res.json()
    if (!data.bytesBase64Encoded) throw new Error('Imagen returned no image data')

    return data
  }
}

export const imagenApiClient = new ImagenApiClient()
