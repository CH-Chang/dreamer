import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
  variant?: 'light' | 'dark'
}

export function Skeleton({ className = '', variant = 'light' }: SkeletonProps) {
  const bgClass =
    variant === 'dark'
      ? 'bg-neutral-800/60'
      : 'bg-gray-200/70'

  return (
    <div
      role="status"
      aria-label="載入中"
      className={`relative overflow-hidden rounded ${bgClass} ${className}`}
    >
      <motion.div
        className={`absolute inset-0 -translate-x-full bg-gradient-to-r ${
          variant === 'dark'
            ? 'from-transparent via-white/5 to-transparent'
            : 'from-transparent via-white/50 to-transparent'
        }`}
        animate={{
          translateX: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

export function DreamDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="載入夢境詳情中">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-3/4" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>

      <div className="space-y-2.5 pt-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>

      <div className="pt-4">
        <MediaFeedSkeleton />
      </div>
    </div>
  )
}

export function MediaFeedSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="載入媒體中">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="overflow-hidden rounded-lg bg-gray-100 aspect-square flex items-center justify-center relative">
        <Skeleton className="w-full h-full" />
      </div>
    </div>
  )
}

export function CommentListSkeleton() {
  return (
    <div className="space-y-4 py-2" role="status" aria-label="載入留言中">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-start gap-2.5">
          <Skeleton className="w-7 h-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SearchListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="搜尋夢境中">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-b border-gray-100 pb-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div className="h-screen w-screen bg-black flex flex-col justify-between p-8 relative overflow-hidden" role="status" aria-label="載入探索牆中">
      <div className="flex items-center justify-between z-10">
        <Skeleton variant="dark" className="h-5 w-20" />
        <Skeleton variant="dark" className="h-7 w-7 rounded-full" />
      </div>

      <div className="max-w-md w-full space-y-4 z-10 pb-12">
        <div className="flex items-center gap-3">
          <Skeleton variant="dark" className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton variant="dark" className="h-3.5 w-24" />
            <Skeleton variant="dark" className="h-2.5 w-16" />
          </div>
        </div>
        <Skeleton variant="dark" className="h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton variant="dark" className="h-3.5 w-full" />
          <Skeleton variant="dark" className="h-3.5 w-5/6" />
        </div>
      </div>
    </div>
  )
}

export function ProfileStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" role="status" aria-label="載入統計中">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 bg-gray-50 rounded space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  )
}
