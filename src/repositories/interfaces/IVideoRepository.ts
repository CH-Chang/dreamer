import type { Video, VideoStatus } from '../../types/video'

export interface IVideoRepository {
  findByDreamId(dreamId: string): Promise<Video | null>
  findAllByDreamId(dreamId: string): Promise<Video[]>
  create(video: { dream_id: string; email: string }): Promise<Video>
  updateStatus(id: string, status: VideoStatus, videoUrl?: string): Promise<Video>
}
