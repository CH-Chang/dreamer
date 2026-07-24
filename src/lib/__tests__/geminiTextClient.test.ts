import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

vi.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ token: 'test-token' })),
  },
}))

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { gcpProjectId: 'test-project' },
    }),
  },
}))

describe('geminiTextClient', () => {
  it('sends request with correct URL and headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'title1\ntitle2\ntitle3' }] } }],
      }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    const result = await geminiTextClient.generate('test prompt', 'test system prompt')

    expect(result).toBe('title1\ntitle2\ntitle3')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callUrl = mockFetch.mock.calls[0][0]
    expect(callUrl).toContain('test-project')
    expect(callUrl).toContain('gemini-2.0-flash-001')
    expect(callUrl).toContain('generateContent')
  })

  it('throws when not authenticated', async () => {
    const authMock = await import('../../stores/authStore')
    vi.mocked(authMock.useAuthStore.getState).mockReturnValueOnce({ token: null })

    const { geminiTextClient } = await import('../geminiTextClient')
    await expect(geminiTextClient.generate('test')).rejects.toThrow('Not authenticated')
  })

  it('throws when API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'API error',
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    await expect(geminiTextClient.generate('test')).rejects.toThrow('Gemini API request failed')
  })

  it('throws when no text in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [] }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    await expect(geminiTextClient.generate('test')).rejects.toThrow('Gemini returned no text')
  })

  it('includes system_instruction when systemPrompt provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'result' }] } }],
      }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    await geminiTextClient.generate('prompt', 'system')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.system_instruction).toEqual({ parts: [{ text: 'system' }] })
  })
})
