import type { User } from '../types/user'
import { getDreamRepository, getVideoRepository, getComicRepository, getUserRepository } from '../repositories/factory'

export interface FeedItem {
  id: string
  type: 'video' | 'comic'
  mediaUrl: string
  dream: {
    id: string
    title?: string
    description: string
    created_at: string
    email: string
  }
  author: {
    name: string
    avatar_url?: string
  }
}

export interface FeedPage {
  items: FeedItem[]
  nextCursor?: string
}

export class FeedService {
  async findPublicPage(cursor?: string, limit = 10): Promise<FeedPage> {
    const dreamRepo = getDreamRepository()
    const videoRepo = getVideoRepository()
    const comicRepo = getComicRepository()
    const userRepo = getUserRepository()

    const { items: dreams, nextCursor } = await dreamRepo.findPublicPage(cursor, limit)
    if (dreams.length === 0) return { items: [], nextCursor }

    const feedItems: FeedItem[] = []
    const userCache = new Map<string, User>()

    for (const dream of dreams) {
      const [videos, comics] = await Promise.all([
        videoRepo.findAllByDreamId(dream.id),
        comicRepo.findAllByDreamId(dream.id),
      ])

      const doneVideos = videos.filter(v => v.status === 'done')
      const doneComics = comics.filter(c => c.status === 'done')
      if (doneVideos.length === 0 && doneComics.length === 0) continue

      let author = userCache.get(dream.email)
      if (!author) {
        author = await userRepo.findByEmail(dream.email) ?? undefined
        if (author) userCache.set(dream.email, author)
      }

      const authorInfo = { name: author?.name ?? dream.email, avatar_url: author?.avatar_url }

      for (const v of doneVideos) {
        feedItems.push({
          id: `video-${v.id}`,
          type: 'video',
          mediaUrl: v.video_url!,
          dream: { id: dream.id, title: dream.title, description: dream.description, created_at: dream.created_at, email: dream.email },
          author: authorInfo,
        })
      }
      for (const c of doneComics) {
        feedItems.push({
          id: `comic-${c.id}`,
          type: 'comic',
          mediaUrl: c.image_url!,
          dream: { id: dream.id, title: dream.title, description: dream.description, created_at: dream.created_at, email: dream.email },
          author: authorInfo,
        })
      }
    }

    return { items: feedItems, nextCursor }
  }
}
