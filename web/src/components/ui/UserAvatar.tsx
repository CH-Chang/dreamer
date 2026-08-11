import { useDriveImage } from '../../lib/useDriveImage'

interface Props {
  avatarUrl?: string | null
  name?: string | null
  className?: string
}

export function UserAvatar({ avatarUrl, name, className = 'w-5 h-5 rounded-full' }: Props) {
  const imageSrc = useDriveImage(avatarUrl)

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={name || 'Avatar'}
        className={`${className} object-cover flex-shrink-0`}
        onError={(e) => {
          // If image fails to load, fallback to initial circle
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  const initial = (name || 'U').trim().charAt(0).toUpperCase()

  return (
    <div
      className={`${className} bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-medium flex-shrink-0 select-none`}
    >
      {initial}
    </div>
  )
}
