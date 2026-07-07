import { describe, it, expect, beforeEach, vi } from 'vitest'
import { veoApiClient } from '../veoApiClient'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: 'test-oauth-token', user: null, isAuthenticated: false })
  useSettingsStore.setState({
    settings: { googleSheetsUrl: '', googleClientId: '', gcpProjectId: 'test-project', gcpLocation: 'us-central1', driveFolderName: '' },
  })
})

describe('veoApiClient', () => {
  it('starts video generation via predictLongRunning', async () => {
    const mockResponse = { name: 'operations/123' }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await veoApiClient.generateVideo({
      prompt: 'a flying dream',
      aspectRatio: '16:9',
      resolution: '720p',
    })
    expect(result).toEqual(mockResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:predictLongRunning',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-oauth-token',
        }),
      }),
    )
  })

  it('throws when not authenticated', async () => {
    useAuthStore.setState({ token: null })
    await expect(
      veoApiClient.generateVideo({ prompt: 'test' }),
    ).rejects.toThrow('Not authenticated')
  })

  it('throws when GCP project not configured', async () => {
    useSettingsStore.setState({
      settings: { googleSheetsUrl: '', googleClientId: '', gcpProjectId: '', gcpLocation: 'us-central1', driveFolderName: '' },
    })
    await expect(
      veoApiClient.generateVideo({ prompt: 'test' }),
    ).rejects.toThrow('GCP Project ID not configured')
  })

  it('throws on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('error body'),
    })
    await expect(
      veoApiClient.generateVideo({ prompt: 'test' }),
    ).rejects.toThrow('Veo API request failed: error body')
  })

  it('gets operation status', async () => {
    const mockResponse = { done: true, response: { generateVideoResponse: { generatedSamples: [] } } }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await veoApiClient.getOperation('operations/123')
    expect(result).toEqual(mockResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:fetchPredictOperation',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-oauth-token',
        }),
        body: JSON.stringify({ operationName: 'operations/123' }),
      }),
    )
  })
})
