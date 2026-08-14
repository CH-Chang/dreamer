import { useAuthStore } from '../stores/authStore'

const cache = new Map<string, Promise<Blob>>()

export function getVideoBlob(
  videoUrl: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const cached = cache.get(videoUrl)
  if (cached) return cached

  const promise = fetchVideoBlob(videoUrl, onProgress)
  cache.set(videoUrl, promise)
  return promise
}

async function fetchVideoBlob(
  videoUrl: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const token = useAuthStore.getState().token
  const fileId = videoUrl.replace('drive://', '')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(
    `/api/media/${fileId}`,
    { headers },
  )
  if (!res.ok) throw new Error(`Drive fetch failed: ${res.status}`)

  const total = parseInt(res.headers.get('Content-Length') || '0')

  if (!total || !res.body) {
    return res.blob()
  }

  const reader = res.body.getReader()
  let loaded = 0
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress?.(loaded / total)
  }

  return new Blob(chunks as BlobPart[], { type: 'video/mp4' })
}
