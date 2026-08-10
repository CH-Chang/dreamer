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
      json: async () => ({ text: 'title1\ntitle2\ntitle3' }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    const result = await geminiTextClient.generate('test prompt', 'test system prompt')

    expect(result).toBe('title1\ntitle2\ntitle3')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/generate-text',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('throws when not authenticated', async () => {
    const authMock = await import('../../stores/authStore')
    vi.mocked(authMock.useAuthStore.getState).mockReturnValueOnce({ token: null } as any)

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
      json: async () => ({ text: '' }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    await expect(geminiTextClient.generate('test')).rejects.toThrow('Gemini returned no text')
  })
})
