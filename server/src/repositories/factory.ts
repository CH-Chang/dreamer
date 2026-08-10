import type { IUserRepository } from '../../../shared/interfaces/IUserRepository'
import type { IDreamRepository } from '../../../shared/interfaces/IDreamRepository'
import type { IVideoRepository } from '../../../shared/interfaces/IVideoRepository'
import type { ICategoryRepository } from '../../../shared/interfaces/ICategoryRepository'
import type { IComicRepository } from '../../../shared/interfaces/IComicRepository'
import type { IRateLimitRepository } from '../../../shared/interfaces/IRateLimitRepository'
import type { ICommentRepository } from '../../../shared/interfaces/ICommentRepository'
import type { IEditLogRepository } from '../../../shared/interfaces/IEditLogRepository'
import { UserRepository } from './sheets/UserRepository'
import { DreamRepository } from './sheets/DreamRepository'
import { VideoRepository } from './sheets/VideoRepository'
import { CategoryRepository } from './sheets/CategoryRepository'
import { ComicRepository } from './sheets/ComicRepository'
import { RateLimitRepository } from './sheets/RateLimitRepository'
import { CommentRepository } from './sheets/CommentRepository'
import { EditLogRepository } from './sheets/EditLogRepository'

let userRepo: IUserRepository | null = null
let dreamRepo: IDreamRepository | null = null
let videoRepo: IVideoRepository | null = null
let categoryRepo: ICategoryRepository | null = null
let comicRepo: IComicRepository | null = null
let rateLimitRepo: IRateLimitRepository | null = null
let commentRepo: ICommentRepository | null = null
let editLogRepo: IEditLogRepository | null = null

export function getUserRepository(): IUserRepository {
  if (!userRepo) userRepo = new UserRepository()
  return userRepo
}

export function getDreamRepository(): IDreamRepository {
  if (!dreamRepo) dreamRepo = new DreamRepository()
  return dreamRepo
}

export function getVideoRepository(): IVideoRepository {
  if (!videoRepo) videoRepo = new VideoRepository()
  return videoRepo
}

export function getCategoryRepository(): ICategoryRepository {
  if (!categoryRepo) categoryRepo = new CategoryRepository()
  return categoryRepo
}

export function getComicRepository(): IComicRepository {
  if (!comicRepo) comicRepo = new ComicRepository()
  return comicRepo
}

export function getRateLimitRepository(): IRateLimitRepository {
  if (!rateLimitRepo) rateLimitRepo = new RateLimitRepository()
  return rateLimitRepo
}

export function getCommentRepository(): ICommentRepository {
  if (!commentRepo) commentRepo = new CommentRepository()
  return commentRepo
}

export function getEditLogRepository(): IEditLogRepository {
  if (!editLogRepo) editLogRepo = new EditLogRepository()
  return editLogRepo
}

export function setDreamRepository(repo: IDreamRepository | null) {
  dreamRepo = repo
}

export function setUserRepository(repo: IUserRepository | null) {
  userRepo = repo
}

export function setCommentRepository(repo: ICommentRepository | null) {
  commentRepo = repo
}

export function setRateLimitRepository(repo: IRateLimitRepository | null) {
  rateLimitRepo = repo
}

export function setVideoRepository(repo: IVideoRepository | null) {
  videoRepo = repo
}

export function setComicRepository(repo: IComicRepository | null) {
  comicRepo = repo
}

