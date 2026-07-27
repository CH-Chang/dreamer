import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface GeminiTextResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

class GeminiTextClient {
  private model = 'gemini-3.5-flash'

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')
    const { gcpProjectId } = useSettingsStore.getState().settings
    if (!gcpProjectId) throw new Error('GCP Project ID not configured')

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: prompt }] },
    ]

    const body: Record<string, unknown> = { contents }
    if (systemPrompt) {
      body.system_instruction = { parts: [{ text: systemPrompt }] }
    }

    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/${this.model}:generateContent`,
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
      const bodyText = await res.text()
      throw new Error(`Gemini API request failed: ${bodyText}`)
    }

    const data: GeminiTextResponse = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned no text')

    return text
  }
}

export const geminiTextClient = new GeminiTextClient()
