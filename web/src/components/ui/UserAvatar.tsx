import { useState, useEffect } from 'react'
import { useDriveImage } from '../../lib/useDriveImage'

interface Props {
  avatarUrl?: string | null
  name?: string | null
  className?: string
}

export function UserAvatar({ avatarUrl, name, className = 'w-5 h-5 rounded-full' }: Props) {
  const imageSrc = useDriveImage(avatarUrl)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
  }, [avatarUrl, imageSrc])

  const initial = (name || 'U').trim().charAt(0).toUpperCase()

  if (imageSrc && !loadFailed) {
    return (
      <img
        src={imageSrc}
        alt={name || 'Avatar'}
        className={`${className} object-cover flex-shrink-0`}
        onError={() => setLoadFailed(true)}
      />
    )
  }

  return (
    <div
      className={`${className} bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-medium flex-shrink-0 select-none`}
      title={name || undefined}
    >
      {initial}
    </div>
  )
}
