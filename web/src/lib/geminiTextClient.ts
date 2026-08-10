import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

class GeminiTextClient {
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')
    const { gcpProjectId } = useSettingsStore.getState().settings

    const res = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt, systemPrompt, gcpProjectId }),
    })

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Gemini API request failed: ${bodyText}`)
    }

    const data = await res.json()
    if (!data.text) throw new Error('Gemini returned no text')

    return data.text
  }
}

export const geminiTextClient = new GeminiTextClient()
