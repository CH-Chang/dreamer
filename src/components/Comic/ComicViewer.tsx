import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  imageUrl: string
}

export function ComicViewer({ imageUrl }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!imageUrl.startsWith('drive://')) return

    const fileId = imageUrl.replace('drive://', '')
    const token = useAuthStore.getState().token
    if (!token) return

    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Drive fetch failed: ${res.status}`)
        return res.blob()
      })
      .then((blob) => setObjectUrl(URL.createObjectURL(blob)))
      .catch(() => setError(true))
  }, [imageUrl])

  if (error) return <p className="text-xs text-gray-300 tracking-wider py-4">載入圖片失敗</p>

  return (
    <div className="w-full rounded-lg overflow-hidden bg-gray-50">
      {objectUrl ? (
        <img src={objectUrl} alt="夢境漫畫" className="w-full h-auto" />
      ) : (
        <div className="aspect-[3/4] flex items-center justify-center">
          <span className="text-xs text-gray-300 tracking-widest">載入中...</span>
        </div>
      )}
    </div>
  )
}
