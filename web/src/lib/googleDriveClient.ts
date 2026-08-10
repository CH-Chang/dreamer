import { useAuthStore } from '../stores/authStore'

async function ensureFolder(token: string, folderName: string): Promise<string> {
  const searchUrl =
    'https://www.googleapis.com/drive/v3/files?q=' +
    encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`) +
    '&fields=files(id)'

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!searchRes.ok) throw new Error('Failed to search Drive folder')
  const searchData: { files?: Array<{ id: string }> } = await searchRes.json()
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })
  if (!createRes.ok) throw new Error('Failed to create Drive folder')
  const file: { id: string } = await createRes.json()
  return file.id
}

export async function uploadVideo(
  base64: string,
  mimeType: string,
  fileName: string,
  folderName: string,
): Promise<string> {
  const token = useAuthStore.getState().token
  if (!token) throw new Error('Not authenticated')

  const folderId = await ensureFolder(token, folderName)

  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })

  const metadata = { name: fileName, mimeType, parents: [folderId] }

  const multipartBody = new FormData()
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: 'application/json; charset=UTF-8',
  })
  multipartBody.append('metadata', metadataBlob)
  multipartBody.append('media', blob, fileName)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: multipartBody,
    },
  )

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Drive upload failed: ${errBody}`)
  }

  const data: { id: string } = await res.json()
  return data.id
}

export async function uploadImage(
  base64: string,
  mimeType: string,
  fileName: string,
  folderName: string,
): Promise<string> {
  return uploadVideo(base64, mimeType, fileName, folderName)
}
