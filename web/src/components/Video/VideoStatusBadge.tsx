import type { VideoStatus } from '../../types/video'

const labels: Record<VideoStatus, string> = {
  pending: '待生成',
  generating: '生成中...',
  done: '已完成',
  failed: '失敗',
}

interface Props {
  status: VideoStatus
}

export function VideoStatusBadge({ status }: Props) {
  return (
    <span className="inline-block text-[10px] tracking-wider text-gray-400">
      {labels[status]}
    </span>
  )
}
