import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

export function useDriveImage(driveUrl: string | undefined | null): string | null {
  const [src, setSrc] = useState<string | null>(null)
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    if (!driveUrl) { setSrc(null); return }
    if (!driveUrl.startsWith('drive://')) { setSrc(driveUrl); return }
    if (!token) return

    let cancelled = false
    const fileId = driveUrl.replace('drive://', '')

    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch from Drive')
        return res.blob()
      })
      .then((blob) => {
        if (!cancelled) setSrc(URL.createObjectURL(blob))
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [driveUrl, token])

  return src
}
