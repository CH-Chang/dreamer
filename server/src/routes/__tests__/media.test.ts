import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../../index'

vi.mock('../../lib/driveClient', () => ({
  ensureDriveFolder: vi.fn().mockResolvedValue('test-folder-id'),
  uploadBase64ToDrive: vi.fn().mockResolvedValue('uploaded-file-id-123'),
}))

vi.mock('google-auth-library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('google-auth-library')>()
  return {
    ...actual,
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        }),
      }),
    })),
  }
})

describe('Media Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /api/media/upload uploads base64 file and returns driveUrl', async () => {
    const res = await app.request('/api/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        base64Data: 'SGVsbG8gV29ybGQ=',
        mimeType: 'image/jpeg',
        filename: 'avatar.jpg',
      }),
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data.fileId).toBe('uploaded-file-id-123')
    expect(data.driveUrl).toBe('drive://uploaded-file-id-123')
  })

  it('POST /api/media/upload returns 400 when missing fields', async () => {
    const res = await app.request('/api/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        base64Data: 'SGVsbG8gV29ybGQ=',
      }),
    })

    expect(res.status).toBe(400)
  })
})
