import { useAuthStore } from '../stores/authStore'

export async function uploadImage(
  base64: string,
  mimeType: string,
  fileName: string,
  folderName: string,
): Promise<string> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base64Data: base64,
      mimeType,
      filename: fileName,
      folderName,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Media upload failed: ${err}`)
  }

  const data: { fileId: string; driveUrl: string } = await res.json()
  return data.fileId
}

export async function uploadVideo(
  base64: string,
  mimeType: string,
  fileName: string,
  folderName: string,
): Promise<string> {
  return uploadImage(base64, mimeType, fileName, folderName)
}
