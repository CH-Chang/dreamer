import { config } from '../config'
import { requestContext } from './context'

function getToken(overrideToken?: string): string {
  if (overrideToken) return overrideToken
  const ctx = requestContext.getStore()
  if (ctx?.token) return ctx.token
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN
  throw new Error('No Google Access Token available')
}

export async function ensureDriveFolder(folderName: string = config.driveFolderName, token?: string): Promise<string> {
  const t = getToken(token)
  
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`)
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${t}` }
  })
  
  if (!searchRes.ok) {
    throw new Error(`Failed to search Drive folder: ${await searchRes.text()}`)
  }
  
  const data = (await searchRes.json()) as any
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }
  
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  })
  
  if (!createRes.ok) {
    throw new Error(`Failed to create Drive folder: ${await createRes.text()}`)
  }
  
  const created = (await createRes.json()) as any
  return created.id
}

export async function uploadBase64ToDrive(
  filename: string,
  base64Data: string,
  mimeType: string,
  folderId?: string,
  token?: string
): Promise<string> {
  const t = getToken(token)
  const actualFolderId = folderId || await ensureDriveFolder(config.driveFolderName, t)
  
  const metadata = {
    name: filename,
    parents: [actualFolderId]
  }
  
  const boundary = '-------314159265358979323846'
  const startDelimiter = `--${boundary}\r\n`
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`
  
  const multipartRequestBody =
    startDelimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter
    
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${t}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartRequestBody.length)
    },
    body: multipartRequestBody
  })
  
  if (!res.ok) {
    throw new Error(`Failed to upload to Drive: ${await res.text()}`)
  }
  
  const data = (await res.json()) as any
  const fileId = data.id

  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    })
  } catch {
    // Ignore permission grant failure
  }

  return fileId
}
